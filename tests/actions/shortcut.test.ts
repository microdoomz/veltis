import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { user, workspace, shortcutToken } from '@/lib/db/schema';
import { addShortcutTokenAction, deleteShortcutTokenAction } from '@/app/actions/shortcut';
import { requireStrictWorkspaceAccess } from '@/lib/auth/guards';

vi.mock('@/lib/auth/guards', () => {
  return {
    requireStrictWorkspaceAccess: vi.fn(),
  };
});
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Shortcut Actions', () => {
  let testWorkspaceId: string;
  let testUserId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(),
      name: 'Shortcut Action User',
      email: `shortcut-action-${Date.now()}@example.com`,
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Shortcut Action Workspace', 
      baseCurrency: 'USD', 
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    (requireStrictWorkspaceAccess as Mock).mockResolvedValue({ 
      workspaceId: testWorkspaceId,
      session: { user: { id: testUserId } }
    });
  });

  it('addShortcutTokenAction creates a token', async () => {
    const formData = new FormData();
    formData.append('name', 'Siri Shortcut');

    const result = await addShortcutTokenAction(testWorkspaceId, formData);
    
    expect(result).toBeDefined();
    expect(result.rawToken).toBeDefined();
    expect(typeof result.rawToken).toBe('string');

    const tokens = await db.query.shortcutToken.findMany({
      where: (t, { eq }) => eq(t.workspaceId, testWorkspaceId)
    });

    expect(tokens.length).toBe(1);
    expect(tokens[0].name).toBe('Siri Shortcut');
  });

  it('deleteShortcutTokenAction revokes a token', async () => {
    const tokens = await db.query.shortcutToken.findMany({
      where: (t, { eq }) => eq(t.workspaceId, testWorkspaceId)
    });
    const tokenId = tokens[0].id;

    const formData = new FormData();
    formData.append('tokenId', tokenId);

    await deleteShortcutTokenAction(testWorkspaceId, formData);

    const checkTokens = await db.query.shortcutToken.findMany({
      where: (t, { eq }) => eq(t.workspaceId, testWorkspaceId)
    });

    expect(checkTokens.length).toBe(1);
    expect(checkTokens[0].revokedAt).not.toBeNull();
  });
});
