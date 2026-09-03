import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { createWorkspaceForUser, getUserWorkspaces } from '@/lib/services/workspace';
import { randomUUID } from 'crypto';

describe('Workspace Service', () => {
  let testUserId: string;

  beforeAll(async () => {
    testUserId = randomUUID();
    await db.insert(user).values({
      id: testUserId,
      name: 'Auth Test User',
      email: `test-${randomUUID()}@example.com`,
    });
  });

  it('creates a workspace for a new user and grants owner access', async () => {
    const ws = await createWorkspaceForUser(testUserId);
    expect(ws).toBeDefined();
    expect(ws.createdByUserId).toBe(testUserId);
    
    const workspaces = await getUserWorkspaces(testUserId);
    expect(workspaces.length).toBe(1);
    expect(workspaces[0].workspace.id).toBe(ws.id);
    expect(workspaces[0].role).toBe('owner');
    expect(workspaces[0].status).toBe('active');
  });
});
