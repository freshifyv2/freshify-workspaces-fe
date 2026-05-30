import { redirect } from "next/navigation";
import Link from "next/link";
import { readSessionToken, decodeClaims } from "@/lib/session";
import { get, type WorkspaceListItem } from "@/lib/api";
import { Chrome } from "@/lib/Chrome";
import CreateWorkspaceForm from "./CreateWorkspaceForm";

export const dynamic = "force-dynamic";

function handleFromEmail(email?: string | null): string {
  if (!email) return "user";
  if (email.startsWith("+")) return email.replace(/[^0-9]/g, "");
  return email.split("@")[0] || email;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function shortId(id: string): string {
  const cleaned = id.replace(/^wsp_/, "").replace(/[^A-Za-z0-9]/g, "");
  return `#W-${cleaned.slice(0, 4).toUpperCase()}`;
}

export default async function WorkspacesIndex() {
  const token = readSessionToken();
  if (!token) redirect("/login");
  const claims = decodeClaims(token);
  if (!claims) redirect("/login");

  const isOperator = Boolean(claims.operator);
  const displayName = claims.displayName || claims.email || "User";
  const handle = handleFromEmail(claims.email);

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
  const active = workspaces.filter((w) => w.workspaceId === claims.workspaceId).length;

  return (
    <Chrome
      active="workspaces"
      pageTitle="Workspaces"
      user={{ userId: claims.userId, displayName, handle, isOperator }}
      activeCompany={claims.companyName ? { name: claims.companyName } : null}
    >
      <div className="page-breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="page-breadcrumb-sep">›</span>
        <span className="page-breadcrumb-current">Workspaces</span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-header-title">Overview</h1>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary">
            <span aria-hidden>⬆</span> Export
          </button>
          <a href="#create-workspace" className="btn btn-primary">
            + New Workspace
          </a>
        </div>
      </div>

      {error && (
        <div className="warning-banner" style={{ marginBottom: 16 }}>
          <span className="warning-banner-icon" aria-hidden>⚠</span>
          {error}
        </div>
      )}

      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-card-icon" aria-hidden>◉</span>
            <span className="metric-card-badge">+{total} TOTAL</span>
          </div>
          <div className="metric-card-body">
            <p className="metric-card-label">Total Workspaces</p>
            <p className="metric-card-value">{total}</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-card-icon is-cyan" aria-hidden>★</span>
            <span className="metric-card-badge">DEFAULTS</span>
          </div>
          <div className="metric-card-body">
            <p className="metric-card-label">Default</p>
            <p className="metric-card-value">{defaults}</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-card-icon is-green" aria-hidden>✓</span>
            <span className="metric-card-badge">ACTIVE NOW</span>
          </div>
          <div className="metric-card-body">
            <p className="metric-card-label">Active</p>
            <p className="metric-card-value">{active}</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-card-icon is-amber" aria-hidden>◐</span>
            <span className="metric-card-badge is-amber">ADMIN</span>
          </div>
          <div className="metric-card-body">
            <p className="metric-card-label">Admin access</p>
            <p className="metric-card-value">{owned}</p>
          </div>
        </div>
      </div>

      <div className="list-card">
        <div className="filter-bar">
          <div className="filter-pills">
            <button type="button" className="filter-pill is-active">All</button>
            <button type="button" className="filter-pill">Default</button>
            <button type="button" className="filter-pill">Other</button>
            <button type="button" className="filter-pill">Admin</button>
          </div>
          <div className="search-input-wrap">
            <span className="search-input-icon" aria-hidden>⌕</span>
            <input
              className="search-input"
              placeholder="search by workspace name, company, role..."
              disabled
            />
          </div>
          <button type="button" className="filter-button" aria-label="Filter">⚙</button>
        </div>

        {workspaces.length === 0 ? (
          <div className="list-card-empty">
            <p style={{ margin: "24px 0 8px", fontWeight: 600, color: "var(--fg)" }}>No workspaces yet</p>
            <p style={{ margin: 0 }}>Create your first workspace below to get started.</p>
          </div>
        ) : (
          <>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Workspace</th>
                    <th>Type</th>
                    <th>Your Role</th>
                    <th>Company</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((w) => {
                    const isActive = w.workspaceId === claims.workspaceId;
                    return (
                      <tr key={w.workspaceId} className="is-clickable">
                        <td className="data-table-id">{shortId(w.workspaceId)}</td>
                        <td>
                          <div className="user-cell">
                            <span className="avatar-circle">{initials(w.name)}</span>
                            <div className="user-cell-text">
                              <Link
                                href={`/dashboard/workspaces/${w.workspaceId}`}
                                className="user-cell-name"
                                style={{ color: "var(--fg)", textDecoration: "none" }}
                              >
                                {w.name}
                              </Link>
                              <div className="user-cell-handle">{w.isDefault ? "Default workspace" : "Custom workspace"}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {w.isDefault ? (
                            <span className="pill is-violet">Default</span>
                          ) : (
                            <span className="pill is-pink">Custom</span>
                          )}
                        </td>
                        <td>
                          <span className="pill is-gray">{w.role}</span>
                        </td>
                        <td>
                          <span className="tag-chip">{claims.companyName || w.companyId}</span>
                        </td>
                        <td>
                          {isActive ? (
                            <span className="status-pill is-active">Active</span>
                          ) : (
                            <span className="status-pill is-active">Active</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="load-more">
              <a href="#" className="load-more-link" onClick={(e) => e.preventDefault()}>
                Load More →
              </a>
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
