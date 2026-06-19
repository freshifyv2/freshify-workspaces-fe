const WORKSPACES_URL =
  process.env.WORKSPACES_SERVICE_URL ||
  "https://freshify-workspaces-sbzaekoo4q-uc.a.run.app";

export const USERS_URL =
  process.env.USERS_SERVICE_URL ||
  "https://freshify-users-sbzaekoo4q-uc.a.run.app";

export const COMPANIES_URL =
  process.env.COMPANIES_SERVICE_URL ||
  "https://freshify-companies-sbzaekoo4q-uc.a.run.app";

/** Generic GET to a sibling sovereign module BE. */
export async function getServiceJson<T>(
  baseUrl: string,
  path: string,
  token: string,
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${baseUrl}${path} ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function authed(path: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(`${WORKSPACES_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
}

export async function get<T>(path: string, token: string): Promise<T> {
  const res = await authed(path, token);
  if (!res.ok) throw new Error(`workspaces ${path} ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function post<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await authed(path, token, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`workspaces ${path} ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function patch<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await authed(path, token, { method: "PATCH", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`workspaces ${path} ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function put<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await authed(path, token, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`workspaces ${path} ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function del<T>(path: string, token: string): Promise<T> {
  const res = await authed(path, token, { method: "DELETE" });
  if (!res.ok) throw new Error(`workspaces ${path} ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

/**
 * Sprint 3 / 3.2a — WorkspaceScope closed enum.
 * Mirrors the BE `WORKSPACE_SCOPES` source-of-truth in
 * freshify-workspaces/src/types/workspaceScope.ts.
 */
export const WORKSPACE_SCOPES = [
  "company_wide",
  "workspace",
  "location_specific",
] as const;
export type WorkspaceScope = (typeof WORKSPACE_SCOPES)[number];
export const WORKSPACE_SCOPE_LABELS: Record<WorkspaceScope, string> = {
  company_wide: "Company-wide",
  workspace: "Workspace",
  location_specific: "Location-specific",
};
export const DEFAULT_WORKSPACE_SCOPE: WorkspaceScope = "workspace";

/**
 * Sprint 3 / 3.9 Phase B — module settings + admins.
 * Wire-format views returned by freshify-workspaces /v1/modules/workspaces/*.
 */
export type TenantScope = "portal" | "company" | "workspace";

export interface ModuleSettingsView {
  moduleKey: string;
  tenantScope: TenantScope;
  tenantId: string;
  availableRoleKeys: string[];
  defaultRoleKey: string;
  updatedAt: string;
  updatedBy: string | null;
  version: number;
}

export interface ModuleAdminView {
  moduleKey: string;
  tenantScope: TenantScope;
  tenantId: string;
  userId: string;
  grantedAt: string;
  grantedBy: string | null;
  source: "bootstrap" | "manual";
}

export interface WorkspaceAdminListItem {
  workspaceId: string;
  companyId: string;
  companyName: string | null;
  name: string;
  slug: string | null;
  isDefault: boolean;
  ownerUserId: string | null;
  memberCount: number;
  createdAt: string;
}

export interface WorkspaceListItem {
  workspaceId: string;
  companyId: string;
  companyName?: string | null;
  name: string;
  slug: string | null;
  isDefault: boolean;
  role: "admin" | "member";
}
export interface WorkspaceDetail {
  workspaceId: string;
  companyId: string;
  name: string;
  slug: string | null;
  isDefault: boolean;
  createdBy: string;
  // Sprint 3 / 3.2a — scope is optional during the tolerant-read window.
  scope?: WorkspaceScope | null;
}
