import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { user, workspace } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { GET, PATCH } from '@/app/api/workspace/route';

vi.mock('@/lib/auth/guards', () => {
  return {
    requireUser: vi.fn(),
    requireWorkspaceAccess: vi.fn(),
    requireStrictWorkspaceAccess: vi.fn(),
  };
});

import { requireWorkspaceAccess } from '@/lib/auth/guards';

describe('Workspace API', () => {
  let testUserId: string;
  let testWorkspaceId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(),
      name: 'Workspace API User',
      email: `workspace-api-${randomUUID()}@example.com`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Initial Workspace Name',
      baseCurrency: 'USD',
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    (requireWorkspaceAccess as Mock).mockResolvedValue({
      session: { user: { id: testUserId, name: 'Workspace API User', email: newUser.email } },
      membership: { role: 'owner', workspaceId: testWorkspaceId, userId: testUserId },
      workspaceId: testWorkspaceId,
    });
  });

  it('GET /api/workspace returns workspace details', async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.workspace.id).toBe(testWorkspaceId);
    expect(data.workspace.name).toBe('Initial Workspace Name');
    expect(data.workspace.baseCurrency).toBe('USD');
    expect(data.role).toBe('owner');
  });

  it('PATCH /api/workspace updates workspace name and baseCurrency', async () => {
    const req = new NextRequest('http://localhost:3000/api/workspace', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Renamed Workspace',
        baseCurrency: 'EUR',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.workspace.name).toBe('Renamed Workspace');
    expect(data.workspace.baseCurrency).toBe('EUR');
  });

  it('PATCH /api/workspace rejects invalid currency length', async () => {
    const req = new NextRequest('http://localhost:3000/api/workspace', {
      method: 'PATCH',
      body: JSON.stringify({
        baseCurrency: 'EUROPE',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});
