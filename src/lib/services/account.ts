import { db } from '../db';
import { financialAccount, accountState, workspace, allocation, investmentPosition, recurringItem, investmentPriceSnapshot } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { NotFoundError, ValidationError } from './errors';
import { createRecurringItem } from './recurring';

export const createAccountSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1, 'Account name is required'),
  accountType: z.enum(['bank', 'cash_wallet', 'digital_wallet', 'investment', 'credit_card']),
  institutionName: z.string().optional().nullable(),
  currency: z.string().length(3),
  color: z.string().optional().nullable(),
  iconKey: z.string().optional().nullable(),
  openingBalanceMinor: z.bigint().default(0n),
  openingBalanceDate: z.date().default(() => new Date()),
});

export async function createAccount(data: z.infer<typeof createAccountSchema>) {
  // Verify workspace exists
  const ws = await db.query.workspace.findFirst({
    where: eq(workspace.id, data.workspaceId),
  });
  if (!ws) {
    throw new NotFoundError('Workspace not found');
  }

  return await db.transaction(async (tx) => {
    const existingAccounts = await tx.query.financialAccount.findMany({
      where: eq(financialAccount.workspaceId, data.workspaceId),
      orderBy: (acc, { desc }) => [desc(acc.displayOrder)],
      limit: 1,
    });
    const nextOrder = existingAccounts.length > 0 ? (existingAccounts[0].displayOrder ?? 0) + 1 : 0;

    const [newAccount] = await tx.insert(financialAccount).values({
      workspaceId: data.workspaceId,
      name: data.name,
      accountType: data.accountType,
      institutionName: data.institutionName || null,
      currency: data.currency.toUpperCase(),
      color: data.color || null,
      iconKey: data.iconKey || null,
      displayOrder: nextOrder,
      openingBalanceMinor: data.openingBalanceMinor,
      openingBalanceDate: data.openingBalanceDate.toISOString().split('T')[0],
      status: 'active',
    }).returning();

    await tx.insert(accountState).values({
      financialAccountId: newAccount.id,
      lienAmountMinor: 0n,
    });

    return newAccount;
  });
}

export async function getAccounts(workspaceId: string) {
  return await db.query.financialAccount.findMany({
    where: and(
      eq(financialAccount.workspaceId, workspaceId),
      eq(financialAccount.status, 'active')
    ),
    orderBy: (acc, { asc }) => [asc(acc.displayOrder), asc(acc.createdAt)],
  });
}

export async function reorderAccounts(workspaceId: string, accountIds: string[]) {
  return await db.transaction(async (tx) => {
    for (let index = 0; index < accountIds.length; index++) {
      const id = accountIds[index];
      await tx.update(financialAccount)
        .set({ displayOrder: index, updatedAt: new Date() })
        .where(and(eq(financialAccount.id, id), eq(financialAccount.workspaceId, workspaceId)));
    }
  });
}

export async function getAccountById(workspaceId: string, accountId: string) {
  const acc = await db.query.financialAccount.findFirst({
    where: and(
      eq(financialAccount.id, accountId),
      eq(financialAccount.workspaceId, workspaceId)
    ),
  });

  if (!acc) {
    throw new NotFoundError('Account not found');
  }

  return acc;
}

export const updateAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').optional(),
  accountType: z.enum(['bank', 'cash_wallet', 'digital_wallet', 'investment', 'credit_card']).optional(),
  institutionName: z.string().optional().nullable(),
  currency: z.string().length(3).optional(),
  color: z.string().optional().nullable(),
  iconKey: z.string().optional().nullable(),
  sipMonthlyAmount: z.coerce.number().optional().nullable(),
  sipMonthlyDay: z.coerce.number().min(1).max(31).optional().nullable(),
  units: z.union([z.string(), z.number()]).optional().nullable(),
  symbol: z.string().optional().nullable(),
  currentPrice: z.union([z.string(), z.number()]).optional().nullable(),
});

export async function updateAccount(
  workspaceId: string,
  accountId: string,
  data: z.infer<typeof updateAccountSchema>
) {
  const existing = await getAccountById(workspaceId, accountId);
  if (!existing) {
    throw new NotFoundError('Account not found');
  }

  const updateFields: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateFields.name = data.name.trim();
  if (data.accountType !== undefined) updateFields.accountType = data.accountType;
  if (data.institutionName !== undefined) updateFields.institutionName = data.institutionName?.trim() || null;
  if (data.currency !== undefined) updateFields.currency = data.currency.trim().toUpperCase();
  if (data.color !== undefined) updateFields.color = data.color;
  if (data.iconKey !== undefined) updateFields.iconKey = data.iconKey;

  const [updated] = await db.update(financialAccount)
    .set(updateFields)
    .where(and(
      eq(financialAccount.id, accountId),
      eq(financialAccount.workspaceId, workspaceId)
    ))
    .returning();

  // If position attributes (units, symbol, currentPrice) are specified for an investment account, update linked investment position
  if (data.units !== undefined || data.symbol !== undefined || data.currentPrice !== undefined) {
    const pos = await db.query.investmentPosition.findFirst({
      where: and(
        eq(investmentPosition.financialAccountId, accountId),
        eq(investmentPosition.workspaceId, workspaceId)
      ),
    });

    if (pos) {
      const posUpdates: Record<string, unknown> = { updatedAt: new Date() };
      if (data.name) posUpdates.name = data.name.trim();
      if (data.units !== undefined && data.units !== null) posUpdates.units = data.units.toString();
      if (data.symbol !== undefined) posUpdates.symbol = data.symbol?.trim() || null;

      await db.update(investmentPosition)
        .set(posUpdates)
        .where(eq(investmentPosition.id, pos.id));

      if (data.currentPrice !== undefined && data.currentPrice !== null && !isNaN(Number(data.currentPrice))) {
        await db.insert(investmentPriceSnapshot).values({
          positionId: pos.id,
          provider: 'manual_override',
          symbol: (data.symbol || pos.symbol) ?? null,
          priceMinor: BigInt(Math.round(Number(data.currentPrice) * 100)),
          currency: updated.currency,
          observedAt: new Date(),
          isEstimated: false,
        });
      }
    }
  }

  // Handle SIP monthly updates if specified
  if (data.sipMonthlyAmount !== undefined) {
    const existingRecurring = await db.query.recurringItem.findFirst({
      where: and(
        eq(recurringItem.defaultAccountId, accountId),
        eq(recurringItem.workspaceId, workspaceId)
      ),
    });

    const customDay = data.sipMonthlyDay ? Math.min(31, Math.max(1, data.sipMonthlyDay)) : 1;

    if (data.sipMonthlyAmount && data.sipMonthlyAmount > 0) {
      const amountMinor = BigInt(Math.round(data.sipMonthlyAmount * 100));
      if (existingRecurring) {
        await db.update(recurringItem)
          .set({
            name: `SIP - ${updated.name}`,
            expectedAmountMinor: amountMinor,
            dayRule: 'custom_day',
            customDay,
            active: true,
            updatedAt: new Date(),
          })
          .where(eq(recurringItem.id, existingRecurring.id));
      } else {
        await createRecurringItem({
          workspaceId,
          type: 'expense',
          name: `SIP - ${updated.name}`,
          expectedAmountMinor: amountMinor,
          currency: updated.currency,
          defaultAccountId: accountId,
          frequency: 'monthly',
          dayRule: 'custom_day',
          customDay,
        });
      }
    } else if (existingRecurring) {
      // Amount is 0 or null, deactivate recurring item
      await db.update(recurringItem)
        .set({
          active: false,
          updatedAt: new Date(),
        })
        .where(eq(recurringItem.id, existingRecurring.id));
    }
  }

  return updated;
}

export async function deleteAccount(workspaceId: string, accountId: string) {
  const existing = await getAccountById(workspaceId, accountId);
  if (!existing) {
    throw new NotFoundError('Account not found');
  }

  // Soft-delete account by marking archived & recording deletedAt
  const [archived] = await db.update(financialAccount)
    .set({
      status: 'archived',
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq(financialAccount.id, accountId),
      eq(financialAccount.workspaceId, workspaceId)
    ))
    .returning();

  // Archive any active allocations linked to this account so their balances are cleared from Available Balance
  await db.update(allocation)
    .set({
      status: 'archived',
      updatedAt: new Date(),
    })
    .where(and(
      eq(allocation.financialAccountId, accountId),
      eq(allocation.workspaceId, workspaceId),
      eq(allocation.status, 'active')
    ));

  // Delete any investment positions linked to this account so portfolio value and Net Wealth are completely cleared
  await db.delete(investmentPosition)
    .where(eq(investmentPosition.financialAccountId, accountId));

  return archived;
}
