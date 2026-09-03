import { describe, it, expect, beforeAll } from 'vitest';
import { POST } from '@/app/api/shortcuts/expense/route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { user, workspace, financialAccount, shortcutToken, transaction } from '@/lib/db/schema';
import { createShortcutToken, revokeShortcutToken, verifyShortcutToken } from '@/lib/services/shortcut';
import { recordIdempotency } from '@/lib/services/idempotency';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

describe('Shortcuts API & Service', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let otherWorkspaceId: string;
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

    const [otherWs] = await db.insert(workspace).values({
      name: 'Other Workspace', 
      baseCurrency: 'USD', 
      createdByUserId: testUserId,
    }).returning();
    otherWorkspaceId = otherWs.id;

    await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId,
      name: 'Bank',
      accountType: 'bank',
      currency: 'USD',
      openingBalanceMinor: 100000n,
      openingBalanceDate: new Date().toISOString(),
      status: 'active'
    }).returning();

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

  describe('Shortcut Token Management', () => {
    it('does not store the raw token in the database', async () => {
      const [tokenRow] = await db.query.shortcutToken.findMany({ where: eq(shortcutToken.id, tokenId) });
      expect(tokenRow.tokenHash).toBeDefined();
      expect(tokenRow.tokenHash).not.toBe(rawToken);
      expect('rawToken' in tokenRow).toBe(false);
    });

    it('verifies valid tokens correctly', async () => {
      const verified = await verifyShortcutToken(rawToken);
      expect(verified).not.toBeNull();
      expect(verified?.id).toBe(tokenId);
      expect(verified?.workspaceId).toBe(testWorkspaceId);
    });

    it('rejects invalid or malformed tokens', async () => {
      expect(await verifyShortcutToken('invalid_token')).toBeNull();
      expect(await verifyShortcutToken('')).toBeNull();
    });

    it('rejects revoked tokens and prevents recovery', async () => {
      const tempToken = await createShortcutToken({ workspaceId: testWorkspaceId, userId: testUserId, name: 'Temp' });
      await revokeShortcutToken(testWorkspaceId, tempToken.record.id);
      
      const verified = await verifyShortcutToken(tempToken.rawToken);
      expect(verified).toBeNull();
    });

    it('ensures workspace boundaries cannot be bypassed', async () => {
      // Try to revoke token from wrong workspace
      await revokeShortcutToken(otherWorkspaceId, tokenId);
      // It shouldn't revoke it because of workspace mismatch
      const verified = await verifyShortcutToken(rawToken);
      expect(verified).not.toBeNull();
    });
  });

  describe('Apple Shortcut Expense API', () => {
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

    it('rejects missing amount or negative amount', async () => {
      const req1 = createMockRequest({ description: 'Coffee', idempotencyKey: 'idem-2' });
      const res1 = await POST(req1);
      expect(res1.status).toBe(400);

      const req2 = createMockRequest({ amount: -5, description: 'Coffee', idempotencyKey: 'idem-3' });
      const res2 = await POST(req2);
      expect(res2.status).toBe(400);
    });

    it('rejects invalid account outside workspace', async () => {
      const [otherBank] = await db.insert(financialAccount).values({
        workspaceId: otherWorkspaceId,
        name: 'Other Bank',
        accountType: 'bank',
        currency: 'USD',
        openingBalanceMinor: 0n,
        openingBalanceDate: new Date().toISOString(),
        status: 'active'
      }).returning();

      const req = createMockRequest({
        amount: 10,
        description: 'Test',
        accountId: otherBank.id,
        idempotencyKey: 'idem-wrong-ws'
      });
      const res = await POST(req);
      expect(res.status).toBe(404);
    });
  });

  describe('Idempotency & Domain Interaction', () => {
    let transactionId: string;

    it('creates an expense successfully and affects ledger balance', async () => {

      const req = createMockRequest({
        amount: 15.50, // 1550 minor units
        description: 'Coffee',
        idempotencyKey: 'idem-success'
      });
      const res = await POST(req);
      const data = await res.json();
      
      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.transactionId).toBeDefined();
      transactionId = data.transactionId;

      // Check atomicity and ledger effect
      const txns = await db.query.transaction.findMany({ where: eq(transaction.id, transactionId) });
      expect(txns.length).toBe(1);
      expect(txns[0].workspaceId).toBe(testWorkspaceId);
      expect(txns[0].amountMinor).toBe(1550n);
    });

    it('is idempotent for repeated identical request', async () => {
      const req = createMockRequest({
        amount: 15.50,
        description: 'Coffee',
        idempotencyKey: 'idem-success' // Exact same key
      });
      const res = await POST(req);
      const data = await res.json();
      
      // Returns 200 instead of 201, and same transactionId
      expect(res.status).toBe(200);
      expect(data.transactionId).toBe(transactionId);
    });

    it('rejects concurrent duplicate requests if practical (simulated via manual insert)', async () => {
      // If we manually insert a key, the API shouldn't execute Domain logic again.
      await recordIdempotency(testWorkspaceId, 'shortcut_expense', 'idem-manual', { success: true, transactionId: 'some-txn-id' }, 'test', randomUUID());

      const req = createMockRequest({
        amount: 50,
        description: 'Manual',
        idempotencyKey: 'idem-manual'
      });
      const res = await POST(req);
      // It should return the cached response
      const data = await res.json();
      expect(data.transactionId).toBe('some-txn-id');
    });
  });
});
