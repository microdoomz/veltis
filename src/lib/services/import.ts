import { db } from '../db';
import { statementImport, statementImportRow, transaction, transactionLeg, financialAccount } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createExpense, createIncome } from './transaction';
import type { ParsedStatementRow } from './import-parser';

export async function processMultiFormatImport(
  buffer: Buffer,
  filename: string,
  workspaceId: string,
  accountId: string,
  userId: string,
  isReferenceOnly: boolean = false
) {
  const { parseStatementFile } = await import('./import-parser');
  const parsedRows = await parseStatementFile(buffer, filename);

  return await db.transaction(async (tx) => {
    const account = await tx.query.financialAccount.findFirst({
      where: eq(financialAccount.id, accountId),
    });
    const currency = account?.currency || 'USD';

    const prefix = isReferenceOnly ? 'ref_' : '';
    let mimeType = 'text/csv';
    const lowerName = filename.toLowerCase();
    if (lowerName.endsWith('.json')) mimeType = 'application/json';
    else if (lowerName.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (lowerName.endsWith('.xls')) mimeType = 'application/vnd.ms-excel';
    else if (lowerName.endsWith('.pdf')) mimeType = 'application/pdf';

    const [importRecord] = await tx.insert(statementImport).values({
      workspaceId,
      financialAccountId: accountId,
      fileObjectKey: `imports/${workspaceId}/${prefix}${Date.now()}_${filename}`,
      originalFilename: isReferenceOnly && !filename.startsWith('[Reference] ') ? `[Reference] ${filename}` : filename,
      mimeType,
      fileSize: BigInt(buffer.length),
      status: 'review',
      createdByUserId: userId,
    }).returning();

    const rowsToInsert = parsedRows.map((r, idx) => ({
      statementImportId: importRecord.id,
      rowNumber: idx + 1,
      transactionDate: r.date,
      description: r.description,
      amountMinor: r.amountMinor,
      currency,
      direction: r.direction,
      duplicateStatus: 'none' as const,
      reviewStatus: 'pending' as const,
    }));

    await tx.insert(statementImportRow).values(rowsToInsert);

    // Duplicate detection against existing transactions in workspace
    for (const row of rowsToInsert) {
      const possibleDups = await tx.select().from(transaction).where(
        and(
          eq(transaction.workspaceId, workspaceId),
          eq(transaction.transactionDate, row.transactionDate),
          eq(transaction.amountMinor, row.amountMinor),
          sql`${transaction.status} = 'active'`
        )
      );

      if (possibleDups.length > 0) {
        await tx.update(statementImportRow)
          .set({ duplicateStatus: 'possible_duplicate' })
          .where(
            and(
              eq(statementImportRow.statementImportId, importRecord.id),
              eq(statementImportRow.rowNumber, row.rowNumber)
            )
          );
      }
    }

    return importRecord;
  });
}

export async function processCsvImport(
  csvContent: string,
  filename: string,
  workspaceId: string,
  accountId: string,
  userId: string,
  isReferenceOnly: boolean = false
) {
  return await processMultiFormatImport(
    Buffer.from(csvContent, 'utf-8'),
    filename,
    workspaceId,
    accountId,
    userId,
    isReferenceOnly
  );
}

export async function getImports(workspaceId: string) {
  return await db.query.statementImport.findMany({
    where: eq(statementImport.workspaceId, workspaceId),
    orderBy: (imports, { desc }) => [desc(imports.createdAt)],
  });
}

export async function getImportWithRows(importId: string, workspaceId: string) {
  const importRecord = await db.query.statementImport.findFirst({
    where: and(
      eq(statementImport.id, importId),
      eq(statementImport.workspaceId, workspaceId)
    ),
  });

  if (!importRecord) return null;

  const rows = await db.query.statementImportRow.findMany({
    where: eq(statementImportRow.statementImportId, importId),
    orderBy: (r, { asc }) => [asc(r.rowNumber)],
  });

  return { ...importRecord, rows };
}

export async function commitImportRow(
  rowId: string, 
  workspaceId: string, 
  userId: string,
  categoryId?: string
) {
  const row = await db.query.statementImportRow.findFirst({
    where: eq(statementImportRow.id, rowId),
  });

  if (!row || row.reviewStatus !== 'pending') throw new Error('Row not found or already reviewed');

  const importRecord = await db.query.statementImport.findFirst({
    where: eq(statementImport.id, row.statementImportId),
  });

  if (!importRecord || importRecord.workspaceId !== workspaceId) throw new Error('Import not found');

  let txnId: string;
  if (row.direction === 'debit') {
    const txn = await createExpense({
      workspaceId,
      amountMinor: row.amountMinor,
      currency: row.currency,
      transactionDate: new Date(row.transactionDate),
      accountId: importRecord.financialAccountId,
      categoryId,
      merchantName: row.description,
      source: 'import',
      createdByUserId: userId,
    });
    txnId = txn.id;
  } else {
    const txn = await createIncome({
      workspaceId,
      amountMinor: row.amountMinor,
      currency: row.currency,
      transactionDate: new Date(row.transactionDate),
      accountId: importRecord.financialAccountId,
      categoryId,
      description: row.description,
      source: 'import',
      createdByUserId: userId,
    });
    txnId = txn.id;
  }

  await db.update(statementImportRow).set({
    reviewStatus: 'accepted',
    committedTransactionId: txnId,
  }).where(eq(statementImportRow.id, rowId));

  // If this statement import was marked as Reference-Only, ensure legs do not affect account balance
  const isReferenceOnly = importRecord.fileObjectKey.includes('/ref_') || importRecord.originalFilename.startsWith('[Reference] ');
  if (isReferenceOnly) {
    await db.update(transactionLeg).set({
      legRole: 'reference_only',
    }).where(eq(transactionLeg.transactionId, txnId));
  }
}

export async function rejectImportRow(rowId: string, workspaceId: string) {
  const row = await db.query.statementImportRow.findFirst({
    where: eq(statementImportRow.id, rowId),
  });
  if (!row) return;

  const importRecord = await db.query.statementImport.findFirst({
    where: eq(statementImport.id, row.statementImportId),
  });
  if (!importRecord || importRecord.workspaceId !== workspaceId) return;

  await db.update(statementImportRow).set({
    reviewStatus: 'rejected',
  }).where(eq(statementImportRow.id, rowId));
}

export async function deleteImportBatch(importId: string, workspaceId: string) {
  const importRecord = await db.query.statementImport.findFirst({
    where: and(
      eq(statementImport.id, importId),
      eq(statementImport.workspaceId, workspaceId)
    ),
  });
  if (!importRecord) return false;

  await db.transaction(async (tx) => {
    await tx.delete(statementImportRow).where(eq(statementImportRow.statementImportId, importId));
    await tx.delete(statementImport).where(eq(statementImport.id, importId));
  });
  return true;
}

export async function bulkReviewImportRows(
  workspaceId: string,
  userId: string,
  rowIds: string[],
  action: 'accept' | 'reject'
) {
  if (!rowIds.length) return;

  for (const rowId of rowIds) {
    if (action === 'accept') {
      try {
        await commitImportRow(rowId, workspaceId, userId);
      } catch (err) {
        console.error(`Failed to commit row ${rowId}:`, err);
      }
    } else {
      try {
        await rejectImportRow(rowId, workspaceId);
      } catch (err) {
        console.error(`Failed to reject row ${rowId}:`, err);
      }
    }
  }
}

