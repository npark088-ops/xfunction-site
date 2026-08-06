"use client";

import { useState } from "react";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const green = "var(--green)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

type CanvasStatus = {
  connected: boolean;
  user: { id: number; name: string } | null;
};

// Seeded with the connection status the server already looked up (see
// app/(dashboard)/courses/page.tsx) — no fetch on mount, no loading
// flash. Only re-fetches after an actual Connect/Disconnect action.
export function CanvasConnectionCard({
  initialStatus,
  banner,
}: {
  initialStatus: CanvasStatus;
  banner: string | null;
}) {
  const [canvasStatus, setCanvasStatus] = useState<CanvasStatus>(initialStatus);

  const refreshCanvasStatus = () => {
    fetch("/api/canvas/status")
      .then((res) => res.json())
      .then(setCanvasStatus)
      .catch(() => setCanvasStatus({ connected: false, user: null }));
  };

  const disconnectCanvas = () => {
    fetch("/api/canvas/disconnect", { method: "POST" }).then(refreshCanvasStatus);
  };

  return (
    <div
      style={{
        background: card,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div>
        {canvasStatus.connected ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: green, marginBottom: 2 }}>
              ✓ Canvas connected
            </div>
            <div style={{ fontSize: 13, color: textDim }}>
              Signed in as {canvasStatus.user?.name}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: 2 }}>
              Canvas not connected
            </div>
            <div style={{ fontSize: 13, color: textDim }}>
              Connect your Canvas account to keep grades in sync. (Using the local mock
              Canvas stand-in — no real credentials needed yet.)
            </div>
          </>
        )}
        {banner && <div style={{ fontSize: 13, color: green, marginTop: 6 }}>{banner}</div>}
      </div>

      {canvasStatus.connected ? (
        <button
          onClick={disconnectCanvas}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            background: bg,
            border: `1px solid ${border}`,
            color: text,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Disconnect
        </button>
      ) : (
        <a
          href="/api/canvas/connect"
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            background: blue,
            color: "white",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Connect Canvas
        </a>
      )}
    </div>
  );
}
