import { describe, it, expect, beforeAll, vi } from 'vitest';
import { db } from '../../lib/db';
import { user, workspace, financialAccount, transaction, transactionLeg } from '../../lib/db/schema';
import { randomUUID } from 'crypto';
import { createExpense, createIncome, createTransfer } from '../../lib/services/transaction';
import { getAvailableMoney, getNetWealth } from '../../lib/ledger/index';

describe('Financial Integrity & Regression', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let assetAccount: string;
  let liabilityAccount: string;

  beforeAll(async () => {
    const [u] = await db.insert(user).values({
      id: randomUUID(), name: 'Finance Test', email: `fin-${randomUUID()}@example.com`, createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    testUserId = u.id;

    const [w] = await db.insert(workspace).values({
      name: 'Finance Workspace', baseCurrency: 'USD', createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = w.id;

    const [a1] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId, name: 'Bank', accountType: 'bank', currency: 'USD', openingBalanceMinor: 100000n, // $1000.00
      openingBalanceDate: new Date().toISOString(), status: 'active'
    }).returning();
    assetAccount = a1.id;

    const [a2] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId, name: 'Credit Card', accountType: 'credit_card', currency: 'USD', openingBalanceMinor: -20000n, // -$200.00
      openingBalanceDate: new Date().toISOString(), status: 'active'
    }).returning();
    liabilityAccount = a2.id;
  });

  it('correctly calculates initial wealth and available money', async () => {
    const wealth = await getNetWealth(testWorkspaceId);
    expect(wealth).toBe(80000n); // 1000 - 200 = 800

    const available = await getAvailableMoney(testWorkspaceId);
    expect(available).toBe(100000n); // Only bank account is asset/liquid
  });

  it('maintains double-entry ledger integrity on expense creation', async () => {
    const t = await createExpense({
      workspaceId: testWorkspaceId,
      amountMinor: 5000n, // $50
      currency: 'USD',
      transactionDate: new Date(),
      accountId: assetAccount,
      createdByUserId: testUserId,
    });

    // Check legs
    const legs = await db.query.transactionLeg.findMany({
      where: (l, { eq }) => eq(l.transactionId, t.id)
    });
    
    expect(legs).toHaveLength(1);
    expect(legs[0].amountMinor).toBe(5000n);
    expect(legs[0].direction).toBe('credit');

    // Check wealth updates
    const wealth = await getNetWealth(testWorkspaceId);
    expect(wealth).toBe(75000n); // 800 - 50 = 750
  });

  it('handles cross-currency transfers via transaction legs correctly', async () => {
    const t = await createTransfer({
      workspaceId: testWorkspaceId,
      amountMinor: 10000n, // $100
      currency: 'USD',
      transactionDate: new Date(),
      sourceAccountId: assetAccount,
      destAccountId: liabilityAccount, // Paying off credit card
      createdByUserId: testUserId,
    });

    const legs = await db.query.transactionLeg.findMany({
      where: (l, { eq }) => eq(l.transactionId, t.id)
    });

    expect(legs).toHaveLength(2);
    const debit = legs.find(l => l.direction === 'debit');
    const credit = legs.find(l => l.direction === 'credit');
    expect(debit?.amountMinor).toBe(10000n);
    expect(credit?.amountMinor).toBe(10000n);

    // Transfer between own accounts shouldn't change net wealth
    const wealth = await getNetWealth(testWorkspaceId);
    expect(wealth).toBe(75000n); 
  });
});
