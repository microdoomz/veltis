import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { user, workspace, financialAccount } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { reconcileAccount } from '@/lib/services/reconciliation';

describe('Reconciliation Service', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let testAccountId: string;

  beforeAll(async () => {
    const [u] = await db.insert(user).values({
      id: randomUUID(), name: 'Recon Test', email: `recon-${randomUUID()}@test.com`, createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    testUserId = u.id;

    const [w] = await db.insert(workspace).values({
      name: 'Recon Workspace', baseCurrency: 'USD', createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = w.id;

    const [a] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId, name: 'Bank', accountType: 'bank', currency: 'USD', openingBalanceMinor: 100000n, // $1000.00
      openingBalanceDate: new Date().toISOString(), status: 'active'
    }).returning();
    testAccountId = a.id;
  });

  it('reconciles an account with no difference', async () => {
    const record = await reconcileAccount({
      workspaceId: testWorkspaceId,
      accountId: testAccountId,
      userId: testUserId,
      actualBalanceMinor: 100000n, // Matches ledger opening balance
      createAdjustment: true
    });

    expect(record).toBeDefined();
    expect(record.differenceMinor).toBe(0n);
    expect(record.adjustmentTransactionId).toBeNull();
  });

  it('reconciles an account and creates an adjustment transaction when difference exists', async () => {
    const record = await reconcileAccount({
      workspaceId: testWorkspaceId,
      accountId: testAccountId,
      userId: testUserId,
      actualBalanceMinor: 95000n, // Missing $50
      createAdjustment: true,
      note: 'Found a discrepancy'
    });

    expect(record).toBeDefined();
    expect(record.differenceMinor).toBe(-5000n);
    expect(record.adjustmentTransactionId).toBeDefined();
    expect(record.note).toBe('Found a discrepancy');

    // Verify account state
    const accountState = await db.query.accountState.findFirst({
      where: (state, { eq }) => eq(state.financialAccountId, testAccountId)
    });

    expect(accountState?.reconciledBalanceMinor).toBe(95000n);
  });
});
