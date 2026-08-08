"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, Pin, Timer } from "lucide-react";
import { mockCourses } from "../lib/mock-canvas-data";
import { formatTime12h, type ScheduleBlock } from "./ScheduleGrid";
import type { StudySession } from "../lib/study-sessions";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Cap chips per day so a busy day doesn't blow out the cell height —
// the rest collapse into a "+N more" label instead of a popover, kept
// deliberately simple.
const MAX_CHIPS_PER_DAY = 3;

interface AssignmentDue {
  courseId: string;
  courseName: string;
  name: string;
  dueAt: Date;
}

function sameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Every assignment across every course that has a due date — a
// traditional calendar shows what's due when, not just what's still
// pending, so this deliberately doesn't filter by submission status
// the way lib/upcoming-assignments.ts does.
function getAllAssignmentsWithDueDates(): AssignmentDue[] {
  return Object.values(mockCourses).flatMap((c) =>
    c.assignmentGroups.flatMap((g) =>
      g.assignments
        .filter((a) => a.due_at)
        .map((a) => ({
          courseId: c.id,
          courseName: c.name,
          name: a.name,
          dueAt: new Date(a.due_at as string),
        }))
    )
  );
}

interface DayCell {
  date: Date;
  inCurrentMonth: boolean;
  isToday: boolean;
}

function buildMonthGrid(monthCursor: Date): DayCell[] {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Pad back to the Sunday on/before the 1st, and forward to the
  // Saturday on/after the last day, so the grid is always a clean set
  // of full weeks.
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridEnd = new Date(lastOfMonth);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const today = new Date();
  const cells: DayCell[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    cells.push({
      date: new Date(d),
      inCurrentMonth: d.getMonth() === month,
      isToday: sameDate(d, today),
    });
  }
  return cells;
}

// Renders alongside ScheduleGrid's week view (see the view toggle
// there) — same data (course_schedule_blocks), just laid out as a
// traditional month calendar instead of an hour-by-hour grid.
// Class times are recurring by weekday (day_of_week), so they repeat
// on every matching date in the month; assignments are one-off, keyed
// to their real due date from the shared mock course data.
export function ScheduleMonthView({
  blocks,
  sessions,
  courseColor,
  courseName,
  onRemoveBlock,
}: {
  blocks: ScheduleBlock[];
  sessions: StudySession[];
  courseColor: (courseId: string) => string;
  courseName: (courseId: string) => string;
  onRemoveBlock: (id: string) => void;
}) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const assignments = useMemo(() => getAllAssignmentsWithDueDates(), []);
  const cells = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);

  const monthLabel = monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const goToMonth = (offset: number) => {
    setMonthCursor((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
  };

  const goToToday = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    setMonthCursor(d);
  };

  return (
    <div
      className="xf-card"
      style={{
        background: card,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-lg)",
        padding: 20,
      }}
    >
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
            style={navButtonStyle}
          >
            <ChevronLeft size={16} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            aria-label="Next month"
            style={navButtonStyle}
          >
            <ChevronRight size={16} strokeWidth={2.25} />
          </button>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: text, margin: "0 4px" }}>{monthLabel}</h2>
        </div>
        <button
          type="button"
          onClick={goToToday}
          style={{
            padding: "6px 12px",
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${border}`,
            background: bg,
            color: textDim,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Today
        </button>
      </div>

      {/* Weekday header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", minWidth: 560 }}>
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 700,
              color: textDim,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              padding: "0 0 8px",
            }}
          >
            {label}
          </div>
        ))}

        {/* Day cells */}
        {cells.map((cell) => {
          const dayBlocks = cell.inCurrentMonth
            ? blocks.filter((b) => b.day_of_week === cell.date.getDay())
            : [];
          const dayAssignments = cell.inCurrentMonth
            ? assignments.filter((a) => sameDate(a.dueAt, cell.date))
            : [];
          const daySessions = cell.inCurrentMonth
            ? sessions.filter((s) => sameDate(new Date(s.occurred_at), cell.date))
            : [];
          const items = [
            ...dayBlocks.map((b) => ({ kind: "block" as const, block: b })),
            ...daySessions.map((s) => ({ kind: "session" as const, session: s })),
            ...dayAssignments.map((a) => ({ kind: "assignment" as const, assignment: a })),
          ];
          const visibleItems = items.slice(0, MAX_CHIPS_PER_DAY);
          const overflowCount = items.length - visibleItems.length;

          return (
            <div
              key={cell.date.toISOString()}
              style={{
                minHeight: 92,
                border: `1px solid ${border}`,
                borderRadius: "var(--radius-sm)",
                margin: 2,
                padding: 6,
                background: cell.inCurrentMonth ? bg : "transparent",
                opacity: cell.inCurrentMonth ? 1 : 0.4,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: cell.isToday ? 800 : 600,
                  color: cell.isToday ? blue : textDim,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {cell.isToday && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: blue,
                      display: "inline-block",
                    }}
                  />
                )}
                {cell.date.getDate()}
              </div>

              {visibleItems.map((item, i) => {
                if (item.kind === "session") {
                  return (
                    <div
                      key={`session-${item.session.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: 10,
                        lineHeight: 1.3,
                        color: "white",
                        background: courseColor(item.session.course_id),
                        borderRadius: 4,
                        padding: "3px 5px",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                      title={`Studied ${courseName(item.session.course_id)} for ${item.session.duration_minutes} min`}
                    >
                      <Timer size={9} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", fontWeight: 700 }}>
                        {courseName(item.session.course_id)}
                      </span>
                    </div>
                  );
                }
                return item.kind === "block" ? (
                  <div
                    key={`block-${item.block.id}`}
                    style={{
                      position: "relative",
                      fontSize: 10,
                      lineHeight: 1.3,
                      color: text,
                      background: card,
                      border: `1px solid ${courseColor(item.block.course_id)}`,
                      borderLeft: `3px solid ${courseColor(item.block.course_id)}`,
                      borderRadius: 4,
                      padding: "3px 16px 3px 5px",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                    title={`${courseName(item.block.course_id)} — ${formatTime12h(item.block.start_time)}–${formatTime12h(item.block.end_time)}`}
                  >
                    <strong style={{ fontWeight: 700 }}>{courseName(item.block.course_id)}</strong>
                    <div style={{ color: textDim, fontSize: 9 }}>{formatTime12h(item.block.start_time)}</div>
                    <button
                      type="button"
                      onClick={() => onRemoveBlock(item.block.id)}
                      aria-label={`Remove ${courseName(item.block.course_id)} from schedule`}
                      style={{
                        position: "absolute",
                        top: 1,
                        right: 1,
                        background: "none",
                        border: "none",
                        color: textDim,
                        cursor: "pointer",
                        display: "flex",
                        padding: 2,
                      }}
                    >
                      <X size={9} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <div
                    key={`assignment-${item.assignment.courseId}-${item.assignment.name}-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 10,
                      lineHeight: 1.3,
                      color: text,
                      background: "transparent",
                      border: `1px dashed ${courseColor(item.assignment.courseId)}`,
                      borderRadius: 4,
                      padding: "3px 5px",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                    title={`Due: ${item.assignment.name} (${item.assignment.courseName})`}
                  >
                    <Pin size={9} strokeWidth={2} style={{ flexShrink: 0, opacity: 0.75 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.assignment.name}</span>
                  </div>
                );
              })}

              {overflowCount > 0 && (
                <div style={{ fontSize: 10, color: textDim, fontWeight: 600 }}>+{overflowCount} more</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const navButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: "var(--radius-sm)",
  border: `1px solid ${border}`,
  background: bg,
  color: text,
  cursor: "pointer",
};
