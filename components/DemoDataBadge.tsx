import { FlaskConical } from "lucide-react";

const amber = "var(--amber)";

// Every course/grade page currently reads from the same hardcoded
// lib/mock-canvas-data.ts data set for every signed-in user — there's
// no per-user Canvas sync yet, even after "Connect Canvas" (see
// components/CanvasConnectionCard.tsx). This badge makes that visible
// wherever that data is shown, so a real student testing the app can't
// mistake it for their actual grades. No "use client" needed — it's
// static markup, safe to render from server or client components.
export function DemoDataBadge() {
  return (
    <span
      title="These are sample courses and grades for preview — Canvas sync isn't live yet, so this isn't your real data."
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        background: "rgba(245, 166, 35, 0.14)",
        border: `1px solid ${amber}`,
        color: amber,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        cursor: "default",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <FlaskConical size={12} strokeWidth={2.5} />
      Demo data
    </span>
  );
}
