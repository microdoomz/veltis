import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { user, workspace } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { checkIdempotency, recordIdempotency } from '@/lib/services/idempotency';

describe('Idempotency Service', () => {
  let testWorkspaceId: string;

  beforeAll(async () => {
    const [u] = await db.insert(user).values({
      id: randomUUID(), name: 'Idemp Test', email: `idemp-${randomUUID()}@test.com`, createdAt: new Date(), updatedAt: new Date(),
    }).returning();

    const [w] = await db.insert(workspace).values({
      name: 'Idemp Workspace', baseCurrency: 'USD', createdByUserId: u.id,
    }).returning();
    testWorkspaceId = w.id;
  });

  it('returns null for an unseen idempotency key', async () => {
    const result = await checkIdempotency(testWorkspaceId, 'test-scope', 'unique-key-1');
    expect(result).toBeNull();
  });

  it('records and retrieves an idempotency key', async () => {
    const payload = { success: true, amount: 100 };
    const resourceId = randomUUID();
    await recordIdempotency(testWorkspaceId, 'test-scope', 'unique-key-2', payload, 'transaction', resourceId);

    const result = await checkIdempotency(testWorkspaceId, 'test-scope', 'unique-key-2');
    expect(result).toBeDefined();
    expect(result?.resourceType).toBe('transaction');
    expect(result?.resourceId).toBe(resourceId);
    
    // Check payload
    const parsedPayload = result?.responsePayload as Record<string, unknown>;
    expect(parsedPayload.success).toBe(true);
    expect(parsedPayload.amount).toBe(100);
  });
});
