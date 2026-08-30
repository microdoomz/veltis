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
