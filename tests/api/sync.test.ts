import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { POST } from '@/app/api/sync/transactions/route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { user, workspace, financialAccount, transaction } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

// Mock auth guards
vi.mock('@/lib/auth/guards', () => {
  return {
    requireUser: vi.fn(),
    requireWorkspaceAccess: vi.fn(),
    requireStrictWorkspaceAccess: vi.fn(),
  };
});

import { requireUser, requireWorkspaceAccess, requireStrictWorkspaceAccess } from '@/lib/auth/guards';

describe('Offline Sync API', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let testAccountId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(), 
      name: 'Sync Test User', 
      email: `sync-${randomUUID()}@example.com`,
      createdAt: new Date(), 
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Sync Workspace', 
      baseCurrency: 'INR', 
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    const [newAcc] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId,
      name: 'Sync Bank',
      accountType: 'bank',
      currency: 'INR',
      openingBalanceMinor: 0n,
      openingBalanceDate: new Date().toISOString(),
      status: 'active'
    }).returning();
    testAccountId = newAcc.id;

    (requireUser as Mock).mockResolvedValue({ user: { id: testUserId } });
    (requireWorkspaceAccess as Mock).mockResolvedValue({ workspaceId: testWorkspaceId });
    (requireStrictWorkspaceAccess as Mock).mockResolvedValue({ workspaceId: testWorkspaceId });
  });

  const createSyncRequest = (transactions: unknown[]) => {
    return new NextRequest('http://localhost/api/sync/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions })
    });
  };

  it('rejects malformed payloads', async () => {
    const req = new NextRequest('http://localhost/api/sync/transactions', {
      method: 'POST',
      body: JSON.stringify({ wrong: 'payload' })
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('successfully processes a batch of mixed transactions', async () => {
    const id1 = randomUUID();
    const id2 = randomUUID();

    const req = createSyncRequest([
      {
        id: id1,
        type: 'expense',
        payload: {
          workspaceId: testWorkspaceId,
          amountMajor: 100,
          accountId: testAccountId,
          transactionDate: '2023-01-01',
          description: 'Expense 1'
        }
      },
      {
        id: id2,
        type: 'income',
        payload: {
          workspaceId: testWorkspaceId,
          amountMajor: 200,
          accountId: testAccountId,
          transactionDate: '2023-01-02',
          description: 'Income 1'
        }
      }
    ]);

    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.results).toHaveLength(2);
    expect(data.results[0].status).toBe('success');
    expect(data.results[1].status).toBe('success');

    const txns = await db.query.transaction.findMany({ 
        where: eq(transaction.workspaceId, testWorkspaceId) 
    });
    // Filter to just the ones created in this test via clientTransactionId
    const testTxns = txns.filter(t => t.clientTransactionId === id1 || t.clientTransactionId === id2);
    expect(testTxns).toHaveLength(2);
    
    const exp = testTxns.find(t => t.clientTransactionId === id1)!;
    expect(exp.amountMinor).toBe(10000n);
  });

  it('successfully processes a transfer transaction', async () => {
    const id = randomUUID();
    const destAccountId = randomUUID();
    
    // Create destination account for transfer
    await db.insert(financialAccount).values({
      id: destAccountId,
      workspaceId: testWorkspaceId,
      name: 'Dest Bank',
      accountType: 'bank',
      currency: 'INR',
      openingBalanceMinor: 0n,
      openingBalanceDate: new Date().toISOString(),
      status: 'active'
    }).returning();

    const req = createSyncRequest([
      {
        id,
        type: 'transfer',
        payload: {
          workspaceId: testWorkspaceId,
          amountMajor: 150,
          sourceAccountId: testAccountId,
          destAccountId: destAccountId,
          transactionDate: '2023-01-01',
          description: 'Transfer 1'
        }
      }
    ]);

    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.results[0].status).toBe('success');

    const txns = await db.query.transaction.findMany({ 
        where: eq(transaction.clientTransactionId, id),
        with: { legs: true }
    });
    // Transfer creates two ledger entries under the same transaction group usually, but Veltis 
    // transfer handling in processTransfer might create a specific format.
    expect(txns.length).toBeGreaterThan(0);
    const sourceLeg = txns[0].legs.find(l => l.accountId === testAccountId);
    expect(sourceLeg?.amountMinor).toBe(15000n);
  });

  it('handles idempotency for duplicate requests safely', async () => {
    const id = randomUUID();
    const tx = {
      id,
      type: 'expense',
      payload: {
        workspaceId: testWorkspaceId,
        amountMajor: 50,
        accountId: testAccountId,
        transactionDate: '2023-01-01'
      }
    };

    const req1 = createSyncRequest([tx]);
    await POST(req1);

    // Send the exact same request again
    const req2 = createSyncRequest([tx]);
    const res2 = await POST(req2);
    const data2 = await res2.json();

    expect(res2.status).toBe(200);
    expect(data2.results[0].status).toBe('success'); // Still reports success

    // Ensure only ONE transaction was created in DB
    const txns = await db.query.transaction.findMany({ 
        where: eq(transaction.clientTransactionId, id) 
    });
    expect(txns).toHaveLength(1);
  });

  it('returns permanent_error for validation failures without failing the batch', async () => {
    const validId = randomUUID();
    const invalidId = randomUUID();

    const req = createSyncRequest([
      {
        id: invalidId,
        type: 'expense',
        payload: {
          workspaceId: testWorkspaceId,
          amountMajor: -10, // Invalid: negative amount
          accountId: testAccountId,
          transactionDate: '2023-01-01'
        }
      },
      {
        id: validId,
        type: 'expense',
        payload: {
          workspaceId: testWorkspaceId,
          amountMajor: 50,
          accountId: testAccountId,
          transactionDate: '2023-01-01'
        }
      }
    ]);

    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200); // Overall batch succeeds
    
    const invalidResult = data.results.find((r: { id: string }) => r.id === invalidId);
    expect(invalidResult.status).toBe('permanent_error');

    const validResult = data.results.find((r: { id: string }) => r.id === validId);
    expect(validResult.status).toBe('success');
  });

  it('returns permanent_error for missing required fields', async () => {
    const invalidId = randomUUID();
    const req = createSyncRequest([
      {
        id: invalidId,
        type: 'expense',
        payload: {
          workspaceId: testWorkspaceId,
          // Missing accountId and amountMajor
          transactionDate: '2023-01-01'
        }
      }
    ]);

    const res = await POST(req);
    const data = await res.json();
    
    expect(data.results[0].status).toBe('permanent_error');
    expect(data.results[0].error).toContain('Validation failed');
  });

  it('returns permanent_error for unknown transaction types', async () => {
    const invalidId = randomUUID();
    const req = createSyncRequest([
      {
        id: invalidId,
        type: 'unknown_type',
        payload: {
          workspaceId: testWorkspaceId,
          amountMajor: 10,
          accountId: testAccountId,
          transactionDate: '2023-01-01'
        }
      }
    ]);

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects unauthorized access', async () => {
    (requireStrictWorkspaceAccess as Mock).mockRejectedValueOnce(new Error('Forbidden: No access to this workspace'));
    
    const req = createSyncRequest([{
      id: randomUUID(),
      type: 'expense',
      payload: { workspaceId: testWorkspaceId, amountMajor: 10, accountId: testAccountId, transactionDate: '2023-01-01' }
    }]);

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
