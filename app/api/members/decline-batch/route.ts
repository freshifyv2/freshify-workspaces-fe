/**
 * BFF — batch-decline pending workspace membership requests.
 * POST /api/members/decline-batch
 * Body: { workspaceId: string, userIds: string[] }
 *
 * Fans out to the existing single-user decline endpoint. Same per-user-result
 * shape as approve-batch so the UI can show partial outcomes.
 */
import { NextResponse } from "next/server";
import { post } from "@/lib/api";
import { requireToken } from "@/lib/session";

interface BatchBody {
  workspaceId?: string;
  userIds?: string[];
}

const MAX_BATCH = 100;

export async function POST(req: Request) {
  try {
    const token = requireToken();
    const body = (await req.json().catch(() => ({}))) as BatchBody;
    const workspaceId = body.workspaceId;
    const userIds = Array.isArray(body.userIds) ? body.userIds.filter((x) => typeof x === "string" && x.length > 0) : [];
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
          `/v1/workspaces/${workspaceId}/members/${userId}/decline`,
          token,
          {},
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
      declined: okCount,
      failed: errCount,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
