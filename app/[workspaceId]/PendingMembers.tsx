"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

  if (!rows || rows.length === 0) {
    return (
      <p style={{ color: "var(--muted)", padding: 16, margin: 0 }}>
        No pending requests.
      </p>
    );
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

  return (
    <div>
      {error && (
        <div className="warning-banner" style={{ margin: "0 16px 12px" }}>
          <span className="warning-banner-icon" aria-hidden>⚠</span>
          {error}
        </div>
      )}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
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
              const lock = busy !== null;
              return (
                <tr key={r.userId}>
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
