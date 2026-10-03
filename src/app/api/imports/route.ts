import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/guards";
import { getImports, deleteImportBatch } from "@/lib/services/import";
import { db } from "@/lib/db";
import { statementImportRow } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const authContext = await requireWorkspaceAccess();
    const imports = await getImports(authContext.workspaceId);

    // Fetch row counts for each import
    const importsWithStats = await Promise.all(
      imports.map(async (imp) => {
        const [counts] = await db
          .select({
            totalRows: sql<number>`count(*)::int`,
            acceptedRows: sql<number>`count(case when ${statementImportRow.reviewStatus} = 'accepted' then 1 end)::int`,
            pendingRows: sql<number>`count(case when ${statementImportRow.reviewStatus} = 'pending' then 1 end)::int`,
          })
          .from(statementImportRow)
          .where(eq(statementImportRow.statementImportId, imp.id));

        return {
          id: imp.id,
          originalFilename: imp.originalFilename,
          status: imp.status,
          mimeType: imp.mimeType,
          fileSize: Number(imp.fileSize),
          totalRows: counts?.totalRows || 0,
          acceptedRows: counts?.acceptedRows || 0,
          pendingRows: counts?.pendingRows || 0,
          createdAt: imp.createdAt instanceof Date ? imp.createdAt.toISOString() : String(imp.createdAt),
        };
      })
    );

    return NextResponse.json({ imports: importsWithStats });
  } catch (err: unknown) {
    console.error("GET /api/imports error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load statement imports" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const authContext = await requireWorkspaceAccess();
    const { searchParams } = new URL(req.url);
    let importId = searchParams.get("importId");

    if (!importId) {
      const body = await req.json().catch(() => ({}));
      importId = body.importId;
    }

    if (!importId) {
      return NextResponse.json({ error: "importId is required" }, { status: 400 });
    }

    const success = await deleteImportBatch(importId, authContext.workspaceId);
    if (!success) {
      return NextResponse.json({ error: "Import batch not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Import batch deleted successfully" });
  } catch (err: unknown) {
    console.error("DELETE /api/imports error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete import batch" },
      { status: 500 }
    );
  }
}
