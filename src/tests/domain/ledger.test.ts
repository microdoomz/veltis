import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../lib/db';
import { user, workspace, financialAccount, accountState, heldForOther, investmentPosition, liability, receivable } from '../../lib/db/schema';
import { createExpense, createIncome, createTransfer, createCreditCardPurchase, softDeleteTransaction } from '../../lib/services/transaction';
import { getAccountLedgerBalance, getAvailableMoney, getNetWealth } from '../../lib/ledger';
import { randomUUID } from 'crypto';

describe('Ledger Service Calculations', () => {
  let testUserId: string;
  let wsId: string;
  let bankId: string;
  let walletId: string;
  let ccId: string;
  let expenseTxId: string;

  beforeAll(async () => {
    // 1. Setup Isolated Environment
    const [newUser] = await db.insert(user).values({
      id: randomUUID(),
      name: 'Ledger Test User',
      email: `ledger-${randomUUID()}@example.com`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Ledger Workspace',
      baseCurrency: 'USD',
      createdByUserId: testUserId,
    }).returning();
    wsId = newWs.id;

    // 2. Setup Accounts with Initial Balances
    const [bank] = await db.insert(financialAccount).values({
      workspaceId: wsId,
      name: 'Main Bank',
      accountType: 'bank',
      currency: 'USD',
      openingBalanceMinor: 500000n, // $5,000.00
      openingBalanceDate: new Date().toISOString(),
      status: 'active'
    }).returning();
    bankId = bank.id;

    const [wallet] = await db.insert(financialAccount).values({
      workspaceId: wsId,
      name: 'Wallet',
      accountType: 'cash_wallet',
      currency: 'USD',
      openingBalanceMinor: 20000n, // $200.00
      openingBalanceDate: new Date().toISOString(),
      status: 'active'
    }).returning();
    walletId = wallet.id;

    const [cc] = await db.insert(financialAccount).values({
      workspaceId: wsId,
      name: 'Credit Card',
      accountType: 'credit_card',
      currency: 'USD',
      openingBalanceMinor: -50000n, // $-500.00 debt
      openingBalanceDate: new Date().toISOString(),
      status: 'active'
    }).returning();
    ccId = cc.id;

    // 3. Populate initial transactions
    const exp = await createExpense({
      workspaceId: wsId, createdByUserId: testUserId,
      accountId: bankId, amountMinor: 10000n, currency: 'USD', // $100
      transactionDate: new Date()
    });
    expenseTxId = exp.id;

    await createIncome({
      workspaceId: wsId, createdByUserId: testUserId,
      accountId: walletId, amountMinor: 5000n, currency: 'USD', // $50
      transactionDate: new Date()
    });

    await createTransfer({
      workspaceId: wsId, createdByUserId: testUserId,
      sourceAccountId: bankId, destAccountId: walletId,
      amountMinor: 20000n, currency: 'USD', // $200
      transactionDate: new Date()
    });

    await createCreditCardPurchase({
      workspaceId: wsId, createdByUserId: testUserId,
      creditCardAccountId: ccId, amountMinor: 5000n, currency: 'USD', // $50
      transactionDate: new Date()
    });

    // 4. Set Liens & Held for Other
    await db.insert(accountState).values({
      financialAccountId: bankId,
      lienAmountMinor: 15000n // $150
    });

    await db.insert(heldForOther).values({
      workspaceId: wsId,
      accountId: bankId,
      counterpartyName: 'Alice',
      amountMinor: 5000n, // $50
      currency: 'USD',
      status: 'open'
    });

    // 5. Add Investment & Receivables & Custom Liabilities
    const [invAcc] = await db.insert(financialAccount).values({
      workspaceId: wsId, name: 'Brokerage', accountType: 'investment', currency: 'USD',
      openingBalanceMinor: 0n, openingBalanceDate: new Date().toISOString(), status: 'active'
    }).returning();
    await db.insert(investmentPosition).values({
      workspaceId: wsId, financialAccountId: invAcc.id, name: 'AAPL',
      assetType: 'equity', units: '10.5', averageCostMinor: 15000n, currency: 'USD' // ~ $1,575.00
    });

    await db.insert(receivable).values({
      workspaceId: wsId, counterpartyName: 'Bob', amountMinor: 10000n, currency: 'USD', // $100
      createdDate: new Date().toISOString(), status: 'open'
    });

    await db.insert(liability).values({
      workspaceId: wsId, counterpartyName: 'Charlie', liabilityType: 'person', 
      amountMinor: 20000n, currency: 'USD', // $200
      createdDate: new Date().toISOString(), status: 'open'
    });
  });

  it('calculates correct Ledger Balances', async () => {
    // Bank Ledger = 5000 (opening) - 100 (expense) - 200 (transfer) = 4700 ($4,700.00)
    const bankBalance = await getAccountLedgerBalance(bankId);
    expect(bankBalance).toBe(470000n);

    // Wallet Ledger = 200 (opening) + 50 (income) + 200 (transfer) = 450 ($450.00)
    const walletBalance = await getAccountLedgerBalance(walletId);
    expect(walletBalance).toBe(45000n);

    // CC Ledger = -500 (opening) - 50 (expense) = -550 ($-550.00)
    const ccBalance = await getAccountLedgerBalance(ccId);
    expect(ccBalance).toBe(-55000n);
  });

  it('calculates correct Available Money', async () => {
    // Liquid Assets = Bank (4700) + Wallet (450) = 5150
    // Active Liens = 150
    // Held For Other = 50
    // Available = 5150 - 150 - 50 = 4950
    const available = await getAvailableMoney(wsId);
    expect(available).toBe(495000n);
  });

  it('calculates correct Net Wealth', async () => {
    // Asset Accounts = 4700 + 450 = 5150
    // Investment = 10.5 * 150 = 1575
    // Receivables = 100
    // Liability Accounts (CC) = -550
    // Custom Liabilities = -200
    // Net Wealth = 5150 + 1575 + 100 - 550 - 200 = 6075
    const netWealth = await getNetWealth(wsId);
    expect(netWealth).toBe(607500n);
  });

  it('ignores soft-deleted transactions in balances', async () => {
    // Delete the $100 expense
    await softDeleteTransaction(expenseTxId);

    // Bank Ledger = 5000 - 200 (transfer) = 4800
    const bankBalance = await getAccountLedgerBalance(bankId);
    expect(bankBalance).toBe(480000n);

    // Available = 4800 + 450 - 150 - 50 = 5050
    const available = await getAvailableMoney(wsId);
    expect(available).toBe(505000n);
  });
});
