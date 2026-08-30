import { describe, it, expect, beforeAll } from 'vitest';
import { POST } from '../../app/api/shortcuts/expense/route';
import { NextRequest } from 'next/server';
import { db } from '../../lib/db';
import { user, workspace, financialAccount } from '../../lib/db/schema';
import { createShortcutToken, revokeShortcutToken } from '../../lib/services/shortcut';
import { randomUUID } from 'crypto';

describe('Shortcuts API', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let bankAccountId: string;
  let rawToken: string;
  let tokenId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(), 
      name: 'Shortcut Test User', 
      email: `shortcut-${randomUUID()}@example.com`,
      createdAt: new Date(), 
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Shortcut Workspace', 
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

    const tokenRes = await createShortcutToken({
      workspaceId: testWorkspaceId,
      userId: testUserId,
      name: 'Test Shortcut'
    });
    rawToken = tokenRes.rawToken;
    tokenId = tokenRes.record.id;
  });

  const createMockRequest = (body: Record<string, unknown>, tokenOverride?: string) => {
    return new NextRequest('http://localhost/api/shortcuts/expense', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenOverride ?? rawToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  };

  it('rejects missing token', async () => {
    const req = new NextRequest('http://localhost/api/shortcuts/expense', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects invalid token', async () => {
    const req = createMockRequest({ amount: 10, description: 'Test', idempotencyKey: 'fail' }, 'invalid');
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('creates an expense successfully', async () => {
    const req = createMockRequest({
      amount: 15.50,
      description: 'Coffee',
      idempotencyKey: 'idem-1'
    });
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.transactionId).toBeDefined();
    expect(data.amount).toBe(15.50);
  });

  it('is idempotent for repeated requests', async () => {
    // First request already succeeded (idem-1)
    const req = createMockRequest({
      amount: 15.50,
      description: 'Coffee',
      idempotencyKey: 'idem-1'
    });
    const res = await POST(req);
    const data = await res.json();
    
    // Should return 200 instead of 201, and same transactionId
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('rejects revoked tokens', async () => {
    await revokeShortcutToken(testWorkspaceId, tokenId);

    const req = createMockRequest({
      amount: 10,
      description: 'Revoked',
      idempotencyKey: 'idem-revoked'
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
