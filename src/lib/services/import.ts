import { db } from '../db';
import { statementImport, statementImportRow, transaction, financialAccount } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createExpense, createIncome } from './transaction';

/**
 * Tokenize a CSV line respecting quotes and escaped quotes.
 */
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Parses diverse real-world bank date formats to standard PostgreSQL YYYY-MM-DD.
 */
function parseDateToIso(str: string): string | null {
  if (!str) return null;
  const trimmed = str.trim().replace(/^["']|["']$/g, '');

  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (slashMatch) {
    const part1 = parseInt(slashMatch[1], 10);
    const part2 = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    if (year < 100) year += 2000;

    let day = part1;
    let month = part2;
    // If part1 > 12, part1 must be day and part2 is month
    if (part1 <= 12 && part2 > 12) {
      month = part1;
      day = part2;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Parses textual date formats like "15 Jan 2024", "Jan 15, 2024"
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Cleans string numbers into float: removes currency symbols, commas, accounting brackets.
 */
function cleanAmount(raw: string): number {
  if (!raw) return 0;
  let str = raw.trim().replace(/^["']|["']$/g, '');
  let isNegative = false;

  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1);
  }
  if (str.startsWith('-') || str.includes('DR') || str.includes('dr')) {
    isNegative = true;
    str = str.replace(/DR|dr/g, '');
  }

  // Remove commas, currency symbols like $, ₹, €, £, Rs
  str = str.replace(/[^0-9.-]/g, '');
  const val = parseFloat(str);
  if (isNaN(val)) return 0;

  return isNegative ? -Math.abs(val) : val;
}

export async function processCsvImport(
  csvContent: string,
  filename: string,
  workspaceId: string,
  accountId: string,
  userId: string
) {
  // Strip BOM and normalize line breaks
  const cleanedContent = csvContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = cleanedContent.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  if (rawLines.length < 2) {
    throw new Error('CSV must have at least a header and one row of transactions.');
  }

  // Scan the first 10 rows to locate the header row
  let headerRowIdx = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
    const candidate = parseCsvLine(rawLines[i]).map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim()
    );
    const hasDate = candidate.some((h) => /date|txn|time|posting|booking/.test(h));
    const hasAmt = candidate.some((h) =>
      /amount|amt|debit|credit|withdrawal|deposit|balance|dr|cr|paid/.test(h)
    );
    if (hasDate && hasAmt) {
      headerRowIdx = i;
      headers = candidate;
      break;
    }
  }

  // Fallback to row 0 if detection didn't match keywords
  if (headerRowIdx === -1) {
    headerRowIdx = 0;
    headers = parseCsvLine(rawLines[0]).map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim()
    );
  }

  // Fuzzy match column indices
  let dateIdx = headers.findIndex((h) => /date|txn date|transaction date|value date|posting date|booking date/.test(h));
  if (dateIdx === -1) dateIdx = headers.findIndex((h) => /date|time/.test(h));

  let descIdx = headers.findIndex((h) => /description|narration|particulars|details|memo|merchant|payee|remarks|note/.test(h));
  if (descIdx === -1) descIdx = headers.findIndex((h) => /name|title/.test(h));

  // Check for separate Debit / Credit columns vs single Amount column
  let amtIdx = headers.findIndex((h) => /^(amount|amt|net amount|transaction amount)$/.test(h));
  if (amtIdx === -1) amtIdx = headers.findIndex((h) => /amount|amt/.test(h) && !/debit|credit/.test(h));

  const debitIdx = headers.findIndex((h) => /debit|withdrawal|paid out|dr|expense|outflow/.test(h));
  const creditIdx = headers.findIndex((h) => /credit|deposit|paid in|cr|income|inflow/.test(h));

  if (dateIdx === -1) {
    throw new Error("Could not find a 'Date' column in your CSV statement header.");
  }
  if (amtIdx === -1 && debitIdx === -1 && creditIdx === -1) {
    throw new Error("Could not find an 'Amount' or 'Debit/Credit' column in your CSV statement header.");
  }

  return await db.transaction(async (tx) => {
    const account = await tx.query.financialAccount.findFirst({
      where: eq(financialAccount.id, accountId),
    });
    const currency = account?.currency || 'USD';

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

    for (let i = headerRowIdx + 1; i < rawLines.length; i++) {
      const parts = parseCsvLine(rawLines[i]);
      if (parts.length < Math.min(dateIdx, descIdx, amtIdx) + 1) continue;

      const rawDate = parts[dateIdx];
      const isoDate = parseDateToIso(rawDate);
      if (!isoDate) continue; // Skip non-transaction rows (subtotals, footers, notes)

      const desc = descIdx !== -1 && parts[descIdx] ? parts[descIdx] : 'Imported Transaction';

      let amountFloat = 0;
      let direction: 'debit' | 'credit' = 'debit';

      if (debitIdx !== -1 && creditIdx !== -1) {
        const debitVal = cleanAmount(parts[debitIdx]);
        const creditVal = cleanAmount(parts[creditIdx]);

        if (creditVal > 0) {
          amountFloat = creditVal;
          direction = 'credit';
        } else if (debitVal > 0) {
          amountFloat = debitVal;
          direction = 'debit';
        } else {
          continue;
        }
      } else if (amtIdx !== -1) {
        amountFloat = cleanAmount(parts[amtIdx]);
        if (amountFloat === 0) continue;
        direction = amountFloat < 0 ? 'debit' : 'credit';
      } else if (debitIdx !== -1) {
        amountFloat = cleanAmount(parts[debitIdx]);
        direction = 'debit';
      } else if (creditIdx !== -1) {
        amountFloat = cleanAmount(parts[creditIdx]);
        direction = 'credit';
      }

      const amountMinor = BigInt(Math.round(Math.abs(amountFloat) * 100));
      if (amountMinor === 0n) continue;

      rowsToInsert.push({
        statementImportId: importRecord.id,
        rowNumber: rowNum++,
        transactionDate: isoDate,
        description: desc,
        amountMinor,
        currency,
        direction,
        duplicateStatus: 'none' as const,
        reviewStatus: 'pending' as const,
      });
    }

    if (rowsToInsert.length === 0) {
      throw new Error(
        'No valid transaction rows found in the CSV. Please ensure dates and amounts are properly formatted.'
      );
    }

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
