import { db } from '../db';
import { financialAccount, accountState, workspace } from '../db/schema';
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
