"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import type { CanvasAssignmentGroup, CanvasAssignment } from "../lib/canvas-types";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

const inputStyle = {
  padding: "8px 10px",
  borderRadius: "var(--radius-sm)",
  border: `1px solid ${border}`,
  background: bg,
  color: text,
  fontSize: 13,
  fontFamily: "inherit",
  boxSizing: "border-box" as const,
};

function toDateInputValue(dueAt: string | null): string {
  if (!dueAt) return "";
  return new Date(dueAt).toISOString().slice(0, 10);
}

// Add/edit/delete this course's grading categories and assignments —
// the Grades page's "Manage" tab. Every course is manually-entered data
// now (see lib/user-courses.ts), so this is the actual gradebook, not a
// read-only display of synced data. Calls onChange() after any
// successful mutation so the parent page re-fetches and every derived
// number (current grade, breakdown, projection, trend) updates live.
export function GradebookEditor({
  courseId,
  groups,
  onChange,
}: {
  courseId: string;
  groups: CanvasAssignmentGroup[];
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupWeight, setNewGroupWeight] = useState("");

  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupWeight, setEditGroupWeight] = useState("");

  const [addingAssignmentTo, setAddingAssignmentTo] = useState<number | null>(null);
  const [newAName, setNewAName] = useState("");
  const [newAPoints, setNewAPoints] = useState("");
  const [newADue, setNewADue] = useState("");
  const [newAScore, setNewAScore] = useState("");

  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [editAName, setEditAName] = useState("");
  const [editAPoints, setEditAPoints] = useState("");
  const [editADue, setEditADue] = useState("");
  const [editAScore, setEditAScore] = useState("");

  const run = async (fn: () => Promise<Response>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setBusy(false);
        return false;
      }
      setBusy(false);
      onChange();
      return true;
    } catch {
      setError("Something went wrong");
      setBusy(false);
      return false;
    }
  };

  const addGroup = async () => {
    if (!newGroupName.trim() || !newGroupWeight) return;
    const ok = await run(() =>
      fetch(`/api/courses/${courseId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName, weight: Number(newGroupWeight) }),
      })
    );
    if (ok) {
      setNewGroupName("");
      setNewGroupWeight("");
      setAddingGroup(false);
    }
  };

  const saveGroupEdit = async (groupId: number) => {
    const ok = await run(() =>
      fetch(`/api/courses/${courseId}/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editGroupName, weight: Number(editGroupWeight) }),
      })
    );
    if (ok) setEditingGroupId(null);
  };

  const removeGroup = async (groupId: number) => {
    if (!confirm("Delete this category and all its assignments?")) return;
    await run(() => fetch(`/api/courses/${courseId}/groups/${groupId}`, { method: "DELETE" }));
  };

  const addAssignment = async (groupId: number) => {
    if (!newAName.trim() || !newAPoints) return;
    const ok = await run(() =>
      fetch(`/api/courses/${courseId}/groups/${groupId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAName,
          pointsPossible: Number(newAPoints),
          dueAt: newADue ? new Date(newADue).toISOString() : null,
          score: newAScore === "" ? null : Number(newAScore),
        }),
      })
    );
    if (ok) {
      setNewAName("");
      setNewAPoints("");
      setNewADue("");
      setNewAScore("");
      setAddingAssignmentTo(null);
    }
  };

  const startEditAssignment = (groupId: number, a: CanvasAssignment) => {
    setEditingAssignmentId(a.id);
    setEditAName(a.name);
    setEditAPoints(String(a.points_possible));
    setEditADue(toDateInputValue(a.due_at));
    setEditAScore(a.submission?.score != null ? String(a.submission.score) : "");
  };

  const saveAssignmentEdit = async (groupId: number, assignmentId: number) => {
    const ok = await run(() =>
      fetch(`/api/courses/${courseId}/groups/${groupId}/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editAName,
          pointsPossible: Number(editAPoints),
          dueAt: editADue ? new Date(editADue).toISOString() : null,
          score: editAScore === "" ? null : Number(editAScore),
        }),
      })
    );
    if (ok) setEditingAssignmentId(null);
  };

  const removeAssignment = async (groupId: number, assignmentId: number) => {
    if (!confirm("Delete this assignment?")) return;
    await run(() =>
      fetch(`/api/courses/${courseId}/groups/${groupId}/assignments/${assignmentId}`, {
        method: "DELETE",
      })
    );
  };

  const totalWeight = groups.reduce((sum, g) => sum + g.group_weight, 0);

  return (
    <div
      className="xf-card"
      style={{
        background: card,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-lg)",
        padding: 28,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
        <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: text }}>Manage gradebook</h2>
        {groups.length > 0 && (
          <div style={{ fontSize: 12, color: totalWeight === 100 ? textDim : "var(--amber)", flexShrink: 0 }}>
            Categories total {totalWeight}%{totalWeight !== 100 ? " (should add up to 100%)" : ""}
          </div>
        )}
      </div>
      <p style={{ fontSize: 12, color: textDim, marginBottom: 20 }}>
        Add grading categories (e.g. Homework, Tests) with a weight, then assignments under each —
        this is what your grade is actually calculated from.
      </p>

      {error && (
        <div style={{ color: red, fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {groups.map((group) => (
          <div key={group.id} style={{ border: `1px solid ${border}`, borderRadius: "var(--radius-md)", padding: 16 }}>
            {editingGroupId === group.id ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                <input
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  style={{ ...inputStyle, flex: 1, minWidth: 120 }}
                  placeholder="Category name"
                />
                <input
                  type="number"
                  value={editGroupWeight}
                  onChange={(e) => setEditGroupWeight(e.target.value)}
                  style={{ ...inputStyle, width: 70 }}
                  placeholder="%"
                />
                <button onClick={() => saveGroupEdit(group.id)} disabled={busy} style={{ background: green(), border: "none", borderRadius: "var(--radius-sm)", width: 32, height: 32, color: "white", cursor: "pointer" }}>
                  <Check size={15} strokeWidth={2.5} style={{ margin: "auto" }} />
                </button>
                <button onClick={() => setEditingGroupId(null)} style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: "var(--radius-sm)", width: 32, height: 32, color: textDim, cursor: "pointer" }}>
                  <X size={15} strokeWidth={2} style={{ margin: "auto" }} />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: text }}>
                  {group.name} <span style={{ color: textDim, fontWeight: 500 }}>· {group.group_weight}%</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => {
                      setEditingGroupId(group.id);
                      setEditGroupName(group.name);
                      setEditGroupWeight(String(group.group_weight));
                    }}
                    style={{ background: "transparent", border: "none", color: textDim, cursor: "pointer", display: "flex", padding: 4 }}
                    aria-label="Edit category"
                  >
                    <Pencil size={14} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => removeGroup(group.id)}
                    style={{ background: "transparent", border: "none", color: red, cursor: "pointer", display: "flex", padding: 4 }}
                    aria-label="Delete category"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {group.assignments.map((a) =>
                editingAssignmentId === a.id ? (
                  <div key={a.id} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", padding: "8px 10px", background: bg, borderRadius: 8, border: `1px solid ${border}` }}>
                    <input value={editAName} onChange={(e) => setEditAName(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 100 }} placeholder="Name" />
                    <input type="number" value={editAPoints} onChange={(e) => setEditAPoints(e.target.value)} style={{ ...inputStyle, width: 64 }} placeholder="Pts" />
                    <input type="date" value={editADue} onChange={(e) => setEditADue(e.target.value)} style={{ ...inputStyle, width: 130 }} />
                    <input type="number" value={editAScore} onChange={(e) => setEditAScore(e.target.value)} style={{ ...inputStyle, width: 64 }} placeholder="Score" />
                    <button onClick={() => saveAssignmentEdit(group.id, a.id)} disabled={busy} style={{ background: green(), border: "none", borderRadius: "var(--radius-sm)", width: 28, height: 28, color: "white", cursor: "pointer" }}>
                      <Check size={13} strokeWidth={2.5} style={{ margin: "auto" }} />
                    </button>
                    <button onClick={() => setEditingAssignmentId(null)} style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: "var(--radius-sm)", width: 28, height: 28, color: textDim, cursor: "pointer" }}>
                      <X size={13} strokeWidth={2} style={{ margin: "auto" }} />
                    </button>
                  </div>
                ) : (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: bg, borderRadius: 8, border: `1px solid ${border}` }}>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: text }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: textDim, whiteSpace: "nowrap" }}>
                      {a.submission?.score != null ? `${a.submission.score}/${a.points_possible}` : `— /${a.points_possible}`}
                    </div>
                    <div style={{ fontSize: 12, color: textDim, whiteSpace: "nowrap" }}>
                      {a.due_at ? new Date(a.due_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No due date"}
                    </div>
                    <button onClick={() => startEditAssignment(group.id, a)} style={{ background: "transparent", border: "none", color: textDim, cursor: "pointer", display: "flex", padding: 4 }} aria-label="Edit assignment">
                      <Pencil size={13} strokeWidth={2} />
                    </button>
                    <button onClick={() => removeAssignment(group.id, a.id)} style={{ background: "transparent", border: "none", color: red, cursor: "pointer", display: "flex", padding: 4 }} aria-label="Delete assignment">
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                )
              )}

              {addingAssignmentTo === group.id ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", padding: "8px 10px", background: bg, borderRadius: 8, border: `1px dashed ${border}` }}>
                  <input value={newAName} onChange={(e) => setNewAName(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 100 }} placeholder="Assignment name" />
                  <input type="number" value={newAPoints} onChange={(e) => setNewAPoints(e.target.value)} style={{ ...inputStyle, width: 64 }} placeholder="Pts" />
                  <input type="date" value={newADue} onChange={(e) => setNewADue(e.target.value)} style={{ ...inputStyle, width: 130 }} />
                  <input type="number" value={newAScore} onChange={(e) => setNewAScore(e.target.value)} style={{ ...inputStyle, width: 64 }} placeholder="Score (if graded)" />
                  <button onClick={() => addAssignment(group.id)} disabled={busy} style={{ background: blue, border: "none", borderRadius: "var(--radius-sm)", padding: "6px 12px", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Add
                  </button>
                  <button onClick={() => setAddingAssignmentTo(null)} style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: "var(--radius-sm)", padding: "6px 12px", color: textDim, fontSize: 12, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingAssignmentTo(group.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: blue, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "6px 4px", alignSelf: "flex-start" }}
                >
                  <Plus size={13} strokeWidth={2} />
                  Add assignment
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {addingGroup ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
          <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} placeholder="Category name (e.g. Tests)" />
          <input type="number" value={newGroupWeight} onChange={(e) => setNewGroupWeight(e.target.value)} style={{ ...inputStyle, width: 90 }} placeholder="Weight %" />
          <button onClick={addGroup} disabled={busy} style={{ background: blue, border: "none", borderRadius: "var(--radius-sm)", padding: "8px 16px", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Add
          </button>
          <button onClick={() => setAddingGroup(false)} style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: "var(--radius-sm)", padding: "8px 16px", color: textDim, fontSize: 13, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingGroup(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, background: "transparent", border: `1px dashed ${border}`, borderRadius: "var(--radius-sm)", padding: "10px 16px", color: blue, fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%", justifyContent: "center" }}
        >
          <Plus size={15} strokeWidth={2} />
          Add category
        </button>
      )}
    </div>
  );
}

function green() {
  return "var(--green)";
}
