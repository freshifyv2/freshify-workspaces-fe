/**
 * GET proxy → workspaces-be /v1/modules/workspaces/info
 *
 * Sprint 4 / C6. Public read for any authenticated session.
 */
import { NextResponse } from "next/server";
import { get } from "@/lib/api";
import { requireToken } from "@/lib/session";

export async function GET() {
  try {
    const token = requireToken();
    const out = await get("/v1/modules/workspaces/info", token);
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
