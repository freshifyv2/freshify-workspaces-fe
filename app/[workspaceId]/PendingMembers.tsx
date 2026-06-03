"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export interface PendingRow {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  requestedAt?: string | null;
}

function initials(name?: string | null, fallback = "?"): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function PendingMembers({ workspaceId, rows }: { workspaceId: string; rows: PendingRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = useMemo(
    () => rows.length > 0 && selected.size === rows.length,
    [rows.length, selected],
  );
  const someSelected = selected.size > 0 && !allSelected;

  if (!rows || rows.length === 0) {
    return (
      <p style={{ color: "var(--muted)", padding: 16, margin: 0 }}>
        No pending requests.
      </p>
    );
  }

  function toggleOne(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === rows.length) return new Set();
      return new Set(rows.map((r) => r.userId));
    });
  }

  async function act(userId: string, kind: "approve" | "decline", role: "admin" | "member" = "member") {
    setBusy(`${kind}:${userId}`);
    setError(null);
    try {
      const url = `/dashboard/workspaces/api/members/${kind}?workspaceId=${encodeURIComponent(workspaceId)}&userId=${encodeURIComponent(userId)}`;
      const body = kind === "approve" ? { role } : {};
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `${r.status}`);
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function batchAct(kind: "approve" | "decline", role: "admin" | "member" = "member") {
    const userIds = Array.from(selected);
    if (userIds.length === 0) return;
    setBusy(`batch:${kind}`);
    setError(null);
    try {
      const url = `/dashboard/workspaces/api/members/${kind}-batch`;
      const body: Record<string, unknown> = { workspaceId, userIds };
      if (kind === "approve") body.role = role;
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(j.error || `${r.status}`);
      }
      const failed = typeof j.failed === "number" ? j.failed : 0;
      if (failed > 0) {
        setError(`${failed} of ${userIds.length} failed. See server logs for details.`);
      }
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const lock = busy !== null;

  return (
    <div>
      {error && (
        <div className="warning-banner" style={{ margin: "0 16px 12px" }}>
          <span className="warning-banner-icon" aria-hidden>⚠</span>
          {error}
        </div>
      )}

      {selected.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            margin: "0 16px 12px",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--fg-2)" }}>
            {selected.size} selected
          </span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={lock}
            onClick={() => batchAct("approve", "member")}
          >
            {busy === "batch:approve" ? "Approving…" : `Approve ${selected.size} as member`}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={lock}
            onClick={() => batchAct("decline")}
          >
            {busy === "batch:decline" ? "Declining…" : `Decline ${selected.size}`}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={lock}
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  aria-label={allSelected ? "Deselect all" : "Select all"}
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  disabled={lock}
                />
              </th>
              <th>User</th>
              <th>Requested</th>
              <th style={{ width: 280 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const name = r.displayName || r.email || r.userId;
              const isApproving = busy === `approve:${r.userId}`;
              const isDeclining = busy === `decline:${r.userId}`;
              const isSelected = selected.has(r.userId);
              return (
                <tr key={r.userId}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${name}`}
                      checked={isSelected}
                      onChange={() => toggleOne(r.userId)}
                      disabled={lock}
                    />
                  </td>
                  <td>
                    <div className="user-cell">
                      <span className="avatar-circle">{initials(name)}</span>
                      <div className="user-cell-text">
                        <span className="user-cell-name">{name}</span>
                        <div className="user-cell-handle">{r.userId}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {r.requestedAt
                      ? new Date(r.requestedAt).toLocaleString()
                      : <span className="user-cell-handle">—</span>}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => act(r.userId, "approve", "member")}
                        disabled={lock}
                      >
                        {isApproving ? "Approving…" : "Approve as member"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => act(r.userId, "decline")}
                        disabled={lock}
                      >
                        {isDeclining ? "Declining…" : "Decline"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
