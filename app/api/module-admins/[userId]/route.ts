/**
 * DELETE proxy → workspaces-be /v1/modules/workspaces/admins/:userId
 *
 * Sprint 3 / 3.9 Phase B. Operator-only mutation (BE enforces).
 * Idempotent — returns { removed: boolean }.
 */
import { NextResponse } from "next/server";
import { del } from "@/lib/api";
import { requireToken } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: { userId: string } },
) {
  try {
    const token = requireToken();
    const out = await del(
      `/v1/modules/workspaces/admins/${encodeURIComponent(params.userId)}`,
      token,
    );
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
