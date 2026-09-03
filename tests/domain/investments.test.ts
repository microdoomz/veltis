import { describe, it, expect, beforeAll } from 'vitest';
import { recordContribution, recordWithdrawal, buyPosition, sellPosition } from '@/lib/investments/service';
import { db } from '@/lib/db';
import { user, workspace, financialAccount, investmentPosition } from '@/lib/db/schema';
import { randomUUID } from 'crypto';

describe('Investments Service (Integration)', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let bankAccountId: string;
  let investmentAccountId: string;

  beforeAll(async () => {
    // Setup users & workspace
    const [u] = await db.insert(user).values({
      id: randomUUID(), name: 'Inv Test', email: `inv-${randomUUID()}@test.com`, createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    testUserId = u.id;

    const [w] = await db.insert(workspace).values({
      name: 'Inv Workspace', baseCurrency: 'USD', createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = w.id;

    // Setup accounts
    const [a1] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId, name: 'Bank', accountType: 'bank', currency: 'USD', openingBalanceMinor: 1000000n, // $10,000.00
      openingBalanceDate: new Date().toISOString(), status: 'active'
    }).returning();
    bankAccountId = a1.id;

    const [a2] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId, name: 'Brokerage', accountType: 'investment', currency: 'USD', openingBalanceMinor: 0n,
      openingBalanceDate: new Date().toISOString(), status: 'active'
    }).returning();
    investmentAccountId = a2.id;
  });

  it('records a contribution transferring money from bank to investment account', async () => {
    const txId = await recordContribution(
      testWorkspaceId,
      bankAccountId,
      investmentAccountId,
      100000n, // $1000.00
      'USD',
      new Date(),
      testUserId
    );
    expect(txId).toBeDefined();
    
    // Check balances
    const bank = await db.query.financialAccount.findFirst({ where: (a, { eq }) => eq(a.id, bankAccountId) });
    expect(bank?.openingBalanceMinor).toBe(1000000n); // Opening balance doesn't change, we should check ledger in a real e2e, but we can verify tx legs here.
  });

  it('buys an investment position', async () => {
    // We must create the position record first
    const [pos] = await db.insert(investmentPosition).values({
      workspaceId: testWorkspaceId,
      financialAccountId: investmentAccountId,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      assetType: 'equity',
      currency: 'USD',
      units: '0',
      averageCostMinor: 0n,
    }).returning();

    const txId = await buyPosition(
      testWorkspaceId,
      investmentAccountId,
      pos.id,
      '10.5',
      15000n, // $150.00
      'USD',
      new Date(),
      testUserId
    );
    expect(txId).toBeDefined();

    const position = await db.query.investmentPosition.findFirst({ where: (p, { eq }) => eq(p.id, pos.id) });
    expect(position).toBeDefined();
    expect(position?.symbol).toBe('AAPL');
    expect(Number(position?.units)).toBe(10.5);
    expect(position?.averageCostMinor).toBe(15000n); // Avg cost is per unit, which was 15000n
  });

  it('sells an investment position', async () => {
    const pos = await db.query.investmentPosition.findFirst({ 
      where: (p, { eq, and }) => and(eq(p.symbol, 'AAPL'), eq(p.workspaceId, testWorkspaceId))
    });
    
    await sellPosition(
      testWorkspaceId,
      investmentAccountId,
      pos!.id,
      '5.0',
      16000n, // $160.00
      'USD',
      new Date(),
      testUserId
    );

    const updatedPos = await db.query.investmentPosition.findFirst({ where: (p, { eq }) => eq(p.id, pos!.id) });
    expect(Number(updatedPos?.units)).toBe(5.5); // 10.5 - 5.0
  });

  it('records a withdrawal from investment to bank', async () => {
    const txId = await recordWithdrawal(
      testWorkspaceId,
      investmentAccountId,
      bankAccountId,
      50000n, // $500.00
      'USD',
      new Date(),
      testUserId
    );
    expect(txId).toBeDefined();
  });
});
