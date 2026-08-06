"use client";

import { useState } from "react";
import { Users, Copy, Check, Trash2, UserPlus } from "lucide-react";
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
  invite_code: string;
  created_at: string;
};

function generateInviteCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
}

// Seeded from the server (see app/(dashboard)/settings/page.tsx) — no
// fetch-on-mount. Creating and revoking links go straight through
// Supabase (RLS already scopes both to the signed-in student), no API
// route needed — same direct-client pattern as Tasks/Notes.
export function ParentAccessCard({
  initialLinks,
  userEmail,
}: {
  initialLinks: ParentLink[];
  userEmail: string | null;
}) {
  const [links, setLinks] = useState<ParentLink[]>(initialLinks);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const invite = () => {
    if (!userEmail) return;
    setCreating(true);
    setError(null);
    const supabase = createClient();
    supabase
      .from("parent_links")
      .insert({
        student_email: userEmail,
        invite_code: generateInviteCode(),
      })
      .select("id, parent_email, status, invite_code, created_at")
      .single()
      .then(({ data, error: insertError }) => {
        setCreating(false);
        if (insertError || !data) {
          console.error(insertError);
          setError("Failed to create an invite link.");
          return;
        }
        setLinks((prev) => [data, ...prev]);
      });
  };

  const revoke = (id: string) => {
    const previous = links;
    setLinks((prev) => prev.filter((l) => l.id !== id));

    const supabase = createClient();
    supabase
      .from("parent_links")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", id)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error(updateError);
          setLinks(previous);
        }
      });
  };

  const copyLink = (link: ParentLink) => {
    const url = `${window.location.origin}/parent/join?code=${link.invite_code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(link.id);
      setTimeout(() => setCopiedId((v) => (v === link.id ? null : v)), 1800);
    });
  };

  const visibleLinks = links.filter((l) => l.status !== "revoked");

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
        Invite a parent or guardian to a read-only view of your overall grades, upcoming
        deadlines, and grade trend — they can&apos;t see your notes or change anything.
      </p>

      {visibleLinks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {visibleLinks.map((link) => (
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: text }}>
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
                  {link.status === "active" ? "Active" : "Not yet accepted"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {link.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => copyLink(link)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "transparent",
                      border: `1px solid ${border}`,
                      borderRadius: "var(--radius-sm)",
                      color: text,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {copiedId === link.id ? (
                      <Check size={12} strokeWidth={2.5} />
                    ) : (
                      <Copy size={12} strokeWidth={2} />
                    )}
                    {copiedId === link.id ? "Copied" : "Copy link"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => revoke(link.id)}
                  title="Revoke access"
                  aria-label="Revoke access"
                  style={{
                    display: "flex",
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
            </div>
          ))}
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
      {error && <div style={{ fontSize: 12, color: red, marginTop: 10 }}>{error}</div>}
    </div>
  );
}
