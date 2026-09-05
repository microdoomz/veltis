import { describe, it, expect } from 'vitest';
import { updateAccount, deleteAccount, createAccount, getAccountById } from '@/lib/services/account';
import { db } from '@/lib/db';
import { user, workspace } from '@/lib/db/schema';

describe('Account Update and Soft-Delete', () => {
  it('updates account name, accent color, and soft-deletes the account', async () => {
    const [testUser] = await db.insert(user).values({
      id: `test-crud-usr-${Date.now()}`,
      name: 'Account CRUD Tester',
      email: `crud-${Date.now()}@test.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const [testWs] = await db.insert(workspace).values({
      name: 'CRUD Workspace',
      baseCurrency: 'USD',
      createdByUserId: testUser.id,
    }).returning();

    // Create an account
    const acc = await createAccount({
      workspaceId: testWs.id,
      name: 'Initial Name',
      accountType: 'bank',
      currency: 'USD',
      color: '#10B981',
      openingBalanceMinor: 10000n,
      openingBalanceDate: new Date(),
    });

    expect(acc.name).toBe('Initial Name');
    expect(acc.color).toBe('#10B981');
    expect(acc.status).toBe('active');

    // Update the account
    const updated = await updateAccount(testWs.id, acc.id, {
      name: 'Updated Checking',
      color: '#6366F1',
      institutionName: 'Chase Bank',
    });

    expect(updated.name).toBe('Updated Checking');
    expect(updated.color).toBe('#6366F1');
    expect(updated.institutionName).toBe('Chase Bank');

    // Soft delete the account
    const deleted = await deleteAccount(testWs.id, acc.id);
    expect(deleted.status).toBe('archived');
    expect(deleted.deletedAt).toBeDefined();

    // Fetch account to verify
    const fetched = await getAccountById(testWs.id, acc.id);
    expect(fetched.status).toBe('archived');
  });
});
