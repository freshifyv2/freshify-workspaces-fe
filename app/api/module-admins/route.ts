/**
 * GET / POST proxy → workspaces-be /v1/modules/workspaces/admins
 *
 * Sprint 3 / 3.9 Phase B. Operator-only mutation (BE enforces).
 */
import { NextResponse } from "next/server";
import { get, post } from "@/lib/api";
import { requireToken } from "@/lib/session";

export async function GET() {
  try {
    const token = requireToken();
    const out = await get("/v1/modules/workspaces/admins", token);
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const token = requireToken();
    const body = await req.json();
    const out = await post("/v1/modules/workspaces/admins", token, body);
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
