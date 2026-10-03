import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/guards";
import { getActiveShortcutTokens, createShortcutToken, revokeShortcutToken } from "@/lib/services/shortcut";

export async function GET() {
  try {
    const authContext = await requireWorkspaceAccess();
    const tokens = await getActiveShortcutTokens(authContext.workspaceId);

    return NextResponse.json({
      tokens: tokens.map((t) => ({
        id: t.id,
        name: t.name,
        createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
        lastUsedAt: t.lastUsedAt instanceof Date ? t.lastUsedAt.toISOString() : t.lastUsedAt ? String(t.lastUsedAt) : null,
      })),
    });
  } catch (err: unknown) {
    console.error("GET /api/shortcuts/tokens error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load shortcut tokens" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authContext = await requireWorkspaceAccess();
    const body = await req.json().catch(() => ({}));
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Token name is required" }, { status: 400 });
    }

    const { record, rawToken } = await createShortcutToken({
      workspaceId: authContext.workspaceId,
      userId: authContext.session.user.id,
      name: name.trim(),
    });

    return NextResponse.json({
      success: true,
      token: {
        id: record.id,
        name: record.name,
        rawToken, // Provided once on creation
        createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt),
      },
    });
  } catch (err: unknown) {
    console.error("POST /api/shortcuts/tokens error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create shortcut token" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const authContext = await requireWorkspaceAccess();
    const { searchParams } = new URL(req.url);
    let tokenId = searchParams.get("tokenId");

    if (!tokenId) {
      const body = await req.json().catch(() => ({}));
      tokenId = body.tokenId;
    }

    if (!tokenId) {
      return NextResponse.json({ error: "tokenId is required" }, { status: 400 });
    }

    await revokeShortcutToken(authContext.workspaceId, tokenId);
    return NextResponse.json({ success: true, message: "Shortcut token revoked" });
  } catch (err: unknown) {
    console.error("DELETE /api/shortcuts/tokens error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to revoke shortcut token" },
      { status: 500 }
    );
  }
}
