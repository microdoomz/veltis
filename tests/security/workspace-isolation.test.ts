import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { requireStrictWorkspaceAccess } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { user, workspace, workspaceMember } from '@/lib/db/schema';
import { randomUUID } from 'crypto';

// We need to mock auth to simulate different users
vi.mock('@/lib/auth/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    }
  }
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => new Headers())
}));

import { auth } from '@/lib/auth/auth';

describe('Workspace Isolation & Strict Access Control', () => {
  let userA: string;
  let userB: string;
  let workspaceA: string;
  let workspaceB: string;

  beforeAll(async () => {
    // User A and their workspace
    const [uA] = await db.insert(user).values({
      id: randomUUID(), name: 'User A', email: `a-${randomUUID()}@example.com`, createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    userA = uA.id;

    const [wA] = await db.insert(workspace).values({
      name: 'Workspace A', baseCurrency: 'USD', createdByUserId: userA,
    }).returning();
    workspaceA = wA.id;

    await db.insert(workspaceMember).values({
      userId: userA, workspaceId: workspaceA, role: 'owner', status: 'active'
    });

    // User B and their workspace
    const [uB] = await db.insert(user).values({
      id: randomUUID(), name: 'User B', email: `b-${randomUUID()}@example.com`, createdAt: new Date(), updatedAt: new Date(),
    }).returning();
    userB = uB.id;

    const [wB] = await db.insert(workspace).values({
      name: 'Workspace B', baseCurrency: 'USD', createdByUserId: userB,
    }).returning();
    workspaceB = wB.id;

    await db.insert(workspaceMember).values({
      userId: userB, workspaceId: workspaceB, role: 'owner', status: 'active'
    });
  });

  const setMockUser = (userId: string | null) => {
    if (userId) {
      (auth.api.getSession as unknown as Mock).mockResolvedValue({ user: { id: userId }, session: { id: 'test-session' } });
    } else {
      (auth.api.getSession as unknown as Mock).mockResolvedValue(null);
    }
  };

  it('allows access to own workspace', async () => {
    setMockUser(userA);
    const result = await requireStrictWorkspaceAccess(workspaceA);
    expect(result.workspaceId).toBe(workspaceA);
    expect(result.session.user.id).toBe(userA);
  });

  it('denies access to another users workspace', async () => {
    setMockUser(userA);
    await expect(requireStrictWorkspaceAccess(workspaceB)).rejects.toThrow('Forbidden: No access to this workspace');
  });

  it('denies access when unauthenticated', async () => {
    setMockUser(null);
    await expect(requireStrictWorkspaceAccess(workspaceA)).rejects.toThrow('Unauthorized');
  });

  it('throws error when no workspaceId is explicitly provided', async () => {
    setMockUser(userA);
    // TypeScript prevents this, but at runtime it should throw
    await expect((requireStrictWorkspaceAccess as unknown as () => Promise<void>)()).rejects.toThrow('workspaceId is required for this operation');
  });
});
