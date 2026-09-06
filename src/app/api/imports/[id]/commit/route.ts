import { NextResponse } from "next/server";
import { requireStrictWorkspaceAccess } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { statementImport, statementImportRow } from "@/lib/db/schema";
import { bulkReviewImportRows } from "@/lib/services/import";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { workspaceId, rowIds, action } = body;

    if (!workspaceId || !action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const authContext = await requireStrictWorkspaceAccess(workspaceId);

    const imp = await db.query.statementImport.findFirst({
      where: and(
        eq(statementImport.id, id),
        eq(statementImport.workspaceId, authContext.workspaceId)
      ),
    });

    if (!imp) {
      return NextResponse.json({ error: "Statement import not found" }, { status: 404 });
    }

    // Set import status to processing during bulk work
    await db.update(statementImport)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(statementImport.id, id));

    // Target rows: either explicit IDs or all pending rows
    let targetRowIds = rowIds as string[] | undefined;
    if (!targetRowIds || targetRowIds.length === 0) {
      const pendingRows = await db.query.statementImportRow.findMany({
        where: and(
          eq(statementImportRow.statementImportId, id),
          eq(statementImportRow.reviewStatus, 'pending')
        ),
        columns: { id: true },
      });
      targetRowIds = pendingRows.map(r => r.id);
    }

    // Execute bulk review
    await bulkReviewImportRows(
      authContext.workspaceId,
      authContext.session.user.id,
      targetRowIds,
      action as 'accept' | 'reject'
    );

    // Check if any pending rows remain
    const remainingPending = await db.query.statementImportRow.findFirst({
      where: and(
        eq(statementImportRow.statementImportId, id),
        eq(statementImportRow.reviewStatus, 'pending')
      ),
    });

    const finalStatus = remainingPending ? 'review' : 'confirmed';
    await db.update(statementImport)
      .set({ status: finalStatus, updatedAt: new Date() })
      .where(eq(statementImport.id, id));

    revalidatePath(`/imports/${id}`);
    revalidatePath('/transactions');
    revalidatePath('/imports');

    return NextResponse.json({
      success: true,
      processed: targetRowIds.length,
      finalStatus,
    });
  } catch (err: unknown) {
    console.error("Bulk commit route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process bulk review" },
      { status: 500 }
    );
  }
}
