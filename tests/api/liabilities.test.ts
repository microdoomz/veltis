import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { user, workspace } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { GET as getLiabilities, POST as createLiability } from '@/app/api/liabilities/route';
import { POST as payLiability } from '@/app/api/liabilities/[id]/pay/route';

// Mock auth guards
vi.mock('@/lib/auth/guards', () => {
  return {
    requireUser: vi.fn(),
    requireWorkspaceAccess: vi.fn(),
    requireStrictWorkspaceAccess: vi.fn(),
  };
});

import { requireUser, requireWorkspaceAccess, requireStrictWorkspaceAccess } from '@/lib/auth/guards';

describe('Liabilities APIs', () => {
  let testUserId: string;
  let testWorkspaceId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(), 
      name: 'Liabilities API User', 
      email: `liabilities-api-${randomUUID()}@example.com`,
      createdAt: new Date(), 
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Liabilities API Workspace', 
      baseCurrency: 'USD', 
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

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

  it('GET /api/liabilities returns correctly', async () => {
    const req = createGetRequest(`http://localhost/api/liabilities?workspaceId=${testWorkspaceId}`);
    const res = await getLiabilities(req, { params: {} });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
