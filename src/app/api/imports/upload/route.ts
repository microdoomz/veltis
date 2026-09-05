import { NextResponse } from "next/server";
import { requireStrictWorkspaceAccess } from "@/lib/auth/guards";
import { processCsvImport } from "@/lib/services/import";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const workspaceId = formData.get("workspaceId") as string;
    const accountId = formData.get("accountId") as string;
    const file = formData.get("file") as File;
    const isReferenceOnly = formData.get("isReferenceOnly") === "true";

    if (!workspaceId || !accountId || !file) {
      return NextResponse.json(
        { error: "Destination account and CSV statement are required." },
        { status: 400 }
      );
    }

    const authContext = await requireStrictWorkspaceAccess(workspaceId);

    const rateLimit = await checkRateLimit(`import:user:${authContext.session.user.id}`, 15, 60);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    const text = await file.text();
    const importRecord = await processCsvImport(
      text,
      file.name,
      authContext.workspaceId,
      accountId,
      authContext.session.user.id,
      isReferenceOnly
    );

    return NextResponse.json({
      success: true,
      importId: importRecord.id,
      totalRows: text.split('\n').filter(Boolean).length,
    });
  } catch (err: unknown) {
    console.error("Statement upload error:", err);
    let message = err instanceof Error ? err.message : "Failed to parse CSV statement";
    if (message.includes("Failed query") || message.includes("syntax error")) {
      message = "Failed to process statement database records.";
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
