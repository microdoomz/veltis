import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { user, workspace, financialAccount } from '@/lib/db/schema';
import { createReceivable, settleReceivable } from '@/lib/services/receivables';
import { getNetWealth, getAvailableMoney } from '@/lib/ledger';
import { randomUUID } from 'crypto';

describe('Receivables Service', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let bankAccountId: string;
  let receivableId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(), 
      name: 'Receivables Test User', 
      email: `receivables-${randomUUID()}@example.com`,
      createdAt: new Date(), 
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Receivables Workspace', 
      baseCurrency: 'USD', 
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    const [bank] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId,
      name: 'Bank',
      accountType: 'bank',
      currency: 'USD',
      openingBalanceMinor: 100000n,
      openingBalanceDate: new Date().toISOString(),
      status: 'active'
    }).returning();
    bankAccountId = bank.id;
  });

  it('creates a receivable and verifies net wealth', async () => {
    const rec = await createReceivable({
      workspaceId: testWorkspaceId,
      counterpartyName: 'Alice',
      amountMinor: 20000n,
      currency: 'USD',
      createdDate: new Date('2024-01-01'),
      createdByUserId: testUserId,
      sourceAccountId: bankAccountId
    });
    
    expect(rec.id).toBeDefined();
    receivableId = rec.id;
    
    // Bank should go down by 20000, Receivable up by 20000.
    // Net wealth = Bank (100k - 20k) + Receivable (20k) = 100000
    const netWealth = await getNetWealth(testWorkspaceId);
    expect(netWealth).toBe(100000n);

    // Available money should be just Bank (80000)
    const available = await getAvailableMoney(testWorkspaceId);
    expect(available).toBe(80000n);
  });

  it('partially settles a receivable', async () => {
    await settleReceivable({
      receivableId: receivableId,
      workspaceId: testWorkspaceId,
      destAccountId: bankAccountId,
      amountMinor: 5000n,
      settledAt: new Date('2024-01-15'),
      createdByUserId: testUserId
    });

    const rec = await db.query.receivable.findFirst({
      where: (r, { eq }) => eq(r.id, receivableId)
    });
    expect(rec?.status).toBe('partially_received');

    // Bank goes up by 5000 (85000), outstanding receivable drops by 5000 (15000). Net Wealth = 100000.
    const netWealth = await getNetWealth(testWorkspaceId);
    expect(netWealth).toBe(100000n);

    const available = await getAvailableMoney(testWorkspaceId);
    expect(available).toBe(85000n);
  });

  it('fully settles a receivable', async () => {
    await settleReceivable({
      receivableId: receivableId,
      workspaceId: testWorkspaceId,
      destAccountId: bankAccountId,
      amountMinor: 15000n,
      settledAt: new Date('2024-01-20'),
      createdByUserId: testUserId
    });

    const rec = await db.query.receivable.findFirst({
      where: (r, { eq }) => eq(r.id, receivableId)
    });
    expect(rec?.status).toBe('received');

    // Bank goes up by 15000 (100000). Receivable outstanding is 0.
    const netWealth = await getNetWealth(testWorkspaceId);
    expect(netWealth).toBe(100000n);

    const available = await getAvailableMoney(testWorkspaceId);
    expect(available).toBe(100000n);
  });
});
