import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { readSessionToken, decodeClaims } from "@/lib/session";
import { get, getServiceJson, USERS_URL, type WorkspaceDetail } from "@/lib/api";
import { Chrome } from "@/lib/Chrome";
import { loadChromeContext } from "@/lib/chromeContext";
import AddMemberForm from "./AddMemberForm";
import PendingMembers, { type PendingRow } from "./PendingMembers";

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

export default async function WorkspaceDetailPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const token = readSessionToken();
  if (!token) redirect("/login");
  const claims = decodeClaims(token);
  if (!claims) redirect("/login");

  const isOperator = Boolean(claims.operator);
  const displayName = claims.displayName || claims.email || "User";
  const handle = handleFromEmail(claims.email);

  let workspace: WorkspaceDetail | null = null;
  let error: string | null = null;
  try {
    workspace = await get<WorkspaceDetail>(`/v1/workspaces/${params.workspaceId}`, token);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("404")) notFound();
    error = msg;
  }

  // Deploy 4 — pull workspace registry to surface pending requests.
  let pending: PendingRow[] = [];
  if (workspace && isOperator) {
    try {
      const reg = await get<{ rows: Array<{ userId: string; status: string; joinedAt?: string | null }> }>(
        `/v1/workspaces/${params.workspaceId}/registry`,
        token,
      );
      const pendingIds = (reg.rows || []).filter((r) => r.status === "pending");
      if (pendingIds.length > 0) {
        try {
          const ulist = await getServiceJson<{ users: Array<{ userId: string; displayName: string | null; email: string }> }>(
            USERS_URL,
            "/v1/admin/users",
            token,
          );
          const byId = new Map(ulist.users.map((u) => [u.userId, u]));
          pending = pendingIds.map((r) => {
            const u = byId.get(r.userId);
            return {
              userId: r.userId,
              displayName: u?.displayName ?? null,
              email: u?.email ?? null,
              requestedAt: r.joinedAt ?? null,
            };
          });
        } catch {
          pending = pendingIds.map((r) => ({ userId: r.userId, requestedAt: r.joinedAt ?? null }));
        }
      }
    } catch {
      // Non-fatal — pending section just stays empty.
    }
  }

  const isActive = workspace?.workspaceId === claims.workspaceId;
  const ctx = await loadChromeContext();

  return (
    <Chrome
      active="workspaces"
      pageTitle="Workspace Detail"
      user={{ userId: claims.userId, displayName, handle, isOperator }}
      activeCompany={ctx?.activeCompany ?? (claims.companyName ? { name: claims.companyName } : null)}
      tenantOptions={ctx?.tenantOptions ?? []}
    >
      <div className="page-breadcrumb">
        <Link href="/dashboard">Dashboard</Link>
        <span className="page-breadcrumb-sep">›</span>
        <Link href="/dashboard/workspaces">Workspaces</Link>
        <span className="page-breadcrumb-sep">›</span>
        <span className="page-breadcrumb-current">{workspace?.name || "—"}</span>
      </div>

      {error && (
        <div className="warning-banner" style={{ marginBottom: 16 }}>
          <span className="warning-banner-icon" aria-hidden>⚠</span>
          {error}
        </div>
      )}

      {workspace && (
        <>
          {/* Hero card */}
          <div className="hero-card">
            <div className="hero-card-left">
              <span className="avatar-circle is-lg" aria-hidden style={{ background: "var(--violet-soft)", color: "var(--violet)" }}>
                {initials(workspace.name)}
              </span>
              <div className="hero-card-text">
                <span className="status-pill is-active hero-card-status">
                  {isActive ? "Active session" : workspace.isDefault ? "Default" : "Available"}
                </span>
                <h1 className="hero-card-title">{workspace.name}</h1>
                <p className="hero-card-subtitle">
                  {workspace.isDefault ? "Default workspace" : "Custom workspace"} in {claims.companyName || "company"}
                </p>
              </div>
            </div>
            <div className="hero-card-actions">
              {isOperator && (
                <Link
                  href={`/dashboard/workspaces/${workspace.workspaceId}/module-settings`}
                  className="btn btn-secondary"
                >
                  <span aria-hidden>⚙</span> Module Settings
                </Link>
              )}
              {isOperator && (
                <Link
                  href={`/dashboard/workspaces/${workspace.workspaceId}/edit`}
                  className="btn btn-primary"
                >
                  Edit Workspace
                </Link>
              )}
            </div>
          </div>

          {/* Primary Information */}
          <div className="section-card">
            <div className="section-card-header">
              <h3 className="section-card-title">Primary Information</h3>
            </div>
            <div className="field-grid">
              <div className="field">
                <label className="field-label">WORKSPACE ID</label>
                <input className="field-input is-readonly" value={workspace.workspaceId} readOnly />
              </div>
              <div className="field">
                <label className="field-label">SLUG</label>
                <input className="field-input is-readonly" value={workspace.slug || "—"} readOnly />
              </div>
              <div className="field">
                <label className="field-label">COMPANY ID</label>
                <input className="field-input is-readonly" value={workspace.companyId} readOnly />
              </div>
              <div className="field">
                <label className="field-label">CREATED BY</label>
                <input className="field-input is-readonly" value={workspace.createdBy} readOnly />
              </div>
            </div>
          </div>

          {/* Pending requests (operator-only) */}
          {isOperator && (
            <div className="section-card">
              <div className="section-card-header">
                <span className="section-card-icon" aria-hidden>◐</span>
                <h3 className="section-card-title">Pending Join Requests</h3>
                {pending.length > 0 ? (
                  <span className="pill is-violet" style={{ marginLeft: "auto" }}>
                    {pending.length} pending
                  </span>
                ) : null}
              </div>
              <PendingMembers workspaceId={workspace.workspaceId} rows={pending} />
            </div>
          )}

          {/* Members */}
          <div className="section-card">
            <div className="section-card-header">
              <span className="section-card-icon" aria-hidden>◐</span>
              <h3 className="section-card-title">Attached Members</h3>
            </div>
            <AddMemberForm workspaceId={workspace.workspaceId} />
          </div>
        </>
      )}
    </Chrome>
  );
}
