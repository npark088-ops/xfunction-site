"use client";

import { useMemo, useState } from "react";
import { Plus, X, CalendarDays, LayoutGrid, Calendar, Timer } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { ScheduleMonthView } from "./ScheduleMonthView";
import { StudyStats } from "./StudyStats";
import { getWeekBounds, sessionsInRange, type StudySession } from "../lib/study-sessions";
import { courseColor as courseColorFor } from "../lib/course-colors";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

export type ScheduleBlock = {
  id: string;
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type CourseOption = { id: string; name: string };

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
];

// The grid only needs to cover a typical school day — 7am-5pm — not
// the full 24 hours.
const GRID_START_HOUR = 7;
const GRID_END_HOUR = 17;
const HOUR_HEIGHT = 56;

function minutesSinceMidnight(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

// Seeded from the server (see app/(dashboard)/schedule/page.tsx) — no
// fetch-on-mount, no loading flash. All mutations are optimistic with
// a rollback on failure, same pattern as the Tasks/Grades pages.
export function ScheduleGrid({
  courses,
  initialBlocks,
  initialSessions,
}: {
  courses: CourseOption[];
  initialBlocks: ScheduleBlock[];
  initialSessions: StudySession[];
}) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(initialBlocks);
  const [sessions] = useState<StudySession[]>(initialSessions);
  const [view, setView] = useState<"week" | "month">("week");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:50");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const courseColor = courseColorFor;
  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? id;

  // Class times recur every week (day_of_week only, no date), so the
  // week grid is really a fixed template — but study sessions have a
  // real timestamp, so only the current calendar week's sessions belong
  // on it. Positioned by their actual completion time, working backward
  // by duration_minutes for the start.
  const thisWeekSessions = useMemo(() => {
    const { start, end } = getWeekBounds(new Date());
    return sessionsInRange(sessions, start, end);
  }, [sessions]);

  const sessionTimeRange = (session: StudySession) => {
    const endDate = new Date(session.occurred_at);
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
    const startMinutes = Math.max(0, endMinutes - session.duration_minutes);
    return { dayOfWeek: endDate.getDay(), startMinutes, endMinutes };
  };

  const addBlock = () => {
    setError(null);
    if (!courseId) {
      setError("Choose a course first.");
      return;
    }
    if (endTime <= startTime) {
      setError("End time has to be after the start time.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    supabase
      .from("course_schedule_blocks")
      .insert({
        course_id: courseId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
      })
      .select("id, course_id, day_of_week, start_time, end_time")
      .single()
      .then(({ data, error: insertError }) => {
        setSaving(false);
        if (insertError || !data) {
          console.error(insertError);
          setError("Failed to add that class time.");
          return;
        }
        setBlocks((prev) => [...prev, data]);
      });
  };

  const removeBlock = (id: string) => {
    const previous = blocks;
    setBlocks((prev) => prev.filter((b) => b.id !== id));

    const supabase = createClient();
    supabase
      .from("course_schedule_blocks")
      .delete()
      .eq("id", id)
      .then(({ error: deleteError }) => {
        if (deleteError) {
          console.error(deleteError);
          setBlocks(previous);
        }
      });
  };

  const hours = Array.from(
    { length: GRID_END_HOUR - GRID_START_HOUR },
    (_, i) => GRID_START_HOUR + i
  );
  const gridHeight = hours.length * HOUR_HEIGHT;
  const gridStartMinutes = GRID_START_HOUR * 60;

  return (
    <>
      {/* Week/Month toggle — kept at the very top so it's the first
          thing visible on the page, above the add-class-time form,
          which stays identical regardless of which view is active. */}
      <div
        style={{
          display: "inline-flex",
          padding: 4,
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-md)",
          marginBottom: 20,
        }}
      >
        {(
          [
            { id: "week", label: "Week", icon: LayoutGrid },
            { id: "month", label: "Month", icon: Calendar },
          ] as const
        ).map((option) => {
          const active = view === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setView(option.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: active ? blue : "transparent",
                color: active ? "white" : textDim,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                transition: "background var(--transition-fast), color var(--transition-fast)",
              }}
            >
              <Icon size={14} strokeWidth={2.25} />
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Add a class time */}
      <div
        className="xf-card"
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-lg)",
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 16,
            fontWeight: 700,
            marginTop: 0,
            marginBottom: 16,
            color: text,
          }}
        >
          <Plus size={16} strokeWidth={2} />
          Add a class time
        </h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: 12, color: textDim, display: "block", marginBottom: 6 }}>
              Course
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={{
                padding: "9px 10px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${border}`,
                background: bg,
                color: text,
                fontSize: 13,
                minWidth: 160,
              }}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: textDim, display: "block", marginBottom: 6 }}>
              Day
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              style={{
                padding: "9px 10px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${border}`,
                background: bg,
                color: text,
                fontSize: 13,
              }}
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: textDim, display: "block", marginBottom: 6 }}>
              Start
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${border}`,
                background: bg,
                color: text,
                fontSize: 13,
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: textDim, display: "block", marginBottom: 6 }}>
              End
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${border}`,
                background: bg,
                color: text,
                fontSize: 13,
              }}
            />
          </div>
          <button
            onClick={addBlock}
            disabled={saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              borderRadius: "var(--radius-sm)",
              background: blue,
              color: "white",
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
        {error && <div style={{ fontSize: 12, color: red, marginTop: 12 }}>{error}</div>}
      </div>

      {/* Weekly grid — always visible, even with zero blocks, so it's
          clear what you're building toward rather than hidden behind
          an empty-state message. */}
      {view === "week" && (
      <div
        className="xf-card"
        style={{
          background: card,
          border: `1px solid ${border}`,
          borderRadius: "var(--radius-lg)",
          padding: 20,
          overflowX: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          {blocks.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: textDim }}>
              <CalendarDays size={14} strokeWidth={1.75} style={{ opacity: 0.7, flexShrink: 0 }} />
              No class times added yet — use the form above to start filling in your week.
            </div>
          ) : (
            <div />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 11, color: textDim }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, border: `1px solid ${textDim}`, display: "inline-block" }} />
              Class time
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: textDim, display: "inline-block" }} />
              Study session
            </div>
          </div>
        </div>
        <div style={{ display: "flex", minWidth: 560 }}>
          {/* Time labels */}
          <div style={{ width: 56, flexShrink: 0 }}>
            <div style={{ height: 28 }} />
            {hours.map((h) => (
              <div
                key={h}
                style={{
                  height: HOUR_HEIGHT,
                  fontSize: 11,
                  color: textDim,
                  borderTop: `1px solid ${border}`,
                  paddingTop: 2,
                }}
              >
                {h % 12 === 0 ? 12 : h % 12}
                {h >= 12 ? "PM" : "AM"}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((day) => {
            const dayBlocks = blocks.filter((b) => b.day_of_week === day.value);
            const daySessions = thisWeekSessions.filter((s) => sessionTimeRange(s).dayOfWeek === day.value);
            return (
              <div key={day.value} style={{ flex: 1, minWidth: 90 }}>
                <div
                  style={{
                    height: 28,
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: textDim,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {day.label}
                </div>
                <div
                  style={{
                    position: "relative",
                    height: gridHeight,
                    borderLeft: `1px solid ${border}`,
                  }}
                >
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      style={{
                        position: "absolute",
                        top: i * HOUR_HEIGHT,
                        left: 0,
                        right: 0,
                        borderTop: `1px solid ${border}`,
                      }}
                    />
                  ))}
                  {dayBlocks.map((b) => {
                    const top =
                      ((minutesSinceMidnight(b.start_time) - gridStartMinutes) / 60) * HOUR_HEIGHT;
                    const height =
                      ((minutesSinceMidnight(b.end_time) - minutesSinceMidnight(b.start_time)) / 60) *
                      HOUR_HEIGHT;
                    const color = courseColor(b.course_id);
                    return (
                      <div
                        key={b.id}
                        style={{
                          position: "absolute",
                          top,
                          height: Math.max(height, 24),
                          left: 3,
                          right: 3,
                          background: bg,
                          border: `1px solid ${color}`,
                          borderLeft: `3px solid ${color}`,
                          borderRadius: "var(--radius-sm)",
                          padding: "4px 6px",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => removeBlock(b.id)}
                          aria-label={`Remove ${courseName(b.course_id)} from schedule`}
                          style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            background: "none",
                            border: "none",
                            color: textDim,
                            cursor: "pointer",
                            display: "flex",
                            padding: 2,
                          }}
                        >
                          <X size={11} strokeWidth={2.5} />
                        </button>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: text,
                            lineHeight: 1.3,
                            paddingRight: 12,
                          }}
                        >
                          {courseName(b.course_id)}
                        </div>
                        <div style={{ fontSize: 10, color: textDim, marginTop: 2 }}>
                          {formatTime12h(b.start_time)}–{formatTime12h(b.end_time)}
                        </div>
                      </div>
                    );
                  })}
                  {daySessions.map((s) => {
                    const { startMinutes, endMinutes } = sessionTimeRange(s);
                    const top = ((startMinutes - gridStartMinutes) / 60) * HOUR_HEIGHT;
                    const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
                    const color = courseColor(s.course_id);
                    return (
                      <div
                        key={s.id}
                        title={`Studied ${courseName(s.course_id)} for ${s.duration_minutes} min`}
                        style={{
                          position: "absolute",
                          top,
                          height: Math.max(height, 20),
                          left: 3,
                          right: 3,
                          background: color,
                          borderRadius: "var(--radius-sm)",
                          padding: "3px 6px",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Timer size={10} strokeWidth={2.5} color="white" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {courseName(s.course_id)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {view === "month" && (
        <ScheduleMonthView
          blocks={blocks}
          sessions={sessions}
          courseColor={courseColor}
          courseName={courseName}
          onRemoveBlock={removeBlock}
        />
      )}

      <div style={{ marginTop: 24 }}>
        <StudyStats sessions={sessions} courseName={courseName} courseColor={courseColor} />
      </div>
    </>
  );
}
