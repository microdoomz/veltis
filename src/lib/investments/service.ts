import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import {
  transaction,
  transactionLeg,
  investmentPosition,
  investmentTransaction,
  investmentPriceSnapshot,
  financialAccount,
} from '../db/schema';
import { NotFoundError, ValidationError } from '../services/errors';
import { money } from '../money';
import { marketProvider } from './provider';

/**
 * Ensures the account exists and is an investment account.
 */
async function validateInvestmentAccount(workspaceId: string, accountId: string) {
  const account = await db.query.financialAccount.findFirst({
    where: and(eq(financialAccount.id, accountId), eq(financialAccount.workspaceId, workspaceId)),
  });

  if (!account) throw new NotFoundError('Account not found');
  if (account.accountType !== 'investment') throw new ValidationError('Account is not an investment account');

  return account;
}

/**
 * Record a contribution to an investment account (transfers cash into it).
 */
export async function recordContribution(
  workspaceId: string,
  sourceAccountId: string,
  investmentAccountId: string,
  amountMinor: bigint,
  currency: string,
  transactionDate: Date,
  userId: string
) {
  if (amountMinor <= 0n) throw new ValidationError('Amount must be positive');
  
  await validateInvestmentAccount(workspaceId, investmentAccountId);

  return await db.transaction(async (tx) => {
    // Create the main transaction
    const [txRecord] = await tx.insert(transaction).values({
      workspaceId,
      transactionType: 'investment_contribution',
      status: 'active',
      amountMinor,
      currency,
      transactionDate: transactionDate.toISOString().split('T')[0],
      source: 'web',
      createdByUserId: userId,
      description: 'Investment Contribution',
    }).returning();

    // Leg 1: Credit source account (reduce bank balance)
    await tx.insert(transactionLeg).values({
      transactionId: txRecord.id,
      accountId: sourceAccountId,
      direction: 'credit',
      amountMinor,
      currency,
      legRole: 'source',
    });

    // Leg 2: Debit investment account (increase cash balance)
    await tx.insert(transactionLeg).values({
      transactionId: txRecord.id,
      accountId: investmentAccountId,
      direction: 'debit',
      amountMinor,
      currency,
      legRole: 'destination',
    });

    return txRecord.id;
  });
}

/**
 * Record a withdrawal from an investment account (transfers cash out of it).
 */
export async function recordWithdrawal(
  workspaceId: string,
  investmentAccountId: string,
  destinationAccountId: string,
  amountMinor: bigint,
  currency: string,
  transactionDate: Date,
  userId: string
) {
  if (amountMinor <= 0n) throw new ValidationError('Amount must be positive');

  await validateInvestmentAccount(workspaceId, investmentAccountId);

  return await db.transaction(async (tx) => {
    const [txRecord] = await tx.insert(transaction).values({
      workspaceId,
      transactionType: 'investment_withdrawal',
      status: 'active',
      amountMinor,
      currency,
      transactionDate: transactionDate.toISOString().split('T')[0],
      source: 'web',
      createdByUserId: userId,
      description: 'Investment Withdrawal',
    }).returning();

    // Leg 1: Credit investment account (reduce cash balance)
    await tx.insert(transactionLeg).values({
      transactionId: txRecord.id,
      accountId: investmentAccountId,
      direction: 'credit',
      amountMinor,
      currency,
      legRole: 'source',
    });

    // Leg 2: Debit destination account (increase bank balance)
    await tx.insert(transactionLeg).values({
      transactionId: txRecord.id,
      accountId: destinationAccountId,
      direction: 'debit',
      amountMinor,
      currency,
      legRole: 'destination',
    });

    return txRecord.id;
  });
}

/**
 * Buy an asset. Reduces investment account cash and increases position units.
 */
export async function buyPosition(
  workspaceId: string,
  investmentAccountId: string,
  positionId: string,
  unitsStr: string,
  priceMinor: bigint,
  currency: string,
  transactionDate: Date,
  userId: string
) {
  const units = Number(unitsStr);
  if (units <= 0) throw new ValidationError('Units must be positive');
  if (priceMinor <= 0n) throw new ValidationError('Price must be positive');

  await validateInvestmentAccount(workspaceId, investmentAccountId);

  return await db.transaction(async (tx) => {
    // Total amount
    const amountMinor = money.multiply(priceMinor, units);

    // 1. Create the main transaction (adjustment type since it's internal to the investment account)
    const [txRecord] = await tx.insert(transaction).values({
      workspaceId,
      transactionType: 'adjustment',
      status: 'active',
      amountMinor,
      currency,
      transactionDate: transactionDate.toISOString().split('T')[0],
      source: 'web',
      createdByUserId: userId,
      description: 'Buy Asset',
    }).returning();

    // 2. Reduce cash from the investment account
    await tx.insert(transactionLeg).values({
      transactionId: txRecord.id,
      accountId: investmentAccountId,
      direction: 'credit', // Credit reduces the asset (cash) balance
      amountMinor,
      currency,
      legRole: 'investment_buy',
    });

    // 3. Create investmentTransaction
    await tx.insert(investmentTransaction).values({
      workspaceId,
      positionId,
      transactionId: txRecord.id,
      transactionType: 'buy',
      units: units.toString(),
      priceMinor,
      amountMinor,
      currency,
      transactionDate: transactionDate.toISOString().split('T')[0],
    });

    // 4. Update the position (calculate new average cost and total units)
    const pos = await tx.query.investmentPosition.findFirst({
      where: eq(investmentPosition.id, positionId),
    });

    if (!pos) throw new NotFoundError('Position not found');

    const currentUnits = Number(pos.units || '0');
    const currentAvgCost = pos.averageCostMinor || 0n;

    const newUnits = currentUnits + units;
    
    // Average cost = (current units * current avg cost) + (new units * new price) / total units
    const currentTotalValue = money.multiply(currentAvgCost, currentUnits);
    const newTotalValue = currentTotalValue + amountMinor;
    // We convert newTotalValue to major float, divide by newUnits, then back to minor
    const newAvgCostMajor = money.toMajor(newTotalValue) / newUnits;
    const newAvgCostMinor = money.fromMajor(newAvgCostMajor);

    await tx.update(investmentPosition)
      .set({
        units: newUnits.toString(),
        averageCostMinor: newAvgCostMinor,
        updatedAt: new Date(),
      })
      .where(eq(investmentPosition.id, positionId));

    return txRecord.id;
  });
}

/**
 * Sell an asset. Increases investment account cash and decreases position units.
 */
export async function sellPosition(
  workspaceId: string,
  investmentAccountId: string,
  positionId: string,
  unitsStr: string,
  priceMinor: bigint,
  currency: string,
  transactionDate: Date,
  userId: string
) {
  const units = Number(unitsStr);
  if (units <= 0) throw new ValidationError('Units must be positive');
  if (priceMinor <= 0n) throw new ValidationError('Price must be positive');

  await validateInvestmentAccount(workspaceId, investmentAccountId);

  return await db.transaction(async (tx) => {
    const pos = await tx.query.investmentPosition.findFirst({
      where: eq(investmentPosition.id, positionId),
    });

    if (!pos) throw new NotFoundError('Position not found');
    
    const currentUnits = Number(pos.units || '0');
    if (currentUnits < units) throw new ValidationError('Not enough units to sell');

    const amountMinor = money.multiply(priceMinor, units);

    // 1. Create the main transaction
    const [txRecord] = await tx.insert(transaction).values({
      workspaceId,
      transactionType: 'adjustment',
      status: 'active',
      amountMinor,
      currency,
      transactionDate: transactionDate.toISOString().split('T')[0],
      source: 'web',
      createdByUserId: userId,
      description: 'Sell Asset',
    }).returning();

    // 2. Increase cash in the investment account
    await tx.insert(transactionLeg).values({
      transactionId: txRecord.id,
      accountId: investmentAccountId,
      direction: 'debit', // Debit increases the asset (cash) balance
      amountMinor,
      currency,
      legRole: 'investment_sell',
    });

    // 3. Create investmentTransaction
    await tx.insert(investmentTransaction).values({
      workspaceId,
      positionId,
      transactionId: txRecord.id,
      transactionType: 'sell',
      units: units.toString(),
      priceMinor,
      amountMinor,
      currency,
      transactionDate: transactionDate.toISOString().split('T')[0],
    });

    // 4. Update position units (average cost does not change on sell)
    const newUnits = currentUnits - units;
    
    await tx.update(investmentPosition)
      .set({
        units: newUnits.toString(),
        updatedAt: new Date(),
      })
      .where(eq(investmentPosition.id, positionId));

    return txRecord.id;
  });
}

/**
 * Fetch and record the latest market price for a position.
 */
export async function updateMarketPrice(workspaceId: string, positionId: string, manualPriceMinor?: bigint, manualCurrency?: string) {
  const pos = await db.query.investmentPosition.findFirst({
    where: and(eq(investmentPosition.id, positionId), eq(investmentPosition.workspaceId, workspaceId)),
  });

  if (!pos) throw new NotFoundError('Position not found');

  let priceMinor = manualPriceMinor;
  let currency = manualCurrency || pos.currency;
  let provider = 'manual';

  if (!priceMinor && pos.symbol) {
    // Try to fetch automatically
    const result = await marketProvider.fetchPrice(pos.symbol);
    if (result) {
      priceMinor = result.priceMinor;
      currency = result.currency;
      provider = marketProvider.getProviderName();
    }
  }

  if (priceMinor !== undefined) {
    await db.insert(investmentPriceSnapshot).values({
      positionId,
      provider,
      symbol: pos.symbol,
      priceMinor,
      currency,
      observedAt: new Date(),
      isEstimated: true,
    });
  }
}

/**
 * One-time investment top-up for an existing fund position.
 * Can be funded from a linked bank account or directly recorded.
 */
export async function topUpPosition(
  workspaceId: string,
  positionId: string,
  amountMinor: bigint,
  priceMinor: bigint,
  currency: string,
  transactionDate: Date,
  userId: string,
  sourceBankAccountId?: string
) {
  if (amountMinor <= 0n) throw new ValidationError('Amount must be positive');
  if (priceMinor <= 0n) throw new ValidationError('Price must be positive');

  return await db.transaction(async (tx) => {
    const pos = await tx.query.investmentPosition.findFirst({
      where: and(
        eq(investmentPosition.id, positionId),
        eq(investmentPosition.workspaceId, workspaceId)
      ),
    });

    if (!pos) throw new NotFoundError('Investment position not found');

    const calculatedUnits = Number(amountMinor) / Number(priceMinor);
    const unitsStr = calculatedUnits.toFixed(4);
    const unitsNum = Number(unitsStr);

    // 1. Create investment purchase transaction
    const [txRecord] = await tx.insert(transaction).values({
      workspaceId,
      transactionType: 'investment_contribution',
      status: 'active',
      amountMinor,
      currency,
      transactionDate: transactionDate.toISOString().split('T')[0],
      source: 'web',
      createdByUserId: userId,
      description: `One-Time Top-Up: ${pos.name}`,
    }).returning();

    // If a source bank account was specified, deduct cash from it
    if (sourceBankAccountId) {
      await tx.insert(transactionLeg).values({
        transactionId: txRecord.id,
        accountId: sourceBankAccountId,
        direction: 'credit', // Credit reduces bank balance
        amountMinor,
        currency,
        legRole: 'source',
      });
      await tx.insert(transactionLeg).values({
        transactionId: txRecord.id,
        accountId: pos.financialAccountId,
        direction: 'debit', // Debit increases investment account
        amountMinor,
        currency,
        legRole: 'destination',
      });
    }

    // 2. Insert investmentTransaction
    await tx.insert(investmentTransaction).values({
      workspaceId,
      positionId,
      transactionId: txRecord.id,
      transactionType: 'buy',
      units: unitsStr,
      priceMinor,
      amountMinor,
      currency,
      transactionDate: transactionDate.toISOString().split('T')[0],
    });

    // 3. Update position units and average cost
    const currentUnits = Number(pos.units || '0');
    const currentAvgCost = pos.averageCostMinor || priceMinor;
    const newUnits = currentUnits + unitsNum;

    const currentTotalVal = money.multiply(currentAvgCost, currentUnits);
    const newTotalVal = currentTotalVal + amountMinor;
    const newAvgCostMajor = money.toMajor(newTotalVal) / (newUnits > 0 ? newUnits : 1);
    const newAvgCostMinor = money.fromMajor(newAvgCostMajor);

    await tx.update(investmentPosition).set({
      units: newUnits.toFixed(4),
      averageCostMinor: newAvgCostMinor,
      updatedAt: new Date(),
    }).where(eq(investmentPosition.id, positionId));

    return txRecord.id;
  });
}

