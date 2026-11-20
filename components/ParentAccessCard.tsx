"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Copy, Check, Trash2, UserPlus, AlertTriangle } from "lucide-react";
import { createClient } from "../lib/supabase/client";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const green = "var(--green)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

export type ParentLink = {
  id: string;
  parent_email: string | null;
  status: "pending" | "active" | "revoked";
  expires_at: string | null;
  created_at: string;
};

// A just-created invite: its link is shown ONCE. Only a hash of the code is
// stored, so it can't be shown again; if it is lost, cancel it and make a new one.
type FreshInvite = { link: string; expiresAt: string };

function expiryLabel(iso: string | null): string {
  if (!iso) return "";
  const expires = new Date(iso);
  if (expires.getTime() <= Date.now()) return "Expired";
  return `Expires ${expires.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

// Seeded from the server (see app/(dashboard)/settings/page.tsx). Creating an
// invite goes through /api/parent/invite (the server makes the code); revoking
// is a database function that only acts on the signed-in student's own links.
// The browser can no longer write parent links itself.
export function ParentAccessCard({ initialLinks }: { initialLinks: ParentLink[] }) {
  const router = useRouter();
  // The list always comes from the server (props); a refresh after each change
  // brings the new one. Revoked rows are hidden at once while that happens.
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<FreshInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const invite = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/parent/invite", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create an invite link.");
        return;
      }
      setFresh({ link: data.link, expiresAt: data.expiresAt });
      setCopied(false);
      // The list (without the code) comes from the server.
      router.refresh();
    } catch {
      setError("Failed to create an invite link.");
    } finally {
      setCreating(false);
    }
  };

  const revoke = (id: string) => {
    setHiddenIds((prev) => [...prev, id]);
    const supabase = createClient();
    supabase.rpc("revoke_parent_link", { p_link_id: id }).then(({ data, error: rpcError }) => {
      if (rpcError || data !== true) {
        console.error(rpcError);
        setHiddenIds((prev) => prev.filter((x) => x !== id));
        setError("Couldn't revoke that. Please try again.");
        return;
      }
      setFresh(null);
      router.refresh();
    });
  };

  const copyFresh = () => {
    if (!fresh) return;
    navigator.clipboard.writeText(fresh.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const visibleLinks = initialLinks.filter((l) => l.status !== "revoked" && !hiddenIds.includes(l.id));

  return (
    <div
      className="xf-card"
      style={{
        background: card,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-lg)",
        padding: 28,
        marginBottom: 24,
      }}
    >
      <h2
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 4,
          color: text,
        }}
      >
        <Users size={17} strokeWidth={2} />
        Parent access
      </h2>
      <p style={{ fontSize: 12, color: textDim, marginBottom: 18 }}>
        Invite a parent or guardian to a read-only view: your overall grade and trend, each class&apos;s grade, and
        what&apos;s due soon. They can&apos;t see your individual scores, notes, tasks or anything else, and you can
        remove their access at any time.
      </p>

      {fresh && (
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: "14px 16px",
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${green}`,
            background: bg,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 6 }}>Your invite link</div>
          <div
            style={{
              fontSize: 12,
              color: text,
              wordBreak: "break-all",
              padding: "8px 10px",
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${border}`,
              marginBottom: 8,
            }}
          >
            {fresh.link}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={copyFresh}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: blue,
                border: "none",
                borderRadius: "var(--radius-sm)",
                color: "white",
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <span style={{ fontSize: 12, color: textDim }}>Works once, and expires in 7 days.</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 12, color: textDim, marginTop: 10 }}>
            <AlertTriangle size={13} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              This is the only time you&apos;ll see this link. If you lose it, cancel the invite and make a new one.
            </span>
          </div>
        </div>
      )}

      {visibleLinks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {visibleLinks.map((link) => {
            const expired = link.status === "pending" && link.expires_at && new Date(link.expires_at).getTime() <= Date.now();
            return (
              <div
                key={link.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: bg,
                  border: `1px solid ${border}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  {link.status === "active" ? (
                    <div style={{ fontSize: 13, fontWeight: 600, color: text, overflowWrap: "anywhere" }}>
                      {link.parent_email ?? "Linked parent"}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, fontWeight: 600, color: textDim }}>Invite pending</div>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      color: link.status === "active" ? green : textDim,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {link.status === "active"
                      ? "Active"
                      : expired
                        ? "Expired"
                        : `Not yet accepted · ${expiryLabel(link.expires_at)}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(link.id)}
                  title={link.status === "active" ? "Remove access" : "Cancel invite"}
                  aria-label={link.status === "active" ? "Remove access" : "Cancel invite"}
                  style={{
                    display: "flex",
                    flexShrink: 0,
                    background: "transparent",
                    border: `1px solid ${red}`,
                    borderRadius: "var(--radius-sm)",
                    color: red,
                    padding: 7,
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={invite}
        disabled={creating}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderRadius: "var(--radius-sm)",
          background: blue,
          color: "white",
          border: "none",
          fontSize: 14,
          fontWeight: 700,
          cursor: creating ? "default" : "pointer",
          opacity: creating ? 0.7 : 1,
        }}
      >
        <UserPlus size={15} strokeWidth={2} />
        {creating ? "Creating…" : "Invite a parent"}
      </button>
      {error && (
        <div role="alert" style={{ fontSize: 12, color: red, marginTop: 10 }}>
          {error}
        </div>
      )}
    </div>
  );
}
