import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { user, workspace, financialAccount, transaction, transactionLeg, category } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { GET as getOverview } from '@/app/api/analytics/overview/route';
import { GET as getSpending } from '@/app/api/analytics/spending/route';
import { GET as getIncome } from '@/app/api/analytics/income/route';
import { GET as getInvestments } from '@/app/api/analytics/investments/route';
import { GET as getBudgets } from '@/app/api/analytics/budgets/route';
import { GET as getWealth } from '@/app/api/analytics/wealth/route';

// Mock auth guards
vi.mock('@/lib/auth/guards', () => {
  return {
    requireUser: vi.fn(),
    requireWorkspaceAccess: vi.fn(),
    requireStrictWorkspaceAccess: vi.fn(),
  };
});

import { requireUser, requireWorkspaceAccess, requireStrictWorkspaceAccess } from '@/lib/auth/guards';

describe('Analytics APIs', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let testAccountId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(), 
      name: 'Analytics API User', 
      email: `analytics-api-${randomUUID()}@example.com`,
      createdAt: new Date(), 
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Analytics API Workspace', 
      baseCurrency: 'USD', 
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    const [newAcc] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId,
      name: 'Analytics API Bank',
      accountType: 'bank',
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

  it('GET /api/analytics/overview returns correctly', async () => {
    const req = createGetRequest(`http://localhost/api/analytics/overview?workspaceId=${testWorkspaceId}&startDate=2024-01-01&endDate=2024-12-31`);
    const res = await getOverview(req, { params: {} });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalSpending).toBeDefined();
    // Verify properties
  });
});
