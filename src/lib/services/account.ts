import { db } from '../db';
import { financialAccount, accountState, workspace, allocation, investmentPosition } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { NotFoundError, ValidationError } from './errors';

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
    const [newAccount] = await tx.insert(financialAccount).values({
      workspaceId: data.workspaceId,
      name: data.name,
      accountType: data.accountType,
      institutionName: data.institutionName || null,
      currency: data.currency.toUpperCase(),
      color: data.color || null,
      iconKey: data.iconKey || null,
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
    orderBy: (acc, { asc }) => [asc(acc.name)],
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
