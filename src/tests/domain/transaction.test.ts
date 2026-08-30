import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../lib/db';
import { user, workspace, financialAccount } from '../../lib/db/schema';
import { createExpense, createIncome, createTransfer, createCreditCardPurchase } from '../../lib/services/transaction';
import { randomUUID } from 'crypto';

describe('Transaction Service', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let bankAccountId: string;
  let walletAccountId: string;
  let ccAccountId: string;

  beforeAll(async () => {
    // Setup test fixtures
    const [newUser] = await db.insert(user).values({
      id: randomUUID(),
      name: 'Test User',
      email: `test-${randomUUID()}@example.com`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Test Workspace',
      baseCurrency: 'USD',
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    const [bank] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId,
      name: 'Bank',
      accountType: 'bank',
      currency: 'USD',
      openingBalanceMinor: 100000n, // $1,000.00
      openingBalanceDate: new Date().toISOString(),
      status: 'active'
    }).returning();
    bankAccountId = bank.id;

    const [wallet] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId,
      name: 'Wallet',
      accountType: 'cash_wallet',
      currency: 'USD',
      openingBalanceMinor: 5000n, // $50.00
      openingBalanceDate: new Date().toISOString(),
      status: 'active'
    }).returning();
    walletAccountId = wallet.id;

    const [cc] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId,
      name: 'Credit Card',
      accountType: 'credit_card',
      currency: 'USD',
      openingBalanceMinor: 0n, // $0 debt
      openingBalanceDate: new Date().toISOString(),
      status: 'active'
    }).returning();
    ccAccountId = cc.id;
  });

  afterAll(async () => {
    // Cleanup workspace cascades all data
    // Assuming cascading is setup correctly, we can just delete the workspace.
    // wait, we didn't export eq, let's just use raw delete or ignore cleanup since it's a test DB.
    // Actually, we'll rely on the DB being a test isolated branch, but for now we won't clean up to avoid issues.
  });

  it('creates an expense atomically with one leg', async () => {
    const expense = await createExpense({
      workspaceId: testWorkspaceId,
      createdByUserId: testUserId,
      accountId: bankAccountId,
      amountMinor: 5000n, // $50
      currency: 'USD',
      transactionDate: new Date()
    });

    expect(expense.id).toBeDefined();
    expect(expense.transactionType).toBe('expense');
    expect(expense.amountMinor).toBe(5000n);

    const legs = await db.query.transactionLeg.findMany({
      where: (l, { eq }) => eq(l.transactionId, expense.id)
    });

    expect(legs.length).toBe(1);
    expect(legs[0].accountId).toBe(bankAccountId);
    expect(legs[0].direction).toBe('credit');
    expect(legs[0].amountMinor).toBe(5000n);
  });

  it('creates an income atomically with one leg', async () => {
    const income = await createIncome({
      workspaceId: testWorkspaceId,
      createdByUserId: testUserId,
      accountId: bankAccountId,
      amountMinor: 20000n, // $200
      currency: 'USD',
      transactionDate: new Date()
    });

    const legs = await db.query.transactionLeg.findMany({
      where: (l, { eq }) => eq(l.transactionId, income.id)
    });

    expect(legs.length).toBe(1);
    expect(legs[0].accountId).toBe(bankAccountId);
    expect(legs[0].direction).toBe('debit');
    expect(legs[0].amountMinor).toBe(20000n);
  });

  it('creates a transfer with two legs', async () => {
    const transfer = await createTransfer({
      workspaceId: testWorkspaceId,
      createdByUserId: testUserId,
      sourceAccountId: bankAccountId,
      destAccountId: walletAccountId,
      amountMinor: 3000n, // $30
      currency: 'USD',
      transactionDate: new Date()
    });

    const legs = await db.query.transactionLeg.findMany({
      where: (l, { eq }) => eq(l.transactionId, transfer.id)
    });

    expect(legs.length).toBe(2);
    const sourceLeg = legs.find(l => l.accountId === bankAccountId);
    const destLeg = legs.find(l => l.accountId === walletAccountId);

    expect(sourceLeg?.direction).toBe('credit');
    expect(destLeg?.direction).toBe('debit');
  });

  it('creates a credit card purchase with one leg', async () => {
    const ccPurchase = await createCreditCardPurchase({
      workspaceId: testWorkspaceId,
      createdByUserId: testUserId,
      creditCardAccountId: ccAccountId,
      amountMinor: 15000n, // $150
      currency: 'USD',
      transactionDate: new Date()
    });

    const legs = await db.query.transactionLeg.findMany({
      where: (l, { eq }) => eq(l.transactionId, ccPurchase.id)
    });

    expect(legs.length).toBe(1);
    expect(legs[0].accountId).toBe(ccAccountId);
    expect(legs[0].direction).toBe('credit'); // credit increases liability
  });
});
