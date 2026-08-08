"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ListChecks, NotebookPen } from "lucide-react";
import { mockCourses } from "../lib/mock-canvas-data";
import { courseColor } from "../lib/course-colors";

const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

interface AssignmentHit {
  type: "assignment";
  courseId: string;
  courseName: string;
  groupName: string;
  name: string;
  dueAt: string | null;
}

interface NoteHit {
  type: "note";
  courseId: string;
  courseName: string;
  content: string;
}

export function SearchResults({
  initialNotes,
}: {
  initialNotes: { course_id: string; content: string }[];
}) {
  const [query, setQuery] = useState("");

  const assignments = useMemo<AssignmentHit[]>(
    () =>
      Object.values(mockCourses).flatMap((course) =>
        course.assignmentGroups.flatMap((group) =>
          group.assignments.map((a) => ({
            type: "assignment" as const,
            courseId: course.id,
            courseName: course.name,
            groupName: group.name,
            name: a.name,
            dueAt: a.due_at,
          }))
        )
      ),
    []
  );

  const notes = useMemo<NoteHit[]>(
    () =>
      initialNotes
        .filter((n) => n.content.trim().length > 0)
        .map((n) => ({
          type: "note" as const,
          courseId: n.course_id,
          courseName: mockCourses[n.course_id]?.name ?? n.course_id,
          content: n.content,
        })),
    [initialNotes]
  );

  const q = query.trim().toLowerCase();

  const matchedAssignments = useMemo(
    () =>
      q
        ? assignments.filter(
            (a) => a.name.toLowerCase().includes(q) || a.courseName.toLowerCase().includes(q)
          )
        : [],
    [assignments, q]
  );

  const matchedNotes = useMemo(
    () =>
      q
        ? notes.filter(
            (n) => n.content.toLowerCase().includes(q) || n.courseName.toLowerCase().includes(q)
          )
        : [],
    [notes, q]
  );

  const hasQuery = q.length > 0;
  const hasResults = matchedAssignments.length > 0 || matchedNotes.length > 0;

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 28 }}>
        <Search
          size={17}
          strokeWidth={2}
          style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: textDim }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search assignments and notes…"
          autoFocus
          style={{
            width: "100%",
            padding: "14px 16px 14px 44px",
            borderRadius: "var(--radius-md)",
            border: `1px solid ${border}`,
            background: card,
            color: text,
            fontSize: 15,
            boxSizing: "border-box",
          }}
        />
      </div>

      {!hasQuery && (
        <p style={{ color: textDim, fontSize: 14 }}>
          Start typing to search across every course&apos;s assignments and your notes.
        </p>
      )}

      {hasQuery && !hasResults && (
        <p style={{ color: textDim, fontSize: 14 }}>No matches for &ldquo;{query}&rdquo;.</p>
      )}

      {matchedAssignments.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 700,
              color: textDim,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 12,
            }}
          >
            <ListChecks size={15} strokeWidth={2} />
            Assignments ({matchedAssignments.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {matchedAssignments.map((a, i) => (
              <Link
                key={i}
                href={`/grades/${a.courseId}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 18px",
                  borderRadius: "var(--radius-md)",
                  background: card,
                  border: `1px solid ${border}`,
                  borderLeft: `3px solid ${courseColor(a.courseId)}`,
                  textDecoration: "none",
                  color: text,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: 2 }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: textDim }}>
                    {a.courseName} · {a.groupName}
                  </div>
                </div>
                {a.dueAt && (
                  <div style={{ fontSize: 12, color: textDim, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {new Date(a.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {matchedNotes.length > 0 && (
        <div>
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 700,
              color: textDim,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 12,
            }}
          >
            <NotebookPen size={15} strokeWidth={2} />
            Notes ({matchedNotes.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {matchedNotes.map((n, i) => (
              <Link
                key={i}
                href={`/grades/${n.courseId}`}
                style={{
                  display: "block",
                  padding: "14px 18px",
                  borderRadius: "var(--radius-md)",
                  background: card,
                  border: `1px solid ${border}`,
                  borderLeft: `3px solid ${courseColor(n.courseId)}`,
                  textDecoration: "none",
                  color: text,
                }}
              >
                <div style={{ fontSize: 12, color: blue, fontWeight: 600, marginBottom: 4 }}>{n.courseName}</div>
                <div
                  style={{
                    fontSize: 14,
                    color: textDim,
                    lineHeight: 1.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {n.content}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
