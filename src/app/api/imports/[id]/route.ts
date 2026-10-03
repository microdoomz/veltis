import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/guards";
import { getImportWithRows } from "@/lib/services/import";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authContext = await requireWorkspaceAccess();
    const importRecord = await getImportWithRows(id, authContext.workspaceId);

    if (!importRecord) {
      return NextResponse.json({ error: "Statement import not found" }, { status: 404 });
    }

    return NextResponse.json({
      import: {
        id: importRecord.id,
        originalFilename: importRecord.originalFilename,
        status: importRecord.status,
        financialAccountId: importRecord.financialAccountId,
        createdAt: importRecord.createdAt instanceof Date ? importRecord.createdAt.toISOString() : String(importRecord.createdAt),
        rows: (importRecord.rows || []).map((row) => ({
          id: row.id,
          rowNumber: row.rowNumber,
          transactionDate: row.transactionDate,
          amountMinor: Number(row.amountMinor),
          amount: Number(row.amountMinor) / 100,
          currency: row.currency,
          description: row.description,
          direction: row.direction,
          reviewStatus: row.reviewStatus,
          duplicateStatus: row.duplicateStatus,
          committedTransactionId: row.committedTransactionId,
        })),
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/imports/[id] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load statement rows" },
      { status: 500 }
    );
  }
}
