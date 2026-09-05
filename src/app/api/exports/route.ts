import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { 
  generateCsvExport, 
  generateXlsxExport, 
  generatePdfExport, 
  generateFullBackup,
  getExportTransactions
} from '@/lib/services/exports';
import { z } from 'zod';

const querySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  format: z.enum(['csv', 'xlsx', 'pdf', 'json']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const data = querySchema.parse({
      workspaceId: url.searchParams.get('workspaceId') || undefined,
      format: url.searchParams.get('format'),
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
    });

    const authContext = await requireWorkspaceAccess(data.workspaceId);
    const workspaceId = authContext.workspaceId;

    const timeFilter = {
      startDate: data.startDate ? new Date(data.startDate) : new Date('2000-01-01'),
      endDate: data.endDate ? new Date(data.endDate) : new Date('2100-01-01'),
    };

    if (data.format === 'csv' || data.format === 'xlsx' || data.format === 'pdf') {
      const txs = await getExportTransactions(workspaceId, timeFilter);
      if (txs.length === 0) {
        return NextResponse.json(
          { error: 'No transactions to export for the selected period.' },
          { status: 400 }
        );
      }
    }

    if (data.format === 'csv') {
      const csv = await generateCsvExport(workspaceId, timeFilter);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="export-${Date.now()}.csv"`,
        },
      });
    }

    if (data.format === 'xlsx') {
      const buffer = await generateXlsxExport(workspaceId, timeFilter);
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="export-${Date.now()}.xlsx"`,
        },
      });
    }

    if (data.format === 'pdf') {
      const buffer = await generatePdfExport(workspaceId, timeFilter);
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="export-${Date.now()}.pdf"`,
        },
      });
    }

    if (data.format === 'json') {
      const backup = await generateFullBackup(workspaceId);
      // We convert bigints to strings so JSON.stringify works via NextResponse.json
      const jsonStr = JSON.stringify(backup, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      );
      
      return new NextResponse(jsonStr, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="backup-${Date.now()}.json"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Failed to generate export:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
