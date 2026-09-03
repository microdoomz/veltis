import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { user, workspace } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { GET as getReceivables, POST as createReceivable } from '@/app/api/receivables/route';
import { POST as settleReceivable } from '@/app/api/receivables/[id]/settle/route';

// Mock auth guards
vi.mock('@/lib/auth/guards', () => {
  return {
    requireUser: vi.fn(),
    requireWorkspaceAccess: vi.fn(),
    requireStrictWorkspaceAccess: vi.fn(),
  };
});

import { requireUser, requireWorkspaceAccess, requireStrictWorkspaceAccess } from '@/lib/auth/guards';

describe('Receivables APIs', () => {
  let testUserId: string;
  let testWorkspaceId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(), 
      name: 'Receivables API User', 
      email: `receivables-api-${randomUUID()}@example.com`,
      createdAt: new Date(), 
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Receivables API Workspace', 
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

  it('GET /api/receivables returns correctly', async () => {
    const req = createGetRequest(`http://localhost/api/receivables?workspaceId=${testWorkspaceId}`);
    const res = await getReceivables(req, { params: {} });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
