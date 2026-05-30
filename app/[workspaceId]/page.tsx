import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { readSessionToken, decodeClaims } from "@/lib/session";
import { get, type WorkspaceDetail } from "@/lib/api";
import { Chrome } from "@/lib/Chrome";
import AddMemberForm from "./AddMemberForm";

export const dynamic = "force-dynamic";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default async function WorkspaceDetailPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const token = readSessionToken();
  if (!token) redirect("/login");
  const claims = decodeClaims(token);
  if (!claims) redirect("/login");

  let workspace: WorkspaceDetail | null = null;
  let error: string | null = null;
  try {
    workspace = await get<WorkspaceDetail>(`/v1/workspaces/${params.workspaceId}`, token);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("404")) notFound();
    error = msg;
  }

  const isActive = workspace?.workspaceId === claims.workspaceId;

  return (
    <Chrome
      active="workspaces"
      pageTitle={workspace?.name || "Workspace"}
      user={{ userId: claims.userId, displayName: claims.displayName, handle: claims.email }}
      activeCompany={claims.companyName ? { name: claims.companyName } : null}
    >
      <div className="breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="sep">›</span>
        <Link href="/dashboard/workspaces">Workspaces</Link>
        <span className="sep">›</span>
        <span className="current">{workspace?.name || "—"}</span>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ color: "#b42318" }}>{error}</div>
        </div>
      )}

      {workspace && (
        <>
          <div className="profile-card">
            <div className="profile-avatar">{initials(workspace.name)}</div>
            <div className="profile-info">
              <div className="profile-name-row">
                <h1>{workspace.name}</h1>
                {isActive ? (
                  <span className="pill green"><span className="dot" /> Active</span>
                ) : workspace.isDefault ? (
                  <span className="pill cyan"><span className="dot" /> Default</span>
                ) : (
                  <span className="pill"><span className="dot" /> Available</span>
                )}
              </div>
              <div className="profile-handle">
                <code>{workspace.workspaceId}</code>
              </div>
              <div className="profile-meta">
                {workspace.slug && <span>slug: <strong>{workspace.slug}</strong></span>}
                <span>company: <code>{workspace.companyId}</code></span>
              </div>
            </div>
            <div className="profile-actions">
              <button className="btn btn-ghost btn-sm" type="button" disabled>Edit</button>
            </div>
          </div>

          <div className="kicker">Workspace details</div>
          <div className="card">
            <table className="kv-table">
              <tbody>
                <tr><th>Workspace ID</th><td><code>{workspace.workspaceId}</code></td></tr>
                <tr><th>Company ID</th><td><code>{workspace.companyId}</code></td></tr>
                <tr><th>Slug</th><td>{workspace.slug || "—"}</td></tr>
                <tr><th>Created by</th><td><code>{workspace.createdBy}</code></td></tr>
              </tbody>
            </table>
          </div>

          <div className="kicker">Attached members</div>
          <AddMemberForm workspaceId={workspace.workspaceId} />
        </>
      )}
    </Chrome>
  );
}
