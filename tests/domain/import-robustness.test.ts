import { describe, it, expect } from 'vitest';
import { processCsvImport } from '@/lib/services/import';
import { db } from '@/lib/db';
import { financialAccount, workspace, user, statementImportRow } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Import Robustness & Flexible CSV Parsing', () => {
  it('correctly handles quoted fields with commas, multiple date formats, and separate debit/credit columns', async () => {
    // 1. Setup test user & workspace & account
    const [testUser] = await db.insert(user).values({
      id: `test-import-usr-${Date.now()}`,
      name: 'Import Tester',
      email: `import-${Date.now()}@test.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const [testWs] = await db.insert(workspace).values({
      name: 'Import Test Workspace',
      baseCurrency: 'USD',
      createdByUserId: testUser.id,
    }).returning();

    const [testAcc] = await db.insert(financialAccount).values({
      workspaceId: testWs.id,
      name: 'Import Checking',
      accountType: 'bank',
      currency: 'USD',
      openingBalanceMinor: 0n,
      openingBalanceDate: new Date().toISOString().split('T')[0],
      status: 'active',
    }).returning();

    // 2. CSV with quotes and commas, DD/MM/YYYY dates, and debit/credit columns
    const csvContent = `\uFEFFDate,Narration,Withdrawal,Deposit
15/01/2024,"Starbucks, Downtown #421",4.75,
16/01/2024,"Direct Deposit, ACME Corp",,2500.00
17/01/2024,"Whole Foods, Market",84.20,`;

    const result = await processCsvImport(
      csvContent,
      'statement.csv',
      testWs.id,
      testAcc.id,
      testUser.id
    );

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.status).toBe('review');

    // Fetch imported rows
    const importRows = await db.query.statementImportRow.findMany({
      where: eq(statementImportRow.statementImportId, result.id),
    });

    expect(importRows.length).toBe(3);
    // Row 1: Starbucks
    expect(importRows[0].description).toBe('Starbucks, Downtown #421');
    expect(importRows[0].amountMinor).toBe(475n);
    expect(importRows[0].direction).toBe('debit');
    expect(importRows[0].transactionDate).toBe('2024-01-15');

    // Row 2: Direct Deposit
    expect(importRows[1].description).toBe('Direct Deposit, ACME Corp');
    expect(importRows[1].amountMinor).toBe(250000n);
    expect(importRows[1].direction).toBe('credit');
    expect(importRows[1].transactionDate).toBe('2024-01-16');

    // Row 3: Whole Foods
    expect(importRows[2].description).toBe('Whole Foods, Market');
    expect(importRows[2].amountMinor).toBe(8420n);
    expect(importRows[2].direction).toBe('debit');
  });
});
