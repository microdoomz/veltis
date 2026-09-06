import ExcelJS from 'exceljs';
import { PDFParse } from 'pdf-parse';

export interface ParsedStatementRow {
  rowNumber: number;
  date: string; // YYYY-MM-DD
  description: string;
  amountMinor: bigint;
  direction: 'credit' | 'debit';
  rawPayload: Record<string, unknown>;
}

const MONTH_NAMES: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

/**
 * Robust date parser supporting Indian, British, and ISO formats.
 * For ambiguity (e.g. 05/08/2026), treats first number as Day and second as Month.
 */
export function parseDateToIso(str: string): string | null {
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

    // Prioritize DD/MM/YYYY as standard for Indian and UK statements
    let day = part1;
    let month = part2;
    if (part1 > 12) {
      day = part1;
      month = part2;
    } else if (part2 > 12) {
      month = part1;
      day = part2;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Fallback to JS standard Date parsing
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

export function cleanAmount(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (!raw) return 0;
  let str = String(raw).trim().replace(/^["']|["']$/g, '');
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
  str = str.replace(/[^0-9.-]/g, '');
  const val = parseFloat(str);
  if (isNaN(val)) return 0;

  return isNegative ? -Math.abs(val) : val;
}

function detectDelimiter(text: string): string {
  const sample = text.slice(0, 8000);
  const commas = (sample.match(/,/g) || []).length;
  const semicolons = (sample.match(/;/g) || []).length;
  const tabs = (sample.match(/\t/g) || []).length;

  if (semicolons > commas && semicolons > tabs) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}

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

/**
 * Parses a 2D matrix of strings/numbers (from CSV, Excel, etc.) into structured rows.
 */
export function parseTableRows(rows: string[][]): ParsedStatementRow[] {
  if (rows.length < 2) {
    throw new Error('Statement must contain at least a header row and one row of transactions.');
  }

  // Find header row by scanning first 50 rows
  let headerRowIdx = -1;
  let headers: string[] = [];
  const maxScan = Math.min(rows.length, 50);

  for (let i = 0; i < maxScan; i++) {
    const candidate = rows[i].map(h => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim());
    const hasDate = candidate.some(h => /\b(date|txn|posting|booking|value)\b/i.test(h));
    const hasAmt = candidate.some(h => /\b(amount|amt|debit|credit|dr|cr|withdrawal|deposit|paid|balance)\b/i.test(h));

    if (hasDate && hasAmt) {
      headerRowIdx = i;
      headers = candidate;
      break;
    }
  }

  if (headerRowIdx === -1) {
    headerRowIdx = 0;
    headers = rows[0].map(h => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim());
  }

  let dateIdx = headers.findIndex(h => /^(date|txn\s*date|trans\s*date|tran\s*date|transaction\s*date|value\s*date|posting\s*date|booking\s*date|post\s*date)$/i.test(h));
  if (dateIdx === -1) dateIdx = headers.findIndex(h => /date|time/i.test(h));

  let descIdx = headers.findIndex(h => /description|narration|particulars|details|memo|merchant|payee|remarks|note|transaction\s*details/i.test(h));
  if (descIdx === -1) descIdx = headers.findIndex(h => /name|title/i.test(h));

  const typeIdx = headers.findIndex(h => /^(cr\s*[\/\-]?\s*dr|dr\s*[\/\-]?\s*cr|type|txn\s*type|transaction\s*type|type\s*of\s*transaction|indicator|dr\s*cr|cr\s*dr)$/i.test(h) || /cr\s*[\/\-]?\s*dr|dr\s*[\/\-]?\s*cr/i.test(h));

  let amtIdx = headers.findIndex(h => /^(amount|amt|net\s*amount|transaction\s*amount)$/i.test(h) || (/amount|amt/i.test(h) && !/balance/i.test(h) && !/debit|credit/i.test(h)));

  const debitIdx = headers.findIndex((h, idx) => idx !== typeIdx && (
    /^(debit|withdrawal|withdrawals|paid\s*out|dr|expense|outflow|debit\s*amt|withdrawal\s*amt|debit\s*amount|withdrawal\s*amount)$/i.test(h) ||
    (/\b(debit|withdrawal)\b/i.test(h) && !/credit|deposit/i.test(h)) ||
    (/\bwithdrawal\b/i.test(h))
  ));

  const creditIdx = headers.findIndex((h, idx) => idx !== typeIdx && (
    /^(credit|deposit|deposits|paid\s*in|cr|income|inflow|credit\s*amt|deposit\s*amt|credit\s*amount|deposit\s*amount)$/i.test(h) ||
    (/\b(credit|deposit)\b/i.test(h) && !/debit|withdrawal/i.test(h)) ||
    (/\bdeposit\b/i.test(h))
  ));

  if (dateIdx === -1) {
    throw new Error("Could not find a 'Date' column in your statement header.");
  }
  if (amtIdx === -1 && debitIdx === -1 && creditIdx === -1) {
    throw new Error("Could not find an 'Amount' or 'Debit/Credit' column in your statement header.");
  }

  const parsedRows: ParsedStatementRow[] = [];
  let rowCount = 0;

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every(c => !String(c).trim())) continue;

    const rawDate = row[dateIdx] ? String(row[dateIdx]).trim() : '';
    const isoDate = parseDateToIso(rawDate);
    if (!isoDate) continue; // skip footer or non-data lines

    const description = descIdx !== -1 && row[descIdx] ? String(row[descIdx]).trim() : 'Statement Transaction';

    let amount = 0;
    let direction: 'credit' | 'debit' = 'debit';

    if (debitIdx !== -1 || creditIdx !== -1) {
      const debitRaw = debitIdx !== -1 && row[debitIdx] ? String(row[debitIdx]).trim() : '';
      const creditRaw = creditIdx !== -1 && row[creditIdx] ? String(row[creditIdx]).trim() : '';

      const debitVal = Math.abs(cleanAmount(debitRaw));
      const creditVal = Math.abs(cleanAmount(creditRaw));

      if (creditVal > 0 && debitVal === 0) {
        amount = creditVal;
        direction = 'credit';
      } else if (debitVal > 0 && creditVal === 0) {
        amount = debitVal;
        direction = 'debit';
      } else if (creditVal > 0 && debitVal > 0) {
        amount = debitVal;
        direction = 'debit';
      } else if (amtIdx !== -1) {
        const netAmt = cleanAmount(row[amtIdx]);
        amount = Math.abs(netAmt);
        direction = netAmt < 0 ? 'debit' : 'credit';
      }
    } else if (amtIdx !== -1) {
      const netAmt = cleanAmount(row[amtIdx]);
      amount = Math.abs(netAmt);

      if (typeIdx !== -1 && row[typeIdx]) {
        const typeVal = String(row[typeIdx]).trim().toLowerCase();
        if (/^(cr|credit|deposit|inflow|c)$/i.test(typeVal)) {
          direction = 'credit';
        } else {
          direction = 'debit';
        }
      } else {
        direction = netAmt < 0 ? 'debit' : 'credit';
      }
    }

    if (amount <= 0) continue;

    const amountMinor = BigInt(Math.round(amount * 100));
    rowCount++;

    const rawPayload: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      rawPayload[h || `col_${idx}`] = row[idx];
    });

    parsedRows.push({
      rowNumber: rowCount,
      date: isoDate,
      description,
      amountMinor,
      direction,
      rawPayload,
    });
  }

  if (parsedRows.length === 0) {
    throw new Error('No valid transaction rows could be extracted from this statement.');
  }

  return parsedRows;
}

/**
 * Parses JSON bank statements:
 * Supports arrays: [{ date: "...", description: "...", amount: 100, type: "debit" }]
 * or nested: { transactions: [...] } or { data: [...] } or { rows: [...] }
 */
export function parseJsonStatement(jsonStr: string): ParsedStatementRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Invalid JSON format in uploaded statement.');
  }

  let list: unknown[] = [];
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const candidateKey = Object.keys(obj).find(k => Array.isArray(obj[k]));
    if (candidateKey) {
      list = obj[candidateKey] as unknown[];
    }
  }

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('JSON statement must contain an array of transaction objects.');
  }

  const parsedRows: ParsedStatementRow[] = [];
  let rowCount = 0;

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;

    // Find date
    const dateKey = Object.keys(rec).find(k => /date|time|txn_date/i.test(k));
    const rawDate = dateKey ? String(rec[dateKey]) : '';
    const isoDate = parseDateToIso(rawDate);
    if (!isoDate) continue;

    // Find description
    const descKey = Object.keys(rec).find(k => /desc|narration|particulars|merchant|payee|details/i.test(k));
    const description = descKey ? String(rec[descKey]).trim() : 'JSON Transaction';

    // Find amount and direction
    let amount = 0;
    let direction: 'credit' | 'debit' = 'debit';

    const amtKey = Object.keys(rec).find(k => /^(amount|amt|value)$/i.test(k));
    const debitKey = Object.keys(rec).find(k => /debit|withdrawal/i.test(k));
    const creditKey = Object.keys(rec).find(k => /credit|deposit/i.test(k));
    const typeKey = Object.keys(rec).find(k => /^(type|txn_type|direction|cr_dr)$/i.test(k));

    if (debitKey && cleanAmount(rec[debitKey]) > 0) {
      amount = Math.abs(cleanAmount(rec[debitKey]));
      direction = 'debit';
    } else if (creditKey && cleanAmount(rec[creditKey]) > 0) {
      amount = Math.abs(cleanAmount(rec[creditKey]));
      direction = 'credit';
    } else if (amtKey) {
      const rawVal = cleanAmount(rec[amtKey]);
      amount = Math.abs(rawVal);
      if (typeKey) {
        const tVal = String(rec[typeKey]).toLowerCase();
        direction = /cr|credit|income|deposit/i.test(tVal) ? 'credit' : 'debit';
      } else {
        direction = rawVal < 0 ? 'debit' : 'credit';
      }
    }

    if (amount <= 0) continue;

    rowCount++;
    parsedRows.push({
      rowNumber: rowCount,
      date: isoDate,
      description,
      amountMinor: BigInt(Math.round(amount * 100)),
      direction,
      rawPayload: rec,
    });
  }

  if (parsedRows.length === 0) {
    throw new Error('No valid transaction records found in JSON statement.');
  }

  return parsedRows;
}

/**
 * Parses Excel files (.xlsx, .xls) using ExcelJS
 */
export async function parseExcelStatement(buffer: Buffer): Promise<ParsedStatementRow[]> {
  const workbook = new ExcelJS.Workbook();
  // @ts-expect-error - ExcelJS accepts Buffer
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Uploaded Excel file contains no worksheets.');
  }

  const tableRows: string[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values = (row.values as unknown[]);
    // ExcelJS row.values is 1-indexed, values[0] is undefined
    const rowValues = Array.isArray(values) ? values.slice(1) : [];
    tableRows.push(
      rowValues.map(v => {
        if (v instanceof Date) {
          return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
        }
        if (v !== null && typeof v === 'object' && 'text' in v) {
          return String((v as { text: string }).text);
        }
        return v !== null && v !== undefined ? String(v) : '';
      })
    );
  });

  return parseTableRows(tableRows);
}

/**
 * Parses PDF bank statements with heuristics for Top 15 Indian Banks:
 * SBI, HDFC, ICICI, Kotak Mahindra, Axis, Bank of Baroda, PNB, Canara, Union Bank, IndusInd, Federal Bank, Yes Bank, IDBI, Standard Chartered, HSBC.
 */
export async function parsePdfStatement(buffer: Buffer): Promise<ParsedStatementRow[]> {
  const parser = new PDFParse({ data: buffer });
  const pdfData = await parser.getText();
  const text = pdfData.text || '';
  if (!text.trim()) {
    throw new Error('Could not extract text from this PDF statement. The PDF might be password-protected or scanned as an image.');
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const parsedRows: ParsedStatementRow[] = [];
  let rowCount = 0;

  // Indian bank transaction line regex patterns:
  // Usually starts with Date (DD/MM/YYYY, DD-MM-YYYY, DD-MMM-YYYY, etc.)
  // followed by Narration/Description, followed by amounts (Debit, Credit, Balance)
  const dateLeadingRegex = /^(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{1,2}[\s/\-.][a-zA-Z]{3,9}[\s/\-.]\d{2,4})\s+(.+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(dateLeadingRegex);
    if (!match) continue;

    const rawDate = match[1];
    const rest = match[2];
    const isoDate = parseDateToIso(rawDate);
    if (!isoDate) continue;

    // Extract amounts from the tail of the line (e.g. 100.00 0.00 4500.50 or 500.00(Dr) or 500.00 Cr)
    // Find all numbers with optional commas and decimals
    const tokens = rest.split(/\s+/);
    const numericIndices: number[] = [];

    tokens.forEach((t, idx) => {
      const cleaned = t.replace(/[,\s₹$]/g, '').replace(/\((dr|cr)\)/i, '');
      if (/^-?\d+(\.\d{1,2})?$/.test(cleaned) || /^\d+(\.\d{1,2})?(cr|dr)$/i.test(cleaned)) {
        numericIndices.push(idx);
      }
    });

    if (numericIndices.length === 0) continue;

    // Everything before the first numeric token is considered description
    const firstNumIdx = numericIndices[0];
    const descTokens = tokens.slice(0, firstNumIdx);
    const description = descTokens.join(' ').trim() || 'Bank Transaction';

    // Heuristics for Debit / Credit amounts:
    const numTokens = tokens.slice(firstNumIdx);
    let amount = 0;
    let direction: 'credit' | 'debit' = 'debit';

    const lineText = line.toLowerCase();
    const hasCrWord = /\b(cr|credit|deposit)\b/i.test(lineText);
    const hasDrWord = /\b(dr|debit|withdrawal)\b/i.test(lineText);

    if (numTokens.length === 1) {
      const val = cleanAmount(numTokens[0]);
      amount = Math.abs(val);
      direction = hasCrWord && !hasDrWord ? 'credit' : (val < 0 ? 'debit' : (hasDrWord ? 'debit' : 'credit'));
    } else if (numTokens.length >= 2) {
      // Typically: [Debit, Credit, Balance] or [Withdrawal, Deposit, Balance] or [Amount, Dr/Cr, Balance]
      const val1 = cleanAmount(numTokens[0]);
      const val2 = cleanAmount(numTokens[1]);

      if (val1 > 0 && val2 === 0) {
        amount = val1;
        direction = 'debit';
      } else if (val2 > 0 && val1 === 0) {
        amount = val2;
        direction = 'credit';
      } else if (hasCrWord && !hasDrWord) {
        amount = val1 || val2;
        direction = 'credit';
      } else {
        amount = val1 || val2;
        direction = 'debit';
      }
    }

    if (amount <= 0) continue;

    rowCount++;
    parsedRows.push({
      rowNumber: rowCount,
      date: isoDate,
      description,
      amountMinor: BigInt(Math.round(amount * 100)),
      direction,
      rawPayload: { rawLine: line },
    });
  }

  if (parsedRows.length === 0) {
    throw new Error('No transaction rows matched standard bank statement patterns in this PDF. We recommend exporting as CSV or Excel for maximum accuracy.');
  }

  return parsedRows;
}

/**
 * Universal dispatcher for multi-format bank statement parsing.
 */
export async function parseStatementFile(
  buffer: Buffer,
  filename: string
): Promise<ParsedStatementRow[]> {
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith('.json')) {
    const jsonStr = buffer.toString('utf-8');
    return parseJsonStatement(jsonStr);
  }

  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    return await parseExcelStatement(buffer);
  }

  if (lowerName.endsWith('.pdf')) {
    return await parsePdfStatement(buffer);
  }

  // Default to CSV
  const csvContent = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(csvContent);
  const rawLines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const tableRows = rawLines.map(l => parseCsvLine(l, delimiter));
  return parseTableRows(tableRows);
}
