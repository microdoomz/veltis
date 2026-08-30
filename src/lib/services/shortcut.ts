import { db } from '../db';
import { shortcutToken } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import { z } from 'zod';

// Utility to hash tokens for storage
function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// Generates a new cryptographically secure token
function generateRawToken(): string {
  return `vsh_${crypto.randomBytes(32).toString('hex')}`;
}

export const createShortcutTokenSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string(),
  name: z.string().min(1).max(100),
});

export async function createShortcutToken(data: z.infer<typeof createShortcutTokenSchema>) {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);

  const [newToken] = await db.insert(shortcutToken).values({
    workspaceId: data.workspaceId,
    createdByUserId: data.userId,
    name: data.name,
    tokenHash,
    // Optional: add expiry (e.g., 1 year from now)
  }).returning();

  // Return the raw token ONLY ONCE. We do not store it.
  return { record: newToken, rawToken };
}

export async function getActiveShortcutTokens(workspaceId: string) {
  return await db.query.shortcutToken.findMany({
    where: and(
      eq(shortcutToken.workspaceId, workspaceId),
      isNull(shortcutToken.revokedAt)
    ),
    orderBy: (tokens, { desc }) => [desc(tokens.createdAt)],
  });
}

export async function revokeShortcutToken(workspaceId: string, tokenId: string) {
  await db.update(shortcutToken).set({
    revokedAt: new Date(),
  }).where(
    and(
      eq(shortcutToken.id, tokenId),
      eq(shortcutToken.workspaceId, workspaceId)
    )
  );
}

export async function verifyShortcutToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const [token] = await db.query.shortcutToken.findMany({
    where: and(
      eq(shortcutToken.tokenHash, tokenHash),
      isNull(shortcutToken.revokedAt)
    ),
    limit: 1
  });

  if (!token) return null;

  // Check expiration if applicable
  if (token.expiresAt && new Date() > token.expiresAt) {
    return null;
  }

  // Update last used asynchronously (fire and forget)
  db.update(shortcutToken).set({
    lastUsedAt: new Date(),
  }).where(eq(shortcutToken.id, token.id)).execute().catch(console.error);

  return token;
}
