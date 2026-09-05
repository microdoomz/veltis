import { describe, it, expect, beforeAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { user, workspace, recurringItem } from '@/lib/db/schema';
import { randomUUID } from 'crypto';

vi.mock('@/lib/investments/provider', () => ({
  marketProvider: {
    getProviderName: () => 'mock-yahoo',
    fetchPrice: vi.fn().mockResolvedValue({ priceMinor: 15000n, currency: 'USD' }),
  },
}));

import { GET as dailyCron } from '@/app/api/cron/daily/route';

describe('Daily Cron Automation Route', () => {
  let testUserId: string;
  let testWorkspaceId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(),
      name: 'Cron Test User',
      email: `cron-test-${randomUUID()}@example.com`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Cron Test Workspace',
      baseCurrency: 'USD',
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    // Insert an active recurring item
    await db.insert(recurringItem).values({
      workspaceId: testWorkspaceId,
      type: 'expense',
      name: 'Monthly Software Subscription',
      expectedAmountMinor: 1500n,
      currency: 'USD',
      frequency: 'monthly',
      dayRule: 'first_day',
      active: true,
    });
  });

  it('rejects execution when CRON_SECRET is invalid', async () => {
    const originalSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'super-secret-cron-token-xyz';

    try {
      const req = new NextRequest('http://localhost/api/cron/daily', {
        headers: { Authorization: 'Bearer wrong-secret' },
      });
      const res = await dailyCron(req);
      expect(res.status).toBe(401);
    } finally {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it('executes successfully and generates occurrences with valid CRON_SECRET', async () => {
    const originalSecret = process.env.CRON_SECRET;
    const testSecret = 'valid-test-secret-123';
    process.env.CRON_SECRET = testSecret;

    try {
      const req = new NextRequest('http://localhost/api/cron/daily', {
        headers: { Authorization: `Bearer ${testSecret}` },
      });
      const res = await dailyCron(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(typeof data.recurringProcessed).toBe('number');
      expect(data.recurringProcessed).toBeGreaterThanOrEqual(1);
    } finally {
      process.env.CRON_SECRET = originalSecret;
    }
  }, 15000);
});
