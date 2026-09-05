import { db } from '../db';
import { workspace, workspaceMember } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function createWorkspaceForUser(userId: string, name: string = 'Personal Workspace') {
  return await db.transaction(async (tx) => {
    const ws = await tx.insert(workspace).values({
      id: randomUUID(),
      name,
      baseCurrency: 'USD',
      createdByUserId: userId,
    }).returning();

    await tx.insert(workspaceMember).values({
      id: randomUUID(),
      workspaceId: ws[0].id,
      userId,
      role: 'owner',
      status: 'active',
    });

    return ws[0];
  });
}

export async function getUserWorkspaces(userId: string) {
  return await db.select({
    workspace: workspace,
    role: workspaceMember.role,
    status: workspaceMember.status
  })
  .from(workspaceMember)
  .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
  .where(and(eq(workspaceMember.userId, userId), eq(workspaceMember.status, 'active')));
}

export async function getWorkspaceById(workspaceId: string) {
  const result = await db
    .select()
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1);
  return result[0] || null;
}

export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string; baseCurrency?: string }
) {
  const updateData: { name?: string; baseCurrency?: string; updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined && data.name.trim().length > 0) {
    updateData.name = data.name.trim();
  }
  if (data.baseCurrency !== undefined && data.baseCurrency.trim().length === 3) {
    updateData.baseCurrency = data.baseCurrency.trim().toUpperCase();
  }

  const updated = await db
    .update(workspace)
    .set(updateData)
    .where(eq(workspace.id, workspaceId))
    .returning();

  return updated[0] || null;
}

