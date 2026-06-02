/**
 * PATCH proxy → workspaces-be /v1/admin/workspaces/:workspaceId
 * Operator-only mutation (BE enforces the operator check).
 */
import { NextResponse } from "next/server";
import { patch } from "@/lib/api";
import { requireToken } from "@/lib/session";

export async function PATCH(
  req: Request,
  { params }: { params: { workspaceId: string } },
) {
  try {
    const token = requireToken();
    const body = await req.json();
    const out = await patch(
      `/v1/admin/workspaces/${params.workspaceId}`,
      token,
      body,
    );
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
