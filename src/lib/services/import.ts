import { db } from '../db';
import { statementImport, statementImportRow, transaction, financialAccount } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createExpense, createIncome } from './transaction';

/**
 * Detect CSV delimiter: comma, semicolon, or tab.
 */
function detectDelimiter(text: string): string {
  const sample = text.slice(0, 8000);
  const commas = (sample.match(/,/g) || []).length;
  const semicolons = (sample.match(/;/g) || []).length;
  const tabs = (sample.match(/\t/g) || []).length;

  if (semicolons > commas && semicolons > tabs) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}

/**
 * Tokenize a CSV line respecting quotes and escaped quotes.
 */
function parseCsvLine(text: string, delimiter: string = ','): string[] {
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
    } else if (char === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

const MONTH_NAMES: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

/**
 * Parses diverse real-world bank date formats to standard PostgreSQL YYYY-MM-DD.
 */
function parseDateToIso(str: string): string | null {
  if (!str) return null;
  const trimmed = str.trim().replace(/^["']|["']$/g, '');
  if (!trimmed || trimmed.length < 6) return null;

  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD-MMM-YYYY or DD/MMM/YYYY or DD MMM YYYY (e.g. 15 Jan 2024, 01-FEB-2024)
  const textMonthMatch = trimmed.match(/^(\d{1,2})[\s/\-.]?([a-zA-Z]{3,9})[\s/\-.]?(\d{2,4})$/);
  if (textMonthMatch) {
    const day = textMonthMatch[1].padStart(2, '0');
    const monthKey = textMonthMatch[2].toLowerCase();
    const month = MONTH_NAMES[monthKey];
    let year = parseInt(textMonthMatch[3], 10);
    if (year < 100) year += 2000;
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY or DD.MM.YYYY
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

  // Parses JavaScript standard textual dates
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
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
  if (!str) return 0;

  let isNegative = false;

  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1);
  }
  if (str.startsWith('-') || /\bdr\b/i.test(str)) {
    isNegative = true;
  }
  if (/\bcr\b/i.test(str)) {
    isNegative = false;
  }

  str = str.replace(/dr|cr/gi, '');
  // Remove commas, currency symbols like $, ₹, €, £, Rs, spaces
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
  // Strip UTF-8 BOM, normalize newlines
  const cleanedContent = csvContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = cleanedContent.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  if (rawLines.length < 2) {
    throw new Error('CSV must have at least a header and one row of transactions.');
  }

  // Sniff delimiter
  const delimiter = detectDelimiter(cleanedContent);

  // Scan up to 50 rows to bypass bank preambles (HDFC, SBI, ICICI, etc.)
  let headerRowIdx = -1;
  let headers: string[] = [];

  const maxHeaderScan = Math.min(rawLines.length, 50);
  for (let i = 0; i < maxHeaderScan; i++) {
    const tokens = parseCsvLine(rawLines[i], delimiter);
    if (tokens.length < 2) continue;

    const candidate = tokens.map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim()
    );

    const hasDate = candidate.some((h) =>
      /^(date|txn\s*date|trans\s*date|tran\s*date|transaction\s*date|value\s*date|posting\s*date|booking\s*date|post\s*date|time)$/i.test(h) ||
      /\b(date|txn|time|posting|booking)\b/i.test(h)
    );

    const hasAmt = candidate.some((h) =>
      /^(amount|amt|net\s*amount|debit|credit|dr|cr|withdrawal|deposit|withdrawals|deposits|paid\s*out|paid\s*in|inflow|outflow|balance)$/i.test(h) ||
      /\b(amount|amt|debit|credit|dr|cr|withdrawal|deposit|paid)\b/i.test(h)
    );

    if (hasDate && hasAmt) {
      headerRowIdx = i;
      headers = candidate;
      break;
    }
  }

  // Fallback to row 0 if no explicit header keyword detected
  if (headerRowIdx === -1) {
    headerRowIdx = 0;
    headers = parseCsvLine(rawLines[0], delimiter).map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim()
    );
  }

  // Fuzzy match column indices
  let dateIdx = headers.findIndex((h) =>
    /^(date|txn\s*date|trans\s*date|tran\s*date|transaction\s*date|value\s*date|posting\s*date|booking\s*date|post\s*date)$/i.test(h)
  );
  if (dateIdx === -1) dateIdx = headers.findIndex((h) => /date|time/i.test(h));

  let descIdx = headers.findIndex((h) =>
    /description|narration|particulars|details|memo|merchant|payee|remarks|note|transaction\s*details/i.test(h)
  );
  if (descIdx === -1) descIdx = headers.findIndex((h) => /name|title/i.test(h));

  // Check for explicit Dr/Cr indicator column first
  const typeIdx = headers.findIndex((h) =>
    /^(cr\s*[\/\-]?\s*dr|dr\s*[\/\-]?\s*cr|type|txn\s*type|transaction\s*type|type\s*of\s*transaction|indicator|dr\s*cr|cr\s*dr)$/i.test(h) ||
    /cr\s*[\/\-]?\s*dr|dr\s*[\/\-]?\s*cr/i.test(h)
  );

  // Check for separate Debit / Credit columns vs single Amount column
  let amtIdx = headers.findIndex((h) =>
    /^(amount|amt|net\s*amount|transaction\s*amount)$/i.test(h) ||
    (/amount|amt/i.test(h) && !/balance/i.test(h) && !/debit|credit/i.test(h))
  );

  const debitIdx = headers.findIndex((h, idx) =>
    idx !== typeIdx && (
      /^(debit|withdrawal|withdrawals|paid\s*out|dr|expense|outflow|debit\s*amt|withdrawal\s*amt|debit\s*amount|withdrawal\s*amount)$/i.test(h) ||
      (/\b(debit|withdrawal)\b/i.test(h) && !/credit|deposit/i.test(h)) ||
      (/\bwithdrawal\b/i.test(h))
    )
  );
  const creditIdx = headers.findIndex((h, idx) =>
    idx !== typeIdx && (
      /^(credit|deposit|deposits|paid\s*in|cr|income|inflow|credit\s*amt|deposit\s*amt|credit\s*amount|deposit\s*amount)$/i.test(h) ||
      (/\b(credit|deposit)\b/i.test(h) && !/debit|withdrawal/i.test(h)) ||
      (/\bdeposit\b/i.test(h))
    )
  );

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
      const line = rawLines[i];
      if (!line) continue;

      const parts = parseCsvLine(line, delimiter);
      if (parts.length <= dateIdx) continue;

      // Skip summary or statement metadata trailer lines
      const joinedLine = parts.join(' ').toLowerCase();
      if (/(\*+\s*end|total\s*debit|total\s*credit|closing\s*balance|opening\s*balance|available\s*balance|statement\s*summary|generated\s*on)/i.test(joinedLine)) {
        continue;
      }

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
        const rawAmtCell = (parts[amtIdx] || '').trim().toLowerCase();
        amountFloat = cleanAmount(parts[amtIdx]);
        if (amountFloat === 0) continue;

        if (typeIdx !== -1 && parts[typeIdx]) {
          const typeStr = parts[typeIdx].trim().toLowerCase();
          if (typeStr.includes('cr') || typeStr === 'c' || typeStr.includes('deposit') || typeStr.includes('credit')) {
            direction = 'credit';
          } else {
            direction = 'debit';
          }
        } else if (rawAmtCell.includes('cr') || rawAmtCell.endsWith('c')) {
          direction = 'credit';
        } else if (rawAmtCell.includes('dr') || rawAmtCell.endsWith('d')) {
          direction = 'debit';
        } else {
          // Check narration and row context for top 15 bank formats (UPI/CR, UPI/DR, SALARY, INTEREST, ATM, POS, etc.)
          const descText = desc.toLowerCase();
          const rowText = parts.join(' ').toLowerCase();
          if (
            /\b(cr|credit|credited|deposit|deposited|salary|interest|refund|cashback|dividend|upi\s*[\/-]?\s*cr|neft\s*[\/-]?\s*cr|imps\s*[\/-]?\s*cr|by\s+transfer|transfer\s+from)\b/i.test(descText) ||
            /\b(cr|credit|deposit)\b/i.test(rowText)
          ) {
            direction = 'credit';
          } else if (
            amountFloat < 0 ||
            /\b(dr|debit|debited|withdrawal|withdrawn|purchase|charges|fee|tax|bill|atm|pos|swiggy|zomato|amazon|uber|ola|upi\s*[\/-]?\s*dr|neft\s*[\/-]?\s*dr|imps\s*[\/-]?\s*dr|to\s+transfer|transfer\s+to)\b/i.test(descText) ||
            /\b(dr|debit|withdrawal)\b/i.test(rowText)
          ) {
            direction = 'debit';
          } else {
            direction = amountFloat < 0 ? 'debit' : 'credit';
          }
        }
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

