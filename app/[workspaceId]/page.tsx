import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { readSessionToken } from "@/lib/session";
import { get, type WorkspaceDetail } from "@/lib/api";
import AddMemberForm from "./AddMemberForm";

export const dynamic = "force-dynamic";

export default async function WorkspaceDetailPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const token = readSessionToken();
  if (!token) redirect("/login");

  let workspace: WorkspaceDetail | null = null;
  let error: string | null = null;
  try {
    workspace = await get<WorkspaceDetail>(`/v1/workspaces/${params.workspaceId}`, token);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("404")) notFound();
    error = msg;
  }

  return (
    <div className="container">
      <div className="stack" style={{ gap: 24 }}>
        <div>
          <Link href="/dashboard/workspaces" className="nav-link">← All workspaces</Link>
        </div>

        {error && <div className="card"><div className="error">{error}</div></div>}

        {workspace && (
          <>
            <div className="between">
              <div>
                <div className="kicker">Workspace</div>
                <h1 style={{ marginTop: 8 }}>{workspace.name}</h1>
              </div>
              {workspace.isDefault && <span className="pill">default</span>}
            </div>

            <div className="card">
              <h2 style={{ marginBottom: 16 }}>Details</h2>
              <table>
                <tbody>
                  <tr><th style={{ width: 200 }}>Workspace ID</th><td><code style={{ fontSize: 13 }}>{workspace.workspaceId}</code></td></tr>
                  <tr><th>Company ID</th><td><code style={{ fontSize: 13 }}>{workspace.companyId}</code></td></tr>
                  <tr><th>Slug</th><td>{workspace.slug || "—"}</td></tr>
                  <tr><th>Created by</th><td><code style={{ fontSize: 13 }}>{workspace.createdBy}</code></td></tr>
                </tbody>
              </table>
            </div>

            <AddMemberForm workspaceId={workspace.workspaceId} />
          </>
        )}
      </div>
    </div>
  );
}
