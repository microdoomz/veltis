import { db } from '../db';
import { 
  transaction, 
  category, 
  financialAccount,
  budget,
  investmentPosition,
  receivable,
  liability,
  recurringItem
} from '../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import * as ExcelJS from 'exceljs';
import { TimeFilter } from './analytics';

// Formatter helper for minor units
function formatAmount(amountMinor: bigint, currency: string) {
  return (Number(amountMinor) / 100).toFixed(2) + ' ' + currency;
}

export async function getExportTransactions(workspaceId: string, timeFilter: TimeFilter) {
  const startStr = timeFilter.startDate.toISOString().split('T')[0];
  const endStr = timeFilter.endDate.toISOString().split('T')[0];

  const results = await db
    .select({
      id: transaction.id,
      date: transaction.transactionDate,
      type: transaction.transactionType,
      amount: transaction.amountMinor,
      currency: transaction.currency,
      description: transaction.description,
      merchant: transaction.merchantName,
      categoryName: category.name,
      status: transaction.status,
      source: transaction.source,
    })
    .from(transaction)
    .leftJoin(category, eq(transaction.categoryId, category.id))
    .where(
      and(
        eq(transaction.workspaceId, workspaceId),
        gte(transaction.transactionDate, startStr),
        lte(transaction.transactionDate, endStr)
      )
    )
    .orderBy(desc(transaction.transactionDate));
    
  return results;
}

export async function generateCsvExport(workspaceId: string, timeFilter: TimeFilter): Promise<string> {
  const txs = await getExportTransactions(workspaceId, timeFilter);
  
  const header = ['Date', 'Type', 'Amount', 'Currency', 'Category', 'Merchant', 'Description', 'Status', 'Source'];
  const rows = txs.map(tx => [
    tx.date,
    tx.type,
    (Number(tx.amount) / 100).toFixed(2),
    tx.currency,
    tx.categoryName || '',
    tx.merchant || '',
    tx.description || '',
    tx.status,
    tx.source
  ]);

  // Basic CSV escaping
  const escapeCsv = (str: string | null | undefined) => {
    if (str == null) return '';
    const s = String(str);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    header.join(','),
    ...rows.map(row => row.map(escapeCsv).join(','))
  ];

  return lines.join('\n');
}

export async function generateXlsxExport(workspaceId: string, timeFilter: TimeFilter): Promise<Buffer> {
  const txs = await getExportTransactions(workspaceId, timeFilter);
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Veltis';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Transactions');
  
  sheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Merchant', key: 'merchant', width: 20 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Source', key: 'source', width: 15 }
  ];

  txs.forEach(tx => {
    sheet.addRow({
      date: tx.date,
      type: tx.type,
      amount: Number(tx.amount) / 100,
      currency: tx.currency,
      category: tx.categoryName || '',
      merchant: tx.merchant || '',
      description: tx.description || '',
      status: tx.status,
      source: tx.source
    });
  });

  sheet.getRow(1).font = { bold: true };
  
  const buffer = await workbook.xlsx.writeBuffer() as unknown as Buffer;
  return buffer;
}

export async function generatePdfExport(workspaceId: string, timeFilter: TimeFilter): Promise<Buffer> {
  const txs = await getExportTransactions(workspaceId, timeFilter);
  
  const fonts = {
    Roboto: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const PdfPrinter = require('pdfmake') as any;
  const printer = new PdfPrinter(fonts);

  const tableBody = [
    [
      { text: 'Date', style: 'tableHeader' },
      { text: 'Type', style: 'tableHeader' },
      { text: 'Category', style: 'tableHeader' },
      { text: 'Merchant', style: 'tableHeader' },
      { text: 'Amount', style: 'tableHeader' }
    ]
  ];

  // Limit to 500 rows for PDF to avoid memory/size issues, or just include all.
  const displayTxs = txs.slice(0, 500);

  displayTxs.forEach(tx => {
    tableBody.push([
      { text: tx.date, style: '' },
      { text: tx.type, style: '' },
      { text: tx.categoryName || '-', style: '' },
      { text: tx.merchant || '-', style: '' },
      { text: formatAmount(tx.amount, tx.currency), style: '' }
    ]);
  });

  const docDefinition = {
    content: [
      { text: 'Veltis Financial Report', style: 'header' },
      { text: `Date Range: ${timeFilter.startDate.toISOString().split('T')[0]} to ${timeFilter.endDate.toISOString().split('T')[0]}`, style: 'subheader' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { text: `Total Transactions: ${txs.length}`, margin: [0, 0, 0, 10] as any },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', '*', '*', 'auto'],
          body: tableBody
        }
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        margin: [0, 0, 0, 10] as any
      },
      subheader: {
        fontSize: 12,
        bold: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        margin: [0, 10, 0, 5] as any
      },
      tableHeader: {
        bold: true,
        fontSize: 11,
        color: 'black'
      }
    },
    defaultStyle: {
      font: 'Roboto'
    }
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Uint8Array[] = [];
      pdfDoc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', (err: Error) => reject(err));
      pdfDoc.end();
    } catch (e) {
      reject(e);
    }
  });
}

export async function generateFullBackup(workspaceId: string) {
  // Extract major tables for backup
  const [
    accounts,
    txs,
    categories,
    budgets,
    investments,
    receivables,
    liabilities,
    recurrings
  ] = await Promise.all([
    db.select().from(financialAccount).where(eq(financialAccount.workspaceId, workspaceId)),
    db.select().from(transaction).where(eq(transaction.workspaceId, workspaceId)),
    db.select().from(category).where(eq(category.workspaceId, workspaceId)),
    db.select().from(budget).where(eq(budget.workspaceId, workspaceId)),
    db.select().from(investmentPosition).where(eq(investmentPosition.workspaceId, workspaceId)),
    db.select().from(receivable).where(eq(receivable.workspaceId, workspaceId)),
    db.select().from(liability).where(eq(liability.workspaceId, workspaceId)),
    db.select().from(recurringItem).where(eq(recurringItem.workspaceId, workspaceId))
  ]);

  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    workspaceId,
    data: {
      financialAccounts: accounts,
      transactions: txs,
      categories,
      budgets,
      investmentPositions: investments,
      receivables,
      liabilities,
      recurringItems: recurrings
    }
  };
}
