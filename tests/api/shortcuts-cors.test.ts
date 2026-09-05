import { describe, it, expect } from 'vitest';
import { OPTIONS, POST } from '@/app/api/shortcuts/expense/route';
import { createShortcutToken } from '@/lib/services/shortcut';
import { db } from '@/lib/db';
import { user, workspace, financialAccount } from '@/lib/db/schema';
import { NextRequest } from 'next/server';

describe('Shortcuts Expense API CORS and Resilience', () => {
  it('handles OPTIONS preflight request with correct CORS headers', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
  });

  it('authenticates with raw token (without Bearer prefix) and processes string amount', async () => {
    const [testUser] = await db.insert(user).values({
      id: `test-shortcut-usr-${Date.now()}`,
      name: 'Shortcut Tester',
      email: `shortcut-${Date.now()}@test.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const [testWs] = await db.insert(workspace).values({
      name: 'Shortcut Workspace',
      baseCurrency: 'USD',
      createdByUserId: testUser.id,
    }).returning();

    const [testAcc] = await db.insert(financialAccount).values({
      workspaceId: testWs.id,
      name: 'Default Card',
      accountType: 'bank',
      currency: 'USD',
      openingBalanceMinor: 50000n,
      openingBalanceDate: new Date().toISOString().split('T')[0],
      status: 'active',
    }).returning();

    const { rawToken } = await createShortcutToken({
      workspaceId: testWs.id,
      name: 'iPhone Test Token',
      userId: testUser.id,
    });

    // Call POST with raw token without "Bearer " prefix, and string amount
    const req = new NextRequest('http://localhost:3000/api/shortcuts/expense', {
      method: 'POST',
      headers: {
        'Authorization': rawToken, // raw token as shown in user screenshot
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: '45.50', // string amount
        description: 'Coffee with team',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.amount).toBe(45.5);
    expect(data.transactionId).toBeDefined();
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
