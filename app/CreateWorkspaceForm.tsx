"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  WORKSPACE_SCOPES,
  WORKSPACE_SCOPE_LABELS,
  DEFAULT_WORKSPACE_SCOPE,
  type WorkspaceScope,
} from "@/lib/api";

export default function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [scope, setScope] = useState<WorkspaceScope>(DEFAULT_WORKSPACE_SCOPE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/dashboard/workspaces/api/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, slug: slug || undefined, scope }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `${res.status}`);
      }
      setName("");
      setSlug("");
      setScope(DEFAULT_WORKSPACE_SCOPE);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section-card">
      <div className="section-card-header">
        <span className="section-card-icon" aria-hidden>+</span>
        <h3 className="section-card-title">Create a New Workspace</h3>
      </div>
      <form onSubmit={submit}>
        <div className="field-grid">
          <div className="field">
            <label className="field-label">NAME</label>
            <input
              className="field-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Production"
            />
          </div>
          <div className="field">
            <label className="field-label">SLUG (OPTIONAL)</label>
            <input
              className="field-input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="prod"
            />
          </div>
          <div className="field">
            <label className="field-label">SCOPE</label>
            <select
              className="field-input field-select"
              value={scope}
              onChange={(e) => setScope(e.target.value as WorkspaceScope)}
            >
              {WORKSPACE_SCOPES.map((s) => (
                <option key={s} value={s}>
                  {WORKSPACE_SCOPE_LABELS[s]}
                </option>
              ))}
            </select>
            <span className="field-hint">
              How broadly this workspace applies. Default is Workspace.
            </span>
          </div>
        </div>
        {error && (
          <div className="warning-banner" style={{ marginTop: 16 }}>
            <span className="warning-banner-icon" aria-hidden>⚠</span>
            {error}
          </div>
        )}
        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={busy || !name}>
            {busy ? "Creating..." : "Create Workspace"}
          </button>
        </div>
      </form>
    </div>
  );
}
