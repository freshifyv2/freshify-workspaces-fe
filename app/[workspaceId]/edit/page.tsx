/**
 * WSM03 — Edit Workspace.
 *
 * Operator-only. Hero + Primary Information form.
 */
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { readSessionToken, decodeClaims } from "@/lib/session";
import { get, type WorkspaceDetail } from "@/lib/api";
import { Chrome } from "@/lib/Chrome";
import { OperatorOnly403 } from "@/lib/OperatorOnly";
import { loadChromeContext } from "@/lib/chromeContext";
import EditWorkspaceForm from "./EditWorkspaceForm";

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

export default async function WorkspaceEditPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const token = readSessionToken();
  if (!token) redirect("/login");
  const claims = decodeClaims(token);
  if (!claims) redirect("/login");

  const isOperator = Boolean(claims.operator);
  if (!isOperator) {
    return (
      <OperatorOnly403
        active="workspaces"
        pageTitle="Edit Workspace"
        user={{
          userId: claims.userId,
          displayName: claims.displayName || claims.email || "User",
          handle: (claims.email || "").startsWith("+")
            ? (claims.email || "").replace(/[^0-9]/g, "")
            : (claims.email || "").split("@")[0] || "user",
          isOperator: false,
        }}
        activeCompany={claims.companyName ? { name: claims.companyName } : null}
        detail="Editing workspaces"
      />
    );
  }

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

  return (
    <Chrome
      active="workspaces"
      pageTitle="Edit Workspace"
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
        <span className="page-breadcrumb-current">Edit</span>
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
                </div>
                <h1 className="hero-card-title">{workspace.name}</h1>
                <p className="hero-card-subtitle">
                  Workspace Profile &amp; Membership Configuration
                </p>
              </div>
            </div>
            <div className="hero-card-actions">
              <button type="button" className="btn btn-secondary" disabled>
                Delete Workspace
              </button>
            </div>
          </div>

          <EditWorkspaceForm
            workspaceId={workspace.workspaceId}
            initial={{
              name: workspace.name,
              slug: workspace.slug,
              isDefault: workspace.isDefault,
            }}
            companyId={workspace.companyId}
            creatorName={workspace.createdBy}
          />
        </>
      )}
    </Chrome>
  );
}
