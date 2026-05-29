import { redirect } from "next/navigation";
import Link from "next/link";
import { readSessionToken } from "@/lib/session";
import { get, type WorkspaceListItem } from "@/lib/api";
import CreateWorkspaceForm from "./CreateWorkspaceForm";

export const dynamic = "force-dynamic";

export default async function WorkspacesIndex() {
  const token = readSessionToken();
  if (!token) redirect("/login");

  let workspaces: WorkspaceListItem[] = [];
  let error: string | null = null;
  try {
    const out = await get<{ workspaces: WorkspaceListItem[] }>("/v1/workspaces", token);
    workspaces = out.workspaces;
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="container">
      <div className="stack" style={{ gap: 24 }}>
        <div>
          <div className="kicker">Workspaces</div>
          <h1 style={{ marginTop: 8 }}>Workspaces in your active company</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Every company gets a default workspace. Add more for separate environments or teams.
          </p>
        </div>

        {error && <div className="card"><div className="error">{error}</div></div>}

        <div className="card">
          {workspaces.length === 0 ? (
            <div className="muted">No workspaces yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Default</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((w) => (
                  <tr key={w.workspaceId}>
                    <td>
                      <Link href={`/dashboard/workspaces/${w.workspaceId}`}>{w.name}</Link>
                    </td>
                    <td>{w.isDefault ? <span className="pill">default</span> : "—"}</td>
                    <td>{w.role}</td>
                    <td className="muted"><code style={{ fontSize: 12 }}>{w.companyId}</code></td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/dashboard/workspaces/${w.workspaceId}`} className="nav-link">
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <CreateWorkspaceForm />
      </div>
    </div>
  );
}
