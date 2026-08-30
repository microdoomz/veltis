import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../lib/db';
import { user, workspace, financialAccount, statementImportRow } from '../../lib/db/schema';
import { processCsvImport, getImportWithRows, commitImportRow } from '../../lib/services/import';
import { randomUUID } from 'crypto';

describe('Statement Import Service', () => {
  let testUserId: string;
  let testWorkspaceId: string;
  let bankAccountId: string;
  let importId: string;
  let rowId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(), 
      name: 'Import Test User', 
      email: `import-${randomUUID()}@example.com`,
      createdAt: new Date(), 
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Import Workspace', 
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

  it('processes a CSV import and detects duplicate rows', async () => {
    const csvData = `date,description,amount
2026-08-30,Supermarket,-50.00
2026-08-31,Salary,2000.00`;

    const session = await processCsvImport(
      csvData,
      'test.csv',
      testWorkspaceId,
      bankAccountId,
      testUserId
    );
    
    expect(session.id).toBeDefined();
    importId = session.id;

    const importData = await getImportWithRows(importId, testWorkspaceId);
    expect(importData).toBeDefined();
    expect(importData?.rows.length).toBe(2);
    
    // First row should be debit 5000n
    expect(importData?.rows[0].direction).toBe('debit');
    expect(importData?.rows[0].amountMinor).toBe(5000n);
    rowId = importData?.rows[0].id!;
  });

  it('commits an import row idempotently', async () => {
    // Commit the row
    await commitImportRow(rowId, testWorkspaceId, testUserId);
    
    const row = await db.query.statementImportRow.findFirst({
      where: (r, { eq }) => eq(r.id, rowId)
    });
    
    expect(row?.reviewStatus).toBe('accepted');
    expect(row?.committedTransactionId).toBeDefined();

    // Trying to commit again should throw
    await expect(
      commitImportRow(rowId, testWorkspaceId, testUserId)
    ).rejects.toThrow('Row not found or already reviewed');
  });
});
