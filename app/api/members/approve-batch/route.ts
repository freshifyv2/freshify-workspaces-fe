/**
 * BFF — batch-approve pending workspace membership requests.
 * POST /api/members/approve-batch
 * Body: { workspaceId: string, userIds: string[], role?: "admin" | "member" }
 *
 * The backend has no native batch endpoint, so we fan out to the existing
 * single-user approve endpoint sequentially. We keep per-user results so the
 * UI can surface partial failures rather than aborting the whole batch on
 * the first error. Idempotent at the backend level (approving an already-
 * approved member returns 200 today).
 */
import { NextResponse } from "next/server";
import { post } from "@/lib/api";
import { requireToken } from "@/lib/session";

interface BatchBody {
  workspaceId?: string;
  userIds?: string[];
  role?: "admin" | "member";
}

const MAX_BATCH = 100;

export async function POST(req: Request) {
  try {
    const token = requireToken();
    const body = (await req.json().catch(() => ({}))) as BatchBody;
    const workspaceId = body.workspaceId;
    const userIds = Array.isArray(body.userIds) ? body.userIds.filter((x) => typeof x === "string" && x.length > 0) : [];
    const role: "admin" | "member" = body.role === "admin" ? "admin" : "member";
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }
    if (userIds.length === 0) {
      return NextResponse.json({ error: "userIds required" }, { status: 400 });
    }
    if (userIds.length > MAX_BATCH) {
      return NextResponse.json({ error: `batch size exceeds ${MAX_BATCH}` }, { status: 400 });
    }

    const results: Array<{ userId: string; ok: boolean; error?: string }> = [];
    let okCount = 0;
    let errCount = 0;
    for (const userId of userIds) {
      try {
        await post(
          `/v1/workspaces/${workspaceId}/members/${userId}/approve`,
          token,
          { role },
        );
        results.push({ userId, ok: true });
        okCount++;
      } catch (err) {
        results.push({ userId, ok: false, error: (err as Error).message });
        errCount++;
      }
    }

    return NextResponse.json({
      workspaceId,
      requested: userIds.length,
      approved: okCount,
      failed: errCount,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
