import { auth } from './auth';
import { headers } from 'next/headers';
import { db } from '../db';
import { workspaceMember } from '../db/schema';
import { and, eq } from 'drizzle-orm';

export async function requireUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  return session;
}

export async function requireWorkspaceAccess(workspaceId?: string) {
  const session = await requireUser();
  const userId = session.user.id;

  let membership;
  if (workspaceId) {
    membership = await db.query.workspaceMember.findFirst({
      where: and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, userId),
        eq(workspaceMember.status, 'active')
      ),
    });
  } else {
    membership = await db.query.workspaceMember.findFirst({
      where: and(
        eq(workspaceMember.userId, userId),
        eq(workspaceMember.status, 'active')
      ),
    });
  }

  if (!membership) {
    throw new Error('Forbidden: No access to this workspace');
  }

  return { session, membership, workspaceId: membership.workspaceId };
}
