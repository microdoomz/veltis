import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { user, workspace } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { GET as getRecurring, POST as createRecurring } from '@/app/api/recurring/route';
import { POST as confirmRecurring } from '@/app/api/recurring/[id]/confirm/route';

// Mock auth guards
vi.mock('@/lib/auth/guards', () => {
  return {
    requireUser: vi.fn(),
    requireWorkspaceAccess: vi.fn(),
    requireStrictWorkspaceAccess: vi.fn(),
  };
});

import { requireUser, requireWorkspaceAccess, requireStrictWorkspaceAccess } from '@/lib/auth/guards';

describe('Recurring APIs', () => {
  let testUserId: string;
  let testWorkspaceId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(), 
      name: 'Recurring API User', 
      email: `recurring-api-${randomUUID()}@example.com`,
      createdAt: new Date(), 
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Recurring API Workspace', 
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

  it('GET /api/recurring returns correctly', async () => {
    const req = createGetRequest(`http://localhost/api/recurring?workspaceId=${testWorkspaceId}`);
    const res = await getRecurring(req, { params: {} });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
