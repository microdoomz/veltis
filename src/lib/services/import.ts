import { db } from '../db';
import { statementImport, statementImportRow, transaction } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createExpense, createIncome } from './transaction';

export async function processCsvImport(
  csvContent: string,
  filename: string,
  workspaceId: string,
  accountId: string,
  userId: string
) {
  const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
  
  if (lines.length < 2) throw new Error("CSV must have at least a header and one row");
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Basic validation
  const requiredHeaders = ['date', 'description', 'amount'];
  if (!requiredHeaders.every(h => headers.includes(h))) {
    throw new Error("CSV must contain 'date', 'description', and 'amount' headers");
  }

  const dateIdx = headers.indexOf('date');
  const descIdx = headers.indexOf('description');
  const amtIdx = headers.indexOf('amount');

  return await db.transaction(async (tx) => {
    const [importRecord] = await tx.insert(statementImport).values({
      workspaceId,
      financialAccountId: accountId,
      fileObjectKey: `imports/${workspaceId}/${Date.now()}_${filename}`,
      originalFilename: filename,
      mimeType: 'text/csv',
      fileSize: BigInt(csvContent.length),
      status: 'review',
      createdByUserId: userId,
    }).returning();

    const rowsToInsert = [];
    let rowNum = 1;

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length < headers.length) continue;

      const dateStr = parts[dateIdx]; // expects YYYY-MM-DD
      const desc = parts[descIdx];
      const amountStr = parts[amtIdx];
      
      const amountFloat = parseFloat(amountStr);
      if (isNaN(amountFloat)) continue;

      const amountMinor = BigInt(Math.round(Math.abs(amountFloat) * 100));
      const direction = amountFloat < 0 ? 'debit' : 'credit';

      rowsToInsert.push({
        statementImportId: importRecord.id,
        rowNumber: rowNum++,
        transactionDate: dateStr,
        description: desc,
        amountMinor,
        currency: 'USD', // simplified
        direction: direction as 'debit' | 'credit',
        duplicateStatus: 'none' as const,
        reviewStatus: 'pending' as const,
      });
    }

    if (rowsToInsert.length > 0) {
      await tx.insert(statementImportRow).values(rowsToInsert);
    }

    // Basic duplicate detection against existing transactions
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
    with: {
      // Need manual join or relational query for rows, let's just query separately
    }
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
    where: eq(statementImportRow.id, rowId)
  });

  if (!row || row.reviewStatus !== 'pending') throw new Error("Row not found or already reviewed");

  const importRecord = await db.query.statementImport.findFirst({
    where: eq(statementImport.id, row.statementImportId)
  });

  if (!importRecord || importRecord.workspaceId !== workspaceId) throw new Error("Import not found");

  // Create transaction safely
  let txnId: string;
  if (row.direction === 'debit') { // expense
    const txn = await createExpense({
      workspaceId,
      amountMinor: row.amountMinor,
      currency: row.currency,
      transactionDate: new Date(row.transactionDate),
      accountId: importRecord.financialAccountId,
      categoryId,
      merchantName: row.description,
      source: 'import',
      createdByUserId: userId
    });
    txnId = txn.id;
  } else { // income
    const txn = await createIncome({
      workspaceId,
      amountMinor: row.amountMinor,
      currency: row.currency,
      transactionDate: new Date(row.transactionDate),
      accountId: importRecord.financialAccountId,
      categoryId,
      description: row.description,
      source: 'import',
      createdByUserId: userId
    });
    txnId = txn.id;
  }

  // Mark row as committed
  await db.update(statementImportRow).set({
    reviewStatus: 'accepted',
    committedTransactionId: txnId,
  }).where(eq(statementImportRow.id, rowId));
}

export async function rejectImportRow(rowId: string, workspaceId: string) {
  const row = await db.query.statementImportRow.findFirst({
    where: eq(statementImportRow.id, rowId)
  });
  if (!row) return;

  const importRecord = await db.query.statementImport.findFirst({
    where: eq(statementImport.id, row.statementImportId)
  });
  if (!importRecord || importRecord.workspaceId !== workspaceId) return;

  await db.update(statementImportRow).set({
    reviewStatus: 'rejected',
  }).where(eq(statementImportRow.id, rowId));
}
