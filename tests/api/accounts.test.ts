import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { user, workspace, financialAccount, accountState } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { GET as getAccounts, POST as createAccountRoute } from '@/app/api/accounts/route';

vi.mock('@/lib/auth/guards', () => {
  return {
    requireUser: vi.fn(),
    requireWorkspaceAccess: vi.fn(),
    requireStrictWorkspaceAccess: vi.fn(),
  };
});

import { requireUser, requireWorkspaceAccess } from '@/lib/auth/guards';

describe('Accounts API & Service', () => {
  let testUserId: string;
  let testWorkspaceId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(),
      name: 'Accounts API User',
      email: `accounts-api-${randomUUID()}@example.com`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Accounts API Workspace',
      baseCurrency: 'USD',
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    (requireUser as Mock).mockResolvedValue({ user: { id: testUserId } });
    (requireWorkspaceAccess as Mock).mockResolvedValue({ workspaceId: testWorkspaceId });
  });

  it('POST /api/accounts creates a financial account and initial accountState', async () => {
    const payload = {
      workspaceId: testWorkspaceId,
      name: 'Main Checking Account',
      type: 'checking',
      institutionName: 'Chase Bank',
      currency: 'USD',
      balance: 1250.75,
      color: '#10B981',
    };

    const req = new NextRequest('http://localhost/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await createAccountRoute(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.name).toBe('Main Checking Account');
    expect(data.accountType).toBe('bank');
    expect(data.currency).toBe('USD');
    expect(data.openingBalanceMinor).toBe('125075');

    // Verify accountState was initialized with 0n lien amount
    const state = await db.query.accountState.findFirst({
      where: eq(accountState.financialAccountId, data.id),
    });
    expect(state).toBeDefined();
    expect(state?.lienAmountMinor).toBe(0n);
  });

  it('GET /api/accounts returns list of active accounts', async () => {
    const req = new NextRequest(`http://localhost/api/accounts?workspaceId=${testWorkspaceId}`, {
      method: 'GET',
    });

    const res = await getAccounts(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].name).toBe('Main Checking Account');
  });
});
