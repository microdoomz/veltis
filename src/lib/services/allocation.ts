import { db } from '../db';
import { allocation, accountState, financialAccount } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface AllocationItem {
  id: string;
  workspaceId: string;
  financialAccountId: string | null;
  name: string;
  description: string | null;
  amountMinor: bigint;
  color: string | null;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all active allocations for a specific financial account.
 */
export async function getAllocationsByAccount(
  workspaceId: string,
  accountId: string
): Promise<{
  allocations: AllocationItem[];
  totalAllocatedMinor: bigint;
}> {
  const items = await db.query.allocation.findMany({
    where: and(
      eq(allocation.workspaceId, workspaceId),
      eq(allocation.financialAccountId, accountId),
      eq(allocation.status, 'active')
    ),
    orderBy: [allocation.createdAt],
  });

  const totalAllocatedMinor = items.reduce(
    (acc, item) => acc + item.amountMinor,
    0n
  );

  return {
    allocations: items,
    totalAllocatedMinor,
  };
}

/**
 * Get all active allocations across the workspace.
 */
export async function getAllocationsByWorkspace(
  workspaceId: string
): Promise<AllocationItem[]> {
  return await db.query.allocation.findMany({
    where: and(
      eq(allocation.workspaceId, workspaceId),
      eq(allocation.status, 'active')
    ),
  });
}

/**
 * Sync account_state lienAmountMinor to match total active allocations.
 */
async function syncAccountAllocatedState(
  tx: any,
  workspaceId: string,
  accountId: string
) {
  const activeAllocs = await tx.query.allocation.findMany({
    where: and(
      eq(allocation.workspaceId, workspaceId),
      eq(allocation.financialAccountId, accountId),
      eq(allocation.status, 'active')
    ),
  });

  const totalAllocated = activeAllocs.reduce(
    (acc: bigint, a: any) => acc + a.amountMinor,
    0n
  );

  // Update or insert into account_state
  await tx
    .insert(accountState)
    .values({
      financialAccountId: accountId,
      lienAmountMinor: totalAllocated,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: accountState.financialAccountId,
      set: {
        lienAmountMinor: totalAllocated,
        updatedAt: new Date(),
      },
    });

  return totalAllocated;
}

/**
 * Create a new set-aside allocation inside an account.
 */
export async function createAllocation(params: {
  workspaceId: string;
  financialAccountId: string;
  name: string;
  description?: string;
  amountMinor: bigint;
  color?: string;
}): Promise<AllocationItem> {
  if (params.amountMinor <= 0n) {
    throw new Error('Allocation amount must be greater than zero');
  }

  return await db.transaction(async (tx) => {
    // Verify account exists
    const account = await tx.query.financialAccount.findFirst({
      where: and(
        eq(financialAccount.id, params.financialAccountId),
        eq(financialAccount.workspaceId, params.workspaceId)
      ),
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const [created] = await tx
      .insert(allocation)
      .values({
        workspaceId: params.workspaceId,
        financialAccountId: params.financialAccountId,
        name: params.name.trim(),
        description: params.description?.trim() || null,
        amountMinor: params.amountMinor,
        color: params.color || account.color || '#10B981',
        status: 'active',
      })
      .returning();

    await syncAccountAllocatedState(tx, params.workspaceId, params.financialAccountId);

    return created;
  });
}

/**
 * Delete / Archive an allocation.
 */
export async function deleteAllocation(
  workspaceId: string,
  allocationId: string
): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await tx.query.allocation.findFirst({
      where: and(
        eq(allocation.id, allocationId),
        eq(allocation.workspaceId, workspaceId)
      ),
    });

    if (!existing) {
      throw new Error('Allocation not found');
    }

    await tx
      .update(allocation)
      .set({
        status: 'archived',
        updatedAt: new Date(),
      })
      .where(eq(allocation.id, allocationId));

    if (existing.financialAccountId) {
      await syncAccountAllocatedState(
        tx,
        workspaceId,
        existing.financialAccountId
      );
    }
  });
}
