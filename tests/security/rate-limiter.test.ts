import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/security/rate-limit';

describe('Rate Limiter', () => {
  it('allows requests within limit and correctly computes remaining', async () => {
    const key = `test:rate:${randomUUID()}`;
    const limit = 3;
    const windowSeconds = 60;

    let res = await checkRateLimit(key, limit, windowSeconds);
    expect(res.success).toBe(true);
    expect(res.remaining).toBe(2);

    res = await checkRateLimit(key, limit, windowSeconds);
    expect(res.success).toBe(true);
    expect(res.remaining).toBe(1);

    res = await checkRateLimit(key, limit, windowSeconds);
    expect(res.success).toBe(true);
    expect(res.remaining).toBe(0);
  });

  it('blocks requests exceeding limit', async () => {
    const key = `test:rate:${randomUUID()}`;
    const limit = 2;
    const windowSeconds = 60;

    await checkRateLimit(key, limit, windowSeconds);
    await checkRateLimit(key, limit, windowSeconds);
    
    // 3rd request should fail
    const res = await checkRateLimit(key, limit, windowSeconds);
    expect(res.success).toBe(false);
    expect(res.remaining).toBe(0);
  });

  it('resets limit after window expires', async () => {
    const key = `test:rate:${randomUUID()}`;
    const limit = 1;
    // We cannot easily mock time inside Drizzle queries without some work, but we can test the reset logic by manually updating the db record
    await checkRateLimit(key, limit, 60);
    
    // Wait for the window to expire
    await new Promise(resolve => setTimeout(resolve, 1100));
    await db.update(rateLimit).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(rateLimit.key, key));

    const res = await checkRateLimit(key, limit, 60);
    expect(res.success).toBe(true);
    expect(res.remaining).toBe(0);
  });
});
