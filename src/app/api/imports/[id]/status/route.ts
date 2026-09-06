import { NextResponse } from "next/server";
import { requireStrictWorkspaceAccess } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { statementImport, statementImportRow } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspaceId");

    const imp = await db.query.statementImport.findFirst({
      where: eq(statementImport.id, id),
    });

    if (!imp) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    if (workspaceId) {
      await requireStrictWorkspaceAccess(workspaceId);
    }

    const rows = await db
      .select({
        reviewStatus: statementImportRow.reviewStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(statementImportRow)
      .where(eq(statementImportRow.statementImportId, id))
      .groupBy(statementImportRow.reviewStatus);

    let totalRows = 0;
    let pendingRows = 0;
    let acceptedRows = 0;
    let rejectedRows = 0;

    for (const r of rows) {
      totalRows += r.count;
      if (r.reviewStatus === "pending") pendingRows = r.count;
      else if (r.reviewStatus === "accepted") acceptedRows = r.count;
      else if (r.reviewStatus === "rejected") rejectedRows = r.count;
    }

    return NextResponse.json({
      id: imp.id,
      status: imp.status,
      filename: imp.originalFilename,
      totalRows,
      pendingRows,
      acceptedRows,
      rejectedRows,
    });
  } catch (err: unknown) {
    console.error("Failed to get import status:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
