import { db } from '../db';
import { idempotencyKey } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

function hashIdempotencyKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function checkIdempotency(workspaceId: string, scope: string, key: string) {
  const keyHash = hashIdempotencyKey(key);
  
  const existing = await db.query.idempotencyKey.findFirst({
    where: and(
      eq(idempotencyKey.workspaceId, workspaceId),
      eq(idempotencyKey.scope, scope),
      eq(idempotencyKey.keyHash, keyHash)
    )
  });

  if (existing) {
    return existing;
  }
  return null;
}

export async function recordIdempotency(
  workspaceId: string, 
  scope: string, 
  key: string, 
  payload: unknown, 
  resourceType: string, 
  resourceId: string
) {
  const keyHash = hashIdempotencyKey(key);
  
  await db.insert(idempotencyKey).values({
    workspaceId,
    scope,
    keyHash,
    responsePayload: payload,
    resourceType,
    resourceId,
    // Expire keys after 30 days to save space
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });
}
