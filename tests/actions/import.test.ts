import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { user, workspace, financialAccount, statementImport, statementImportRow } from '@/lib/db/schema';
import { uploadImportAction, reviewRowAction } from '@/app/actions/import';
import { requireStrictWorkspaceAccess } from '@/lib/auth/guards';
import { checkRateLimit } from '@/lib/security/rate-limit';

vi.mock('@/lib/auth/guards', () => {
  return {
    requireStrictWorkspaceAccess: vi.fn(),
  };
});
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));
vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn(),
}));

describe('Import Actions', () => {
  let testWorkspaceId: string;
  let testUserId: string;
  let testAccountId: string;
  let testImportId: string;
  let testRowId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(),
      name: 'Import Action User',
      email: `import-action-${Date.now()}@example.com`,
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Import Action Workspace', 
      baseCurrency: 'USD', 
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    const [newAcc] = await db.insert(financialAccount).values({
      workspaceId: testWorkspaceId,
      name: 'Import Account',
      accountType: 'bank',
      currency: 'USD',
      openingBalanceMinor: 0n,
      openingBalanceDate: '2026-01-01',
      status: 'active'
    }).returning();
    testAccountId = newAcc.id;

    (requireStrictWorkspaceAccess as Mock).mockResolvedValue({ 
      workspaceId: testWorkspaceId,
      session: { user: { id: testUserId } }
    });
    
    (checkRateLimit as Mock).mockResolvedValue({ success: true });
  });

  it('uploadImportAction processes a CSV correctly', async () => {
    const csvContent = `Date,Amount,Description\n2026-01-01,15.50,Test Import`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const file = new File([blob], 'test.csv', { type: 'text/csv' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('accountId', testAccountId);

    await uploadImportAction(testWorkspaceId, formData);

    const imports = await db.query.statementImport.findMany({
      where: (i, { eq }) => eq(i.workspaceId, testWorkspaceId)
    });
    
    expect(imports.length).toBe(1);
    testImportId = imports[0].id;
    
    const rows = await db.query.statementImportRow.findMany({
      where: (r, { eq }) => eq(r.statementImportId, testImportId)
    });
    
    expect(rows.length).toBe(1);
    expect(rows[0].reviewStatus).toBe('pending');
    testRowId = rows[0].id;
  });

  it('reviewRowAction commits a row', async () => {
    const formData = new FormData();
    formData.append('rowId', testRowId);
    formData.append('action', 'commit');
    formData.append('importId', testImportId);
    // categoryId omitted

    await reviewRowAction(testWorkspaceId, formData);

    const row = await db.query.statementImportRow.findFirst({
      where: (r, { eq }) => eq(r.id, testRowId)
    });

    expect(row).toBeDefined();
    expect(row?.reviewStatus).toBe('accepted'); // or whatever commit sets it to
  });
});
