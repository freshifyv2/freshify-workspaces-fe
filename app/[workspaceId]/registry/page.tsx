/**
 * WSM05 — Workspace Registry.
 *
 * "All users with access to this workspace." Operator-only.
 *
 * Joins the workspace's membership list (workspaces-be) with the operator
 * users directory (users-be) for display info, then renders one row per
 * member with role + status. Mirrors UCM05 layout from companies-fe.
 */
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { readSessionToken, decodeClaims } from "@/lib/session";
import {
  get,
  getServiceJson,
  USERS_URL,
  COMPANIES_URL,
  type WorkspaceDetail,
} from "@/lib/api";
import { Chrome } from "@/lib/Chrome";
import { loadChromeContext } from "@/lib/chromeContext";

export const dynamic = "force-dynamic";

interface AdminUserView {
  userId: string;
  displayName: string | null;
  email: string;
  title: string | null;
  status: "active" | "pending" | "inactive";
}

interface MemberRow {
  userId: string;
  role: string;
  joinedAt: string;
}

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

function formatRole(role: string): string {
  if (!role) return "Member";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function WorkspaceRegistryPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const token = readSessionToken();
  if (!token) redirect("/login");
  const claims = decodeClaims(token);
  if (!claims) redirect("/login");

  const isOperator = Boolean(claims.operator);
  if (!isOperator) redirect(`/dashboard/workspaces/${params.workspaceId}`);

  const ctx = await loadChromeContext();
  const displayName = claims.displayName || claims.email || "User";
  const handle = handleFromEmail(claims.email);

  let workspace: WorkspaceDetail | null = null;
  let error: string | null = null;
  try {
    workspace = await get<WorkspaceDetail>(
      `/v1/workspaces/${params.workspaceId}`,
      token,
    );
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("404")) notFound();
    error = msg;
  }

  let parentCompanyName: string | null = null;
  let members: MemberRow[] = [];
  const userById = new Map<string, AdminUserView>();

  if (workspace) {
    try {
      const m = await get<{ members: MemberRow[] }>(
        `/v1/workspaces/${workspace.workspaceId}/members`,
        token,
      );
      members = m.members ?? [];
    } catch (e) {
      error = (e as Error).message;
    }

    try {
      const u = await getServiceJson<{ users: AdminUserView[] }>(
        USERS_URL,
        "/v1/admin/users",
        token,
      );
      for (const usr of u.users ?? []) userById.set(usr.userId, usr);
    } catch {
      /* swallow — registry still renders with raw userIds */
    }

    try {
      const c = await getServiceJson<{ companyId: string; name: string }>(
        COMPANIES_URL,
        `/v1/companies/${workspace.companyId}`,
        token,
      );
      parentCompanyName = c.name;
    } catch {
      /* swallow — registry still renders without parent name */
    }
  }

  return (
    <Chrome
      active="workspaces"
      pageTitle="Workspace Registry"
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
            <Link href={`/dashboard/workspaces/${workspace.workspaceId}`}>
              {workspace.name}
            </Link>
            <span className="page-breadcrumb-sep">›</span>
          </>
        )}
        <span className="page-breadcrumb-current">Registry</span>
      </div>

      {error && (
        <div className="warning-banner" style={{ marginBottom: 16 }}>
          <span className="warning-banner-icon" aria-hidden>⚠</span>
          {error}
        </div>
      )}

      {workspace && (
        <>
          <div className="hero-card">
            <div className="hero-card-left">
              <span
                className="avatar-circle is-lg"
                aria-hidden
                style={{
                  background: "var(--violet-soft)",
                  color: "var(--violet)",
                }}
              >
                {initials(workspace.name)}
              </span>
              <div className="hero-card-text">
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span className="status-pill is-active">Active</span>
                  <span className="data-table-id">
                    {shortId(workspace.workspaceId)}
                  </span>
                  {workspace.isDefault && (
                    <span className="pill is-violet">Default</span>
                  )}
                </div>
                <h1 className="hero-card-title">{workspace.name}</h1>
                <p className="hero-card-subtitle">
                  All users with access to this workspace
                  {parentCompanyName ? ` — under ${parentCompanyName}.` : "."}
                </p>
              </div>
            </div>
            <div className="hero-card-actions">
              <Link
                href={`/dashboard/workspaces/${workspace.workspaceId}`}
                className="btn btn-secondary"
              >
                Back to detail
              </Link>
            </div>
          </div>

          <div className="list-card">
            <div className="filter-bar">
              <div className="filter-pills">
                <button type="button" className="filter-pill is-active">
                  All ({members.length})
                </button>
                <button type="button" className="filter-pill">
                  Admins (
                  {members.filter((m) =>
                    ["admin", "owner", "manager"].includes(m.role),
                  ).length}
                  )
                </button>
              </div>
              <div className="search-input-wrap">
                <span className="search-input-icon" aria-hidden>⌕</span>
                <input
                  className="search-input"
                  placeholder="search members, roles…"
                  disabled
                />
              </div>
              <button
                type="button"
                className="filter-button"
                aria-label="Filter"
              >
                ⚙
              </button>
            </div>

            {members.length === 0 ? (
              <div className="list-card-empty">
                <p style={{ margin: 0 }}>
                  No members currently have access to this workspace.
                </p>
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Title</th>
                      <th>Workspace Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th style={{ width: 80, textAlign: "right" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m, i) => {
                      const u = userById.get(m.userId);
                      const name = u?.displayName || u?.email || m.userId;
                      const statusCls =
                        u?.status === "active"
                          ? "is-active"
                          : u?.status === "pending"
                            ? "is-pending"
                            : "is-inactive";
                      const isAdmin = ["admin", "owner", "manager"].includes(
                        m.role,
                      );
                      return (
                        <tr key={`${m.userId}-${i}`}>
                          <td>
                            <div className="user-cell">
                              <span className="avatar-circle">
                                {initials(name)}
                              </span>
                              <div className="user-cell-text">
                                <span className="user-cell-name">{name}</span>
                                <div className="user-cell-handle">
                                  {m.userId}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>{u?.email ?? "—"}</td>
                          <td>{u?.title ?? "—"}</td>
                          <td>
                            <span
                              className={`pill ${
                                isAdmin ? "is-violet" : "is-gray"
                              }`}
                            >
                              {formatRole(m.role)}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${statusCls}`}>
                              {u?.status ?? "active"}
                            </span>
                          </td>
                          <td>
                            <span className="user-cell-handle">
                              {m.joinedAt
                                ? new Date(m.joinedAt).toLocaleDateString()
                                : "—"}
                            </span>
                          </td>
                          <td
                            style={{ textAlign: "right" }}
                            className="user-cell-handle"
                          >
                            —
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </Chrome>
  );
}
