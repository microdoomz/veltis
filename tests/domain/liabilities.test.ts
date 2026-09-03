import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { user, workspace, financialAccount } from '@/lib/db/schema';
import { createLiability, payLiability } from '@/lib/services/liabilities';
import { getNetWealth, getAvailableMoney } from '@/lib/ledger';
import { randomUUID } from 'crypto';

describe('Liabilities Service', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let bankAccountId: string;
  let liabilityId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(), 
      name: 'Liabilities Test User', 
      email: `liabilities-${randomUUID()}@example.com`,
      createdAt: new Date(), 
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Liabilities Workspace', 
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

  it('creates a liability and verifies net wealth', async () => {
    const liab = await createLiability({
      workspaceId: testWorkspaceId,
      counterpartyName: 'Bob',
      liabilityType: 'person',
      amountMinor: 30000n,
      currency: 'USD',
      createdDate: new Date('2024-01-01'),
      createdByUserId: testUserId,
      destAccountId: bankAccountId
    });
    
    expect(liab.id).toBeDefined();
    liabilityId = liab.id;
    
    // Bank should go up by 30000, Liability up by 30000.
    // Net wealth = Bank (130k) - Liability (30k) = 100000
    const netWealth = await getNetWealth(testWorkspaceId);
    expect(netWealth).toBe(100000n);

    // Available money should be just Bank (130000)
    const available = await getAvailableMoney(testWorkspaceId);
    expect(available).toBe(130000n);
  });

  it('partially pays a liability', async () => {
    await payLiability({
      liabilityId: liabilityId,
      workspaceId: testWorkspaceId,
      sourceAccountId: bankAccountId,
      amountMinor: 10000n,
      paidAt: new Date('2024-01-15'),
      createdByUserId: testUserId
    });

    const liab = await db.query.liability.findFirst({
      where: (l, { eq }) => eq(l.id, liabilityId)
    });
    expect(liab?.status).toBe('partially_paid');

    // Bank goes down by 10000 (120000), outstanding liability drops by 10000 (20000). Net Wealth = 100000.
    const netWealth = await getNetWealth(testWorkspaceId);
    expect(netWealth).toBe(100000n);

    const available = await getAvailableMoney(testWorkspaceId);
    expect(available).toBe(120000n);
  });

  it('fully pays a liability', async () => {
    await payLiability({
      liabilityId: liabilityId,
      workspaceId: testWorkspaceId,
      sourceAccountId: bankAccountId,
      amountMinor: 20000n,
      paidAt: new Date('2024-01-20'),
      createdByUserId: testUserId
    });

    const liab = await db.query.liability.findFirst({
      where: (l, { eq }) => eq(l.id, liabilityId)
    });
    expect(liab?.status).toBe('paid');

    // Bank goes down by 20000 (100000). Liability outstanding is 0.
    const netWealth = await getNetWealth(testWorkspaceId);
    expect(netWealth).toBe(100000n);

    const available = await getAvailableMoney(testWorkspaceId);
    expect(available).toBe(100000n);
  });
});
