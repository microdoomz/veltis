import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../lib/db';
import { user, workspace, financialAccount } from '../../lib/db/schema';
import { createRecurringItem, getRecurringItemsWithOccurrences, confirmOccurrence, getNextOccurrenceDate } from '../../lib/services/recurring';
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

  it('calculates the next occurrence correctly with working-day logic', () => {
    // Note: getNextOccurrenceDate returns next month based on baseDate
    const baseDate = new Date(2023, 10, 15); // Nov 15, 2023
    
    // First day of next month (Dec 1, 2023 is a Friday, so it's a working day)
    const firstDay = getNextOccurrenceDate(baseDate, 'first_day');
    expect(firstDay.getFullYear()).toBe(2023);
    expect(firstDay.getMonth()).toBe(11); // Dec
    expect(firstDay.getDate()).toBe(1);

    // Last working day of next month (Dec 31, 2023 is Sunday -> Friday Dec 29)
    const lastDay = getNextOccurrenceDate(baseDate, 'last_working_day');
    expect(lastDay.getDate()).toBe(29);

    // Custom day falling on a weekend (Dec 10, 2023 is Sunday -> Monday Dec 11)
    const customDay = getNextOccurrenceDate(baseDate, 'custom_day', 10);
    expect(customDay.getDate()).toBe(11);
  });

  it('confirms an occurrence with amount and date overrides', async () => {
    const recurring = await createRecurringItem({
      workspaceId: testWorkspaceId,
      name: 'Internet',
      type: 'expense',
      expectedAmountMinor: 5000n,
      currency: 'USD',
      frequency: 'monthly',
      dayRule: 'first_day',
      defaultAccountId: bankAccountId
    });
    
    const items = await getRecurringItemsWithOccurrences(testWorkspaceId);
    const item = items.find(i => i.id === recurring.id);
    const occId = item!.pendingOccurrences[0].id;

    // Override amount and date
    const overrideDate = '2023-12-05';
    const overrideAmount = 5500n;
    
    await confirmOccurrence(occId, testWorkspaceId, bankAccountId, testUserId, overrideDate, overrideAmount);
    
    const occurrence = await db.query.recurringOccurrence.findFirst({
      where: (o, { eq }) => eq(o.id, occId)
    });
    
    expect(occurrence?.status).toBe('confirmed');
    
    // Ensure the generated transaction has the overridden values
    const txn = await db.query.transaction.findFirst({
      where: (t, { eq }) => eq(t.id, occurrence!.transactionId!)
    });
    
    expect(txn?.amountMinor).toBe(overrideAmount);
    expect(txn?.transactionDate).toBe(overrideDate);
  });
});
