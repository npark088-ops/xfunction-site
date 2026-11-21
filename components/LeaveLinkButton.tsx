"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

const border = "var(--border)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

// A parent ends their own access to one student. It calls a database function
// that only acts on a link where the signed-in user is the parent (parents have
// no other way to change a link). The student is not notified automatically,
// but their Parent access list no longer shows the link as active.
export function LeaveLinkButton({ linkId, studentLabel }: { linkId: string; studentLabel: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = async () => {
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await createClient().rpc("leave_parent_link", { p_link_id: linkId });
    if (rpcError || data !== true) {
      console.error(rpcError);
      setError("Couldn't remove that link. Please try again.");
      setBusy(false);
      return;
    }
    router.push("/parent");
    router.refresh();
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: textDim,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "underline",
          cursor: "pointer",
        }}
      >
        Stop viewing this student
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-label="Confirm" style={{ fontSize: 13, color: text }}>
      <div style={{ marginBottom: 8 }}>Stop viewing {studentLabel}? You&apos;d need a new invite to see it again.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={leave}
          disabled={busy}
          style={{
            border: `1px solid ${red}`,
            background: "transparent",
            color: red,
            borderRadius: "var(--radius-sm)",
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 700,
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "Removing…" : "Yes, stop viewing"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          style={{
            border: `1px solid ${border}`,
            background: "transparent",
            color: text,
            borderRadius: "var(--radius-sm)",
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
      {error && (
        <div role="alert" style={{ color: red, marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}
