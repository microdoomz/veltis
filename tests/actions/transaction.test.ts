import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { user, workspace, transaction as txSchema } from '@/lib/db/schema';
import { deleteTransactionAction } from '@/app/actions/transaction';
import { requireStrictWorkspaceAccess } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => {
  return {
    requireStrictWorkspaceAccess: vi.fn(),
  };
});
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('Transaction Actions', () => {
  let testWorkspaceId: string;
  let testUserId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(),
      name: 'Tx Action User',
      email: `tx-action-${Date.now()}@example.com`,
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Tx Action Workspace', 
      baseCurrency: 'USD', 
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    (requireStrictWorkspaceAccess as Mock).mockResolvedValue({ 
      workspaceId: testWorkspaceId,
      session: { user: { id: testUserId } }
    });
  });

  it('deleteTransactionAction soft-deletes a transaction', async () => {
    const [newTx] = await db.insert(txSchema).values({
      workspaceId: testWorkspaceId,
      transactionType: 'expense',
      source: 'manual',
      status: 'active',
      amountMinor: 1000n,
      currency: 'USD',
      description: 'Test Tx',
      transactionDate: '2026-01-01',
      createdByUserId: testUserId
    }).returning();

    await deleteTransactionAction(testWorkspaceId, newTx.id);

    const checkTx = await db.query.transaction.findFirst({
      where: (t, { eq }) => eq(t.id, newTx.id)
    });

    expect(checkTx).toBeDefined();
    expect(checkTx?.deletedAt).not.toBeNull();
  });
});
