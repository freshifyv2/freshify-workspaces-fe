import { redirect } from "next/navigation";
import Link from "next/link";
import { readSessionToken, decodeClaims } from "@/lib/session";
import { get, type WorkspaceListItem } from "@/lib/api";
import { Chrome } from "@/lib/Chrome";
import CreateWorkspaceForm from "./CreateWorkspaceForm";

export const dynamic = "force-dynamic";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default async function WorkspacesIndex() {
  const token = readSessionToken();
  if (!token) redirect("/login");
  const claims = decodeClaims(token);
  if (!claims) redirect("/login");

  let workspaces: WorkspaceListItem[] = [];
  let error: string | null = null;
  try {
    const out = await get<{ workspaces: WorkspaceListItem[] }>("/v1/workspaces", token);
    workspaces = out.workspaces;
  } catch (e) {
    error = (e as Error).message;
  }

  const total = workspaces.length;
  const defaults = workspaces.filter((w) => w.isDefault).length;
  const owned = workspaces.filter((w) => w.role === "admin").length;
  const other = total - defaults;

  return (
    <Chrome
      active="workspaces"
      pageTitle="Workspaces"
      user={{ userId: claims.userId, displayName: claims.displayName, handle: claims.email }}
      activeCompany={claims.companyName ? { name: claims.companyName } : null}
    >
      <div className="breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="sep">›</span>
        <span className="current">Workspaces</span>
      </div>

      <div className="page-header">
        <div className="page-header-left">
          <h1>Workspaces</h1>
          <div className="sub">
            Every company gets a default workspace. Add more for separate environments or teams.
          </div>
        </div>
        <div className="page-header-actions">
          <a href="#create-workspace" className="btn btn-primary btn-sm">+ New workspace</a>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ color: "#b42318" }}>{error}</div>
        </div>
      )}

      <div className="metrics">
        <div className="metric">
          <div className="metric-icon violet" aria-hidden>◉</div>
          <div className="metric-label">Total workspaces</div>
          <div className="metric-value">{total}</div>
          <div className="metric-trend muted">In your active company scope</div>
        </div>
        <div className="metric">
          <div className="metric-icon cyan" aria-hidden>★</div>
          <div className="metric-label">Default</div>
          <div className="metric-value">{defaults}</div>
          <div className="metric-trend muted">One per company</div>
        </div>
        <div className="metric">
          <div className="metric-icon violet" aria-hidden>◇</div>
          <div className="metric-label">Other</div>
          <div className="metric-value">{other}</div>
          <div className="metric-trend muted">Additional environments</div>
        </div>
        <div className="metric">
          <div className="metric-icon cyan" aria-hidden>◔</div>
          <div className="metric-label">Admin access</div>
          <div className="metric-value">{owned}</div>
          <div className="metric-trend muted">Workspaces you administer</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="filter-pills" role="tablist">
          <button className="filter-pill active" type="button">All <span className="count">{total}</span></button>
          <button className="filter-pill" type="button">Default <span className="count">{defaults}</span></button>
          <button className="filter-pill" type="button">Other <span className="count">{other}</span></button>
          <button className="filter-pill" type="button">Admin <span className="count">{owned}</span></button>
        </div>
        <div className="search">
          <span className="search-icon" aria-hidden>⌕</span>
          <input placeholder="Search workspaces..." disabled />
        </div>
      </div>

      <div className="table-card">
        {workspaces.length === 0 ? (
          <div className="empty-state">
            <div className="empty-glyph" aria-hidden>◉</div>
            <div className="empty-title">No workspaces yet</div>
            <div className="empty-sub">Create one below to get started.</div>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Your role</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((w) => {
                  const isActive = w.workspaceId === claims.workspaceId;
                  return (
                    <tr key={w.workspaceId}>
                      <td>
                        <div className="row-avatar">{initials(w.name)}</div>
                      </td>
                      <td>
                        <Link href={`/dashboard/workspaces/${w.workspaceId}`} className="table-primary">
                          {w.name}
                        </Link>
                        <div className="table-sub">
                          <code>{w.workspaceId}</code>
                        </div>
                      </td>
                      <td className="muted">
                        <code style={{ fontSize: 12 }}>{w.companyId}</code>
                      </td>
                      <td>{w.role}</td>
                      <td>
                        {isActive ? (
                          <span className="pill green"><span className="dot" /> Active</span>
                        ) : w.isDefault ? (
                          <span className="pill cyan"><span className="dot" /> Default</span>
                        ) : (
                          <span className="pill"><span className="dot" /> Available</span>
                        )}
                      </td>
                      <td className="table-actions">
                        <Link href={`/dashboard/workspaces/${w.workspaceId}`} className="btn btn-ghost btn-sm">
                          Open →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="load-more">
              <button type="button" className="load-more-btn" disabled>
                Load more →
              </button>
            </div>
          </>
        )}
      </div>

      <div id="create-workspace" style={{ marginTop: 32 }}>
        <CreateWorkspaceForm />
      </div>
    </Chrome>
  );
}
