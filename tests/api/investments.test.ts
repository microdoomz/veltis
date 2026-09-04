import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { user, workspace, financialAccount, investmentPosition } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { GET as getInvestments } from '@/app/api/investments/route';
import { POST as createSnapshot } from '@/app/api/investments/snapshots/route';

// Mock auth guards
vi.mock('@/lib/auth/guards', () => {
  return {
    requireUser: vi.fn(),
    requireWorkspaceAccess: vi.fn(),
    requireStrictWorkspaceAccess: vi.fn(),
  };
});

import { requireUser, requireWorkspaceAccess, requireStrictWorkspaceAccess } from '@/lib/auth/guards';

describe('Investments APIs', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let testAccountId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(), 
      name: 'Invest API User', 
      email: `invest-api-${randomUUID()}@example.com`,
      createdAt: new Date(), 
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Invest API Workspace', 
      baseCurrency: 'USD', 
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    const [newAcc] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId,
      name: 'Invest Account',
      accountType: 'investment',
      currency: 'USD',
      openingBalanceMinor: 0n,
      openingBalanceDate: new Date().toISOString(),
      status: 'active'
    }).returning();
    testAccountId = newAcc.id;

    (requireUser as Mock).mockResolvedValue({ user: { id: testUserId } });
    (requireWorkspaceAccess as Mock).mockResolvedValue({ workspaceId: testWorkspaceId });
    (requireStrictWorkspaceAccess as Mock).mockResolvedValue({ workspaceId: testWorkspaceId });
  });

  const createGetRequest = (url: string) => {
    return new NextRequest(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  };

  it('GET /api/investments returns correctly', async () => {
    const req = createGetRequest(`http://localhost/api/investments?workspaceId=${testWorkspaceId}`);
    const res = await getInvestments(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.positions).toBeDefined();
  });
  
  const createPostRequest = (url: string, body: any) => {
    return new NextRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  };

  it('POST /api/investments/snapshots returns correctly', async () => {
    // Create a mock position
    const [pos] = await db.insert(investmentPosition).values({
      workspaceId: testWorkspaceId,
      financialAccountId: testAccountId, // Need a valid account
      name: 'Test Position',
      assetType: 'equity',
      currency: 'USD',
    }).returning();

    const req = createPostRequest(`http://localhost/api/investments/snapshots`, {
      workspaceId: testWorkspaceId,
      positionId: pos.id,
      manualPriceMinor: 10000,
      manualCurrency: 'USD'
    });
    const res = await createSnapshot(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
