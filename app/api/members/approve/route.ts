/**
 * BFF — approve a pending workspace membership request.
 * POST /api/members/approve?workspaceId=...&userId=...&role=member|admin
 */
import { NextResponse } from "next/server";
import { post } from "@/lib/api";
import { requireToken } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const token = requireToken();
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspaceId");
    const userId = url.searchParams.get("userId");
    if (!workspaceId || !userId) {
      return NextResponse.json({ error: "workspaceId and userId required" }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const out = await post(
      `/v1/workspaces/${workspaceId}/members/${userId}/approve`,
      token,
      body,
    );
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
