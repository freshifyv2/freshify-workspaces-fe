/**
 * WSM Module Settings — combined Roles + Registry route.
 *
 * Operator-only single page consolidating the workspace.v1 role catalog
 * and the registry of users with access to this workspace.
 */
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { readSessionToken, decodeClaims } from "@/lib/session";
import {
  get,
  getServiceJson,
  USERS_URL,
  type WorkspaceDetail,
} from "@/lib/api";
import { Chrome } from "@/lib/Chrome";
import { loadChromeContext } from "@/lib/chromeContext";
import { OperatorOnly403 } from "@/lib/OperatorOnly";

export const dynamic = "force-dynamic";

interface RoleEntry {
  key: string;
  name: string;
  rank: number;
  capabilities: string[];
  isAutoAssigned: "owner_on_create" | "invite_default" | null;
}
interface RoleCatalog {
  catalogId: string;
  scope: "company" | "workspace" | "module";
  moduleKey: string | null;
  version: number;
  roles: RoleEntry[];
  updatedAt: string;
}
interface AdminUserView {
  userId: string;
  displayName: string | null;
  email: string;
  title: string | null;
  status: "active" | "pending" | "inactive";
  assignedWorkspaces: Array<{
    workspaceId: string;
    name: string;
    companyId?: string;
    role?: "admin" | "member";
  }>;
}

const ALL_CAPS = [
  "read",
  "write",
  "manage_users",
  "manage_settings",
  "manage_roles",
  "transfer_ownership",
  "delete",
] as const;
const CAP_LABEL: Record<string, string> = {
  read: "Read",
  write: "Write",
  manage_users: "Manage users",
  manage_settings: "Manage settings",
  manage_roles: "Manage roles",
  transfer_ownership: "Transfer ownership",
  delete: "Delete",
};

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

export default async function WorkspaceModuleSettingsPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const token = readSessionToken();
  if (!token) redirect("/login");
  const claims = decodeClaims(token);
  if (!claims) redirect("/login");
  const isOperator = Boolean(claims.operator);

  const ctx = await loadChromeContext();
  const displayName = claims.displayName || claims.email || "User";
  const handle = handleFromEmail(claims.email);
  if (!isOperator) {
    return (
      <OperatorOnly403
        active="workspaces"
        pageTitle="Workspace — Module Settings"
        user={{ userId: claims.userId, displayName, handle, isOperator: false }}
        activeCompany={ctx?.activeCompany ?? (claims.companyName ? { name: claims.companyName } : null)}
        detail="Workspace module settings"
      />
    );
  }

  let workspace: WorkspaceDetail | null = null;
  let catalog: RoleCatalog | null = null;
  let allUsers: AdminUserView[] = [];
  let error: string | null = null;

  try {
    workspace = await get<WorkspaceDetail>(`/v1/workspaces/${params.workspaceId}`, token);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("404")) notFound();
    error = msg;
  }
  try {
    catalog = await getServiceJson<RoleCatalog>(USERS_URL, "/v1/role-catalogs/workspace", token);
  } catch (e) {
    error = (e as Error).message;
  }
  try {
    const r = await getServiceJson<{ users: AdminUserView[] }>(USERS_URL, "/v1/admin/users", token);
    allUsers = r.users || [];
  } catch (e) {
    error = (e as Error).message;
  }

  const registry = (allUsers || [])
    .map((u) => {
      const ws = (u.assignedWorkspaces || []).find((w) => w.workspaceId === params.workspaceId);
      if (!ws) return null;
      return {
        userId: u.userId,
        displayName: u.displayName,
        email: u.email,
        title: u.title,
        status: u.status,
        role: ws.role,
      };
    })
    .filter(Boolean) as Array<{
      userId: string;
      displayName: string | null;
      email: string;
      title: string | null;
      status: "active" | "pending" | "inactive";
      role?: "admin" | "member";
    }>;

  return (
    <Chrome
      active="workspaces"
      pageTitle="Workspace Settings"
      user={{ userId: claims.userId, displayName, handle, isOperator }}
      activeCompany={ctx?.activeCompany ?? null}
      tenantOptions={ctx?.tenantOptions ?? []}
    >
      <div className="page-breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="page-breadcrumb-sep">›</span>
        <Link href="/dashboard/workspaces">Workspaces</Link>
        <span className="page-breadcrumb-sep">›</span>
        {workspace && (
          <>
            <Link href={`/dashboard/workspaces/${workspace.workspaceId}`}>{workspace.name}</Link>
            <span className="page-breadcrumb-sep">›</span>
          </>
        )}
        <span className="page-breadcrumb-current">Settings</span>
      </div>

      {error && (
        <div className="warning-banner" style={{ marginBottom: 16 }}>
          <span className="warning-banner-icon" aria-hidden>⚠</span>
          {error}
        </div>
      )}

      {workspace && (
        <div className="hero-card">
          <div className="hero-card-left">
            <div className="hero-card-text">
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span className="data-table-id">{shortId(workspace.workspaceId)}</span>
                <span className="pill is-violet">Settings</span>
              </div>
              <h1 className="hero-card-title">{workspace.name}</h1>
              <p className="hero-card-subtitle">
                Workspace role catalog and full member registry. Operator-only.
              </p>
            </div>
          </div>
          <div className="hero-card-actions">
            <Link href={`/dashboard/workspaces/${workspace.workspaceId}`} className="btn btn-secondary">
              Back to detail
            </Link>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <a href="#roles" className="filter-pill is-active">Roles</a>
        <a href="#registry" className="filter-pill">Registry</a>
      </div>

      {/* Roles */}
      <div id="roles" className="section-card" style={{ marginBottom: 20 }}>
        <div className="section-card-header">
          <h3 className="section-card-title">Role Tiers</h3>
          {catalog ? (
            <span className="user-cell-handle">{catalog.catalogId} · v{catalog.version}</span>
          ) : null}
        </div>
        {catalog ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th style={{ width: 80 }}>Rank</th>
                  <th>Auto-assigned</th>
                  {ALL_CAPS.map((c) => (
                    <th key={c} style={{ textAlign: "center", whiteSpace: "nowrap" }}>{CAP_LABEL[c]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...catalog.roles]
                  .sort((a, b) => b.rank - a.rank)
                  .map((r) => (
                    <tr key={r.key}>
                      <td>
                        <div className="user-cell">
                          <span className="user-cell-text">
                            <span className="user-cell-name" style={{ fontWeight: 600 }}>{r.name}</span>
                            <div className="user-cell-handle">{r.key}</div>
                          </span>
                        </div>
                      </td>
                      <td><span className="pill is-gray">{r.rank}</span></td>
                      <td>
                        {r.isAutoAssigned === "owner_on_create" ? (
                          <span className="pill is-violet">Owner on create</span>
                        ) : r.isAutoAssigned === "invite_default" ? (
                          <span className="pill is-pink">Invite default</span>
                        ) : (
                          <span className="user-cell-handle">—</span>
                        )}
                      </td>
                      {ALL_CAPS.map((c) => (
                        <td key={c} style={{ textAlign: "center" }}>
                          {r.capabilities.includes(c) ? (
                            <span className="status-pill is-active" style={{ display: "inline-block" }}>✓</span>
                          ) : (
                            <span className="user-cell-handle">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "var(--muted)", padding: 16 }}>Catalog unavailable.</p>
        )}
      </div>

      {/* Registry */}
      <div id="registry" className="section-card">
        <div className="section-card-header">
          <h3 className="section-card-title">Workspace Registry</h3>
          <span className="user-cell-handle">{registry.length} members</span>
        </div>
        {registry.length === 0 ? (
          <p style={{ color: "var(--muted)", padding: 16 }}>No members yet.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Title</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {registry.map((u) => (
                  <tr key={u.userId}>
                    <td>
                      <div className="user-cell">
                        <span className="avatar-circle">{initials(u.displayName || u.email || "?")}</span>
                        <div className="user-cell-text">
                          <span className="user-cell-name">{u.displayName || u.email || "(unnamed)"}</span>
                          <div className="user-cell-handle">@{handleFromEmail(u.email)}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.title || <span className="user-cell-handle">—</span>}</td>
                    <td>
                      <span className={`pill ${u.role === "admin" ? "is-violet" : "is-gray"}`}>{u.role || "member"}</span>
                    </td>
                    <td>
                      <span className={`status-pill is-${u.status}`}>{u.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Chrome>
  );
}
