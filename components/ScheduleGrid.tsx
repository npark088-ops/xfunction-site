"use client";

import { useState } from "react";
import { Plus, X, CalendarDays } from "lucide-react";
import { createClient } from "../lib/supabase/client";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const green = "var(--green)";
const amber = "var(--amber)";
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

// Cycles through the app's existing accent colors rather than
// introducing new ones — keeps courses visually distinct without
// breaking from the current color scheme.
const COURSE_COLORS = [blue, green, amber, red];

function minutesSinceMidnight(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatTime12h(time: string): string {
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
}: {
  courses: CourseOption[];
  initialBlocks: ScheduleBlock[];
}) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(initialBlocks);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:50");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const courseColor = (id: string) => {
    const index = courses.findIndex((c) => c.id === id);
    return COURSE_COLORS[index % COURSE_COLORS.length] ?? blue;
  };
  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? id;

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

      {/* Weekly grid */}
      {blocks.length === 0 ? (
        <div
          className="xf-card"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
            padding: 40,
            textAlign: "center",
            color: textDim,
          }}
        >
          <CalendarDays size={28} strokeWidth={1.5} style={{ marginBottom: 10, opacity: 0.6 }} />
          <div style={{ fontSize: 14 }}>
            No class times added yet — use the form above to build out your week.
          </div>
        </div>
      ) : (
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
