import { auth } from './auth';
import { headers } from 'next/headers';
import { db } from '../db';
import { workspaceMember, session as sessionTable, user as userTable } from '../db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { createWorkspaceForUser } from '../services/workspace';

export async function getUser() {
  const reqHeaders = await headers();
  let session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (session?.user) {
    return session;
  }

  // Fallback 1: Bearer token or custom session header
  const authHeader = reqHeaders.get('authorization') || reqHeaders.get('Authorization') || '';
  let token = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  }
  if (!token) {
    token = reqHeaders.get('x-session-token') || reqHeaders.get('x-auth-token') || '';
  }
  if (!token) {
    const cookieHeader = reqHeaders.get('cookie') || '';
    const match = cookieHeader.match(/(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1].trim());
    }
  }

  if (token) {
    try {
      const rows = await db
        .select({
          session: sessionTable,
          user: userTable,
        })
        .from(sessionTable)
        .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
        .where(and(eq(sessionTable.token, token), gt(sessionTable.expiresAt, new Date())))
        .limit(1);

      if (rows.length > 0) {
        const row = rows[0];
        return {
          session: {
            id: row.session.id,
            userId: row.session.userId,
            token: row.session.token,
            expiresAt: row.session.expiresAt,
            createdAt: row.session.createdAt,
            updatedAt: row.session.updatedAt,
            ipAddress: row.session.ipAddress,
            userAgent: row.session.userAgent,
          },
          user: {
            id: row.user.id,
            name: row.user.name,
            email: row.user.email,
            emailVerified: row.user.emailVerified,
            image: row.user.image,
            createdAt: row.user.createdAt,
            updatedAt: row.user.updatedAt,
            phoneNumber: row.user.phoneNumber,
            phoneNumberVerified: row.user.phoneNumberVerified,
            twoFactorEnabled: row.user.twoFactorEnabled,
          },
        };
      }
    } catch (err) {
      console.error('Failed to resolve session via database fallback:', err);
    }
  }

  return null;
}

export async function requireUser() {
  const session = await getUser();

  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  return session;
}

export async function requireWorkspaceAccess(workspaceId?: string) {
  const session = await requireUser();
  const userId = session.user.id;

  let membership;
  if (workspaceId && workspaceId.trim() !== '') {
    membership = await db.query.workspaceMember.findFirst({
      where: and(
        eq(workspaceMember.workspaceId, workspaceId.trim()),
        eq(workspaceMember.userId, userId),
        eq(workspaceMember.status, 'active')
      ),
    });
  }

  if (!membership) {
    membership = await db.query.workspaceMember.findFirst({
      where: and(
        eq(workspaceMember.userId, userId),
        eq(workspaceMember.status, 'active')
      ),
    });
  }

  // Auto-create workspace if none exists for this valid user
  if (!membership) {
    const newWs = await createWorkspaceForUser(userId, `${session.user.name || 'Personal'}'s Workspace`);
    membership = await db.query.workspaceMember.findFirst({
      where: and(
        eq(workspaceMember.workspaceId, newWs.id),
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

export async function requireStrictWorkspaceAccess(workspaceId?: string | null) {
  if (workspaceId && workspaceId.trim() !== '') {
    const session = await requireUser();
    const userId = session.user.id;

    const membership = await db.query.workspaceMember.findFirst({
      where: and(
        eq(workspaceMember.workspaceId, workspaceId.trim()),
        eq(workspaceMember.userId, userId),
        eq(workspaceMember.status, 'active')
      ),
    });

    if (membership) {
      return { session, membership, workspaceId: membership.workspaceId };
    }
  }

  // Fallback to active workspace access if no explicit workspaceId or access mismatch
  return await requireWorkspaceAccess(workspaceId || undefined);
}
