import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { user, workspace, recurringItem } from '@/lib/db/schema';
import { addRecurringAction, confirmOccurrenceAction } from '@/app/actions/recurring';
import { requireStrictWorkspaceAccess } from '@/lib/auth/guards';
import { createRecurringItem } from '@/lib/services/recurring';

vi.mock('@/lib/auth/guards', () => {
  return {
    requireStrictWorkspaceAccess: vi.fn(),
  };
});
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Recurring Actions', () => {
  let testWorkspaceId: string;
  let testUserId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(),
      name: 'Recurring Action User',
      email: `recur-action-${Date.now()}@example.com`,
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Recurring Action Workspace', 
      baseCurrency: 'USD', 
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    (requireStrictWorkspaceAccess as Mock).mockResolvedValue({ 
      workspaceId: testWorkspaceId,
      session: { user: { id: testUserId } }
    });
  });

  it('addRecurringAction creates a recurring item correctly', async () => {
    const formData = new FormData();
    formData.append('type', 'expense');
    formData.append('name', 'Netflix');
    formData.append('amount', '15.99');
    formData.append('customDay', '15');
    formData.append('categoryId', '');
    formData.append('defaultAccountId', '');

    await addRecurringAction(testWorkspaceId, formData);

    const items = await db.query.recurringItem.findMany({
      where: (r, { eq }) => eq(r.workspaceId, testWorkspaceId)
    });

    expect(items.length).toBe(1);
    expect(items[0].name).toBe('Netflix');
    expect(items[0].expectedAmountMinor).toBe(1599n);
    expect(items[0].dayRule).toBe('custom_day');
    expect(items[0].customDay).toBe(15);
  });

  // confirmOccurrenceAction requires occurrences which we'd need to mock or setup heavily,
  // but let's test if we can at least invoke it without breaking if the occurrence is setup
  // We can skip deep testing of confirmOccurrenceAction if the domain service is already tested, 
  // but calling it ensures it maps arguments properly.
});
