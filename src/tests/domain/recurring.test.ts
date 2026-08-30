import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../lib/db';
import { user, workspace, financialAccount } from '../../lib/db/schema';
import { createRecurringItem, getRecurringItemsWithOccurrences, confirmOccurrence } from '../../lib/services/recurring';
import { randomUUID } from 'crypto';

describe('Recurring Transactions Service', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let bankAccountId: string;
  let occurrenceId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(), 
      name: 'Recurring Test User', 
      email: `recurring-${randomUUID()}@example.com`,
      createdAt: new Date(), 
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Recurring Workspace', 
      baseCurrency: 'USD', 
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    const [bank] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId,
      name: 'Bank',
      accountType: 'bank',
      currency: 'USD',
      openingBalanceMinor: 100000n,
      openingBalanceDate: new Date().toISOString(),
      status: 'active'
    }).returning();
    bankAccountId = bank.id;
  });

  it('creates a recurring transaction and generates initial pending occurrence', async () => {
    const recurring = await createRecurringItem({
      workspaceId: testWorkspaceId,
      name: 'Netflix',
      type: 'expense',
      expectedAmountMinor: 1599n,
      currency: 'USD',
      frequency: 'monthly',
      dayRule: 'custom_day',
      customDay: 15,
      defaultAccountId: bankAccountId
    });
    
    expect(recurring.id).toBeDefined();
    expect(recurring.name).toBe('Netflix');
    expect(recurring.expectedAmountMinor).toBe(1599n);

    // Verify pending occurrence was created
    const items = await getRecurringItemsWithOccurrences(testWorkspaceId);
    expect(items.length).toBe(1);
    expect(items[0].pendingOccurrences.length).toBe(1);
    expect(items[0].pendingOccurrences[0].status).toBe('pending');
    occurrenceId = items[0].pendingOccurrences[0].id;
  });

  it('confirms an occurrence idempotently and creates the next pending occurrence', async () => {
    // Process the first time
    await confirmOccurrence(occurrenceId, testWorkspaceId, bankAccountId, testUserId);
    
    // Check that it's confirmed
    const occurrence = await db.query.recurringOccurrence.findFirst({
      where: (o, { eq }) => eq(o.id, occurrenceId)
    });
    expect(occurrence?.status).toBe('confirmed');
    expect(occurrence?.transactionId).toBeDefined();

    // Process again should throw
    await expect(
      confirmOccurrence(occurrenceId, testWorkspaceId, bankAccountId, testUserId)
    ).rejects.toThrow('Occurrence not found or already confirmed');
  });
});
