"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles, X } from "lucide-react";

const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const text = "var(--text)";
const textDim = "var(--text-dim)";
const red = "var(--red)";

const inputStyle = {
  padding: "10px 12px",
  borderRadius: "var(--radius-sm)",
  border: `1px solid ${border}`,
  background: "var(--bg)",
  color: text,
  fontSize: 14,
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box" as const,
};

const labelStyle = { fontSize: 12, fontWeight: 600, color: textDim, marginBottom: 6, display: "block" };

// Renders as a big empty-state card (when the student has zero courses)
// or a compact "add course" tile alongside the existing cards. Either
// way it's the same form + the one-time "Load demo data" action — see
// lib/user-courses.ts's seedDemoData(), which refuses to run once any
// real course exists, so this button naturally disappears after first use
// (hasCourses becomes true and the caller stops rendering it).
export function AddCourseCard({ hasCourses }: { hasCourses: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creditHours, setCreditHours] = useState("1");
  const [gradingScale, setGradingScale] = useState<"standard" | "simple">("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError("Enter a course name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          creditHours: Number(creditHours) || 1,
          gradingScale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't add that course.");
        setBusy(false);
        return;
      }
      setOpen(false);
      setName("");
      setCreditHours("1");
      setGradingScale("standard");
      setBusy(false);
      router.refresh();
    } catch {
      setError("Couldn't add that course.");
      setBusy(false);
    }
  };

  const loadDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/courses/seed-demo", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't load demo data.");
        setBusy(false);
        return;
      }
      setBusy(false);
      router.refresh();
    } catch {
      setError("Couldn't load demo data.");
      setBusy(false);
    }
  };

  if (open) {
    return (
      <div
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-lg)",
          padding: 24,
          gridColumn: hasCourses ? undefined : "1 / -1",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: text }}>Add a class</h3>
          <button
            onClick={() => setOpen(false)}
            style={{ background: "transparent", border: "none", color: textDim, cursor: "pointer", display: "flex", padding: 4 }}
            aria-label="Cancel"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 360 }}>
          <div>
            <label style={labelStyle}>Class name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="e.g. AP Chemistry" />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Credit hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={creditHours}
                onChange={(e) => setCreditHours(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Grading scale</label>
              <select
                value={gradingScale}
                onChange={(e) => setGradingScale(e.target.value as "standard" | "simple")}
                style={inputStyle}
              >
                <option value="standard">Standard (A/B/C…)</option>
                <option value="simple">Simple (pass/fail)</option>
              </select>
            </div>
          </div>
          {error && <div style={{ color: red, fontSize: 13 }}>{error}</div>}
          <button
            onClick={submit}
            disabled={busy}
            style={{
              background: blue,
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "10px 16px",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Adding…" : "Add class"}
          </button>
          <p style={{ fontSize: 12, color: textDim, margin: 0 }}>
            You can add grading categories and assignments after — from the class's Manage tab.
          </p>
        </div>
      </div>
    );
  }

  if (!hasCourses) {
    return (
      <div
        style={{
          gridColumn: "1 / -1",
          background: card,
          border: `1px dashed ${border}`,
          borderRadius: "var(--radius-lg)",
          padding: 40,
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: text }}>No classes yet</h2>
        <p style={{ fontSize: 14, color: textDim, margin: "0 0 24px", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
          Add your real classes and track grades yourself, or load sample data to see how XFunction works first.
        </p>
        {error && <div style={{ color: red, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: blue,
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "12px 20px",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Add your first class
          </button>
          <button
            onClick={loadDemo}
            disabled={busy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "transparent",
              border: `1px solid ${border}`,
              borderRadius: "var(--radius-sm)",
              padding: "12px 20px",
              color: text,
              fontSize: 14,
              fontWeight: 600,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Sparkles size={16} strokeWidth={2} />
            {busy ? "Loading…" : "Load demo data"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        background: "transparent",
        border: `1px dashed ${border}`,
        borderRadius: "var(--radius-lg)",
        padding: 24,
        color: textDim,
        cursor: "pointer",
        minHeight: 140,
      }}
    >
      <Plus size={22} strokeWidth={2} />
      <span style={{ fontSize: 14, fontWeight: 600 }}>Add a class</span>
    </button>
  );
}
