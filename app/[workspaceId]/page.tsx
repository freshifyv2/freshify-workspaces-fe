import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { readSessionToken, decodeClaims } from "@/lib/session";
import { get, type WorkspaceDetail } from "@/lib/api";
import { Chrome } from "@/lib/Chrome";
import AddMemberForm from "./AddMemberForm";

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

  const isActive = workspace?.workspaceId === claims.workspaceId;

  return (
    <Chrome
      active="workspaces"
      pageTitle="Workspace Detail"
      user={{ userId: claims.userId, displayName, handle, isOperator }}
      activeCompany={claims.companyName ? { name: claims.companyName } : null}
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
              <button type="button" className="btn btn-primary" disabled>
                Update Workspace
              </button>
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
