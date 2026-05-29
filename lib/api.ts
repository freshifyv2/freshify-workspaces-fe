const WORKSPACES_URL =
  process.env.WORKSPACES_SERVICE_URL ||
  "https://freshify-workspaces-sbzaekoo4q-uc.a.run.app";

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

export interface WorkspaceListItem {
  workspaceId: string;
  companyId: string;
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
}
