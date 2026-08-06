"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { mockCourses } from "../../../../lib/mock-canvas-data";
import {
  calculateCategoryBreakdown,
  calculateCurrentGrade,
  calculateNeededScore,
} from "../../../../lib/grade-calculator";
import { findTargetAssignment } from "../../../../lib/study-target";
import { letterGradeFor } from "../../../../lib/grading-scale";
import { Gauge, gradeColor } from "../../../../components/Gauge";
import { getCourseGradeHistory, trendDirection } from "../../../../lib/grade-history";
import { TrendChart } from "../../../../components/TrendChart";
import { UpgradePrompt } from "../../../../components/UpgradePrompt";
import { FocusTimer } from "../../../../components/FocusTimer";
import { createClient } from "../../../../lib/supabase/client";

const bg = "var(--bg)";
const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const green = "var(--green)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

type StudyPlanDay = {
  date: string;
  label: string;
  tasks: string[];
};

type StudyPlan = {
  courseName: string;
  targetAssignment: string;
  targetGroup: string;
  targetDueDate: string;
  days: StudyPlanDay[];
};

type StudyGuideTopic = {
  title: string;
  explanation: string;
};

type StudyGuide = {
  courseName: string;
  targetAssignment: string;
  targetGroup: string;
  topics: StudyGuideTopic[];
};

const backLink = (
  <Link
    href="/courses"
    style={{
      display: "inline-block",
      color: blue,
      textDecoration: "none",
      fontSize: 14,
      fontWeight: 600,
      marginBottom: 20,
    }}
  >
    ← Back to courses
  </Link>
);

export default function GradesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const course = mockCourses[courseId];

  const [targetGrade, setTargetGrade] = useState(90);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [studyPlanLoading, setStudyPlanLoading] = useState(false);
  const [studyPlanError, setStudyPlanError] = useState<{
    kind: "error" | "upgrade";
    message: string;
  } | null>(null);

  const generateStudyPlan = async () => {
    setStudyPlanLoading(true);
    setStudyPlanError(null);
    try {
      const res = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStudyPlanError({
          kind: res.status === 402 ? "upgrade" : "error",
          message: data.message || data.error || "Failed to generate study plan",
        });
        return;
      }
      setStudyPlan(data);
    } catch {
      setStudyPlanError({ kind: "error", message: "Failed to generate study plan" });
    } finally {
      setStudyPlanLoading(false);
    }
  };

  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null);
  const [studyGuideLoading, setStudyGuideLoading] = useState(false);
  const [studyGuideError, setStudyGuideError] = useState<{
    kind: "error" | "upgrade";
    message: string;
  } | null>(null);

  const generateStudyGuide = async () => {
    setStudyGuideLoading(true);
    setStudyGuideError(null);
    try {
      const res = await fetch("/api/study-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStudyGuideError({
          kind: res.status === 402 ? "upgrade" : "error",
          message: data.message || data.error || "Failed to generate study guide",
        });
        return;
      }
      setStudyGuide(data);
    } catch {
      setStudyGuideError({ kind: "error", message: "Failed to generate study guide" });
    } finally {
      setStudyGuideLoading(false);
    }
  };

  const currentGrade = useMemo(
    () => (course ? calculateCurrentGrade(course.assignmentGroups) : 0),
    [course]
  );
  const letterGrade = useMemo(
    () => letterGradeFor(currentGrade, course?.gradingScale),
    [currentGrade, course]
  );
  const breakdown = useMemo(
    () => (course ? calculateCategoryBreakdown(course.assignmentGroups) : []),
    [course]
  );

  // Student's own "I've done this" tracking — separate from Canvas's
  // graded/ungraded state. Persisted in Supabase (assignment_completions,
  // see supabase/migrations/0004_assignment_completions.sql) so it
  // survives across visits, same pattern as the Tasks page.
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("assignment_completions")
      .select("assignment_id")
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }
        setCompletedIds(new Set((data ?? []).map((row: { assignment_id: number }) => row.assignment_id)));
      });
  }, []);

  const toggleAssignmentDone = (assignmentId: number) => {
    const supabase = createClient();
    const previous = completedIds;
    const isDone = previous.has(assignmentId);

    const next = new Set(previous);
    if (isDone) {
      next.delete(assignmentId);
    } else {
      next.add(assignmentId);
    }
    setCompletedIds(next);

    const request = isDone
      ? supabase.from("assignment_completions").delete().eq("assignment_id", assignmentId)
      : supabase.from("assignment_completions").upsert({ assignment_id: assignmentId });

    request.then(({ error }) => {
      if (error) {
        console.error(error);
        setCompletedIds(previous);
      }
    });
  };

  // Pomodoro-style focus timer, launched from a study plan step below.
  // Non-null taskLabel means the overlay is open.
  const [focusTask, setFocusTask] = useState<string | null>(null);

  // Per-course notes, persisted in Supabase (course_notes, see
  // supabase/migrations/0005_course_notes.sql). Loaded once on mount;
  // notesLoaded gates the autosave effect below so the initial fetch
  // doesn't immediately "save" the empty string back over real content.
  const [notes, setNotes] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [notesStatus, setNotesStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("course_notes")
      .select("content")
      .eq("course_id", courseId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
        }
        setNotes(data?.content ?? "");
        setNotesLoaded(true);
      });
  }, [courseId]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (notesLoaded) setNotesStatus("saving");
  };

  // Debounced autosave — waits for a pause in typing rather than
  // saving on every keystroke. The status update lives in the .then()
  // continuation (not synchronously in the effect body), which is what
  // keeps this safe to call from an effect.
  useEffect(() => {
    if (!notesLoaded) return;
    const timeout = setTimeout(() => {
      const supabase = createClient();
      supabase
        .from("course_notes")
        .upsert({ course_id: courseId, content: notes, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) console.error(error);
          setNotesStatus(error ? "error" : "saved");
        });
    }, 800);
    return () => clearTimeout(timeout);
  }, [notes, notesLoaded, courseId]);

  const gradeHistory = useMemo(
    () => (course ? getCourseGradeHistory(courseId, currentGrade) : []),
    [course, courseId, currentGrade]
  );
  const trend = useMemo(() => trendDirection(gradeHistory), [gradeHistory]);

  // Find the next ungraded assignment to build the "what do I need" calculator around
  const nextUngraded = useMemo(() => {
    if (!course) return null;
    for (const group of course.assignmentGroups) {
      for (const a of group.assignments) {
        if (!a.submission || a.submission.score === null) {
          return { groupName: group.name, assignment: a };
        }
      }
    }
    return null;
  }, [course]);

  // The study plan/guide target "next test or big assignment" — a
  // different (usually later) pick than nextUngraded above, which is
  // just whatever's due soonest regardless of size. Must match the
  // server's lib/study-target.ts exactly, since that's what the AI
  // actually generates content about — otherwise the heading here can
  // name one assignment while the AI writes about another.
  const studyTarget = useMemo(
    () => (course ? findTargetAssignment(course.assignmentGroups) : null),
    [course]
  );

  const result = useMemo(() => {
    if (!course || !nextUngraded) return null;
    try {
      return calculateNeededScore(course.assignmentGroups, nextUngraded.assignment.id, targetGrade);
    } catch {
      return null;
    }
  }, [course, targetGrade, nextUngraded]);

  if (!course) {
    return (
      <div
        style={{
          minHeight: "100vh",
          color: text,
          fontFamily: "Inter, sans-serif",
          padding: "48px 40px",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {backLink}
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, color: text }}>Course not found</h1>
          <p style={{ color: textDim, marginBottom: 24 }}>
            We don't have grade data for &ldquo;{courseId}&rdquo;.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        color: text,
        fontFamily: "Inter, sans-serif",
        padding: "48px 40px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {backLink}
        <div style={{ marginBottom: 8, color: textDim, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          xFunction · Grades
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em", color: text }}>
          {course.name}
        </h1>
        <p style={{ color: textDim, marginBottom: 36, fontSize: 15 }}>
          Linked from Canvas · updated just now
        </p>

        {/* Current grade + category breakdown */}
        <div
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 28,
            display: "flex",
            gap: 28,
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Gauge percentage={currentGrade} size={100} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: textDim, marginBottom: 2 }}>Current grade</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 28,
                  fontWeight: 600,
                  color: gradeColor(currentGrade),
                }}
              >
                {currentGrade.toFixed(1)}%
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: textDim }}>
                {letterGrade}
                {course.gradingScale && (
                  <span style={{ fontSize: 11, fontWeight: 500, color: textDim }}>
                    {" "}
                    · {course.gradingScale.name} scale
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {breakdown.map((c) => (
                <div key={c.groupId} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                  <span style={{ width: 90, color: textDim }}>{c.name}</span>
                  <div style={{ flex: 1, height: 5, background: border, borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${c.percentage ?? 0}%`,
                        height: "100%",
                        background: c.percentage !== null ? gradeColor(c.percentage) : border,
                      }}
                    />
                  </div>
                  <span style={{ width: 40, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: text }}>
                    {c.percentage !== null ? `${Math.round(c.percentage)}%` : "—"}
                  </span>
                  <span style={{ width: 32, textAlign: "right", color: textDim, fontSize: 12 }}>
                    {c.weight}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Assignments — done tracking, separate from grading state */}
        <div
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 28,
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 4, color: text }}>Assignments</h2>
          <p style={{ fontSize: 12, color: textDim, marginBottom: 18 }}>
            Check off assignments as you finish them — this tracks your own progress and doesn&apos;t
            depend on Canvas having graded it yet.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {course.assignmentGroups.map((group) => (
              <div key={group.id}>
                <div
                  style={{
                    fontSize: 12,
                    color: textDim,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 8,
                  }}
                >
                  {group.name}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.assignments.map((a) => {
                    const done = completedIds.has(a.id);
                    const graded = a.submission?.score != null;
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: bg,
                          border: `1px solid ${border}`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleAssignmentDone(a.id)}
                          aria-pressed={done}
                          aria-label={done ? `Mark ${a.name} not done` : `Mark ${a.name} done`}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            border: `1.5px solid ${done ? green : border}`,
                            background: done ? green : "transparent",
                            color: "white",
                            fontSize: 13,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                            padding: 0,
                          }}
                        >
                          {done ? "✓" : ""}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: done ? textDim : text,
                              textDecoration: done ? "line-through" : "none",
                            }}
                          >
                            {a.name}
                          </div>
                          <div style={{ fontSize: 12, color: textDim }}>
                            {a.due_at
                              ? new Date(a.due_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "No due date"}
                          </div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: textDim, whiteSpace: "nowrap" }}>
                          {graded ? `${a.submission!.score}/${a.points_possible}` : "Not graded"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grade trend */}
        <div
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 28,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: text }}>Grade trend</h2>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: trend === "up" ? green : trend === "down" ? red : textDim,
              }}
            >
              {trend === "up" ? "↑ Improving" : trend === "down" ? "↓ Declining" : "→ Steady"}
            </div>
          </div>
          <div style={{ fontSize: 12, color: textDim, marginBottom: 18 }}>
            ⚠ Simulated historical data — real Canvas grade history isn&apos;t connected yet.
          </div>
          <TrendChart points={gradeHistory} />
        </div>

        {/* The core feature: target grade calculator */}
        {nextUngraded && (
          <div
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: 16,
              padding: 28,
            }}
          >
            <div style={{ fontSize: 13, color: textDim, marginBottom: 4 }}>
              Next up · {nextUngraded.groupName}
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 20, color: text }}>
              {nextUngraded.assignment.name}
            </h2>

            <label style={{ fontSize: 13, color: textDim, display: "block", marginBottom: 8 }}>
              I want my overall grade to be
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <input
                type="range"
                min={0}
                max={100}
                value={targetGrade}
                onChange={(e) => setTargetGrade(Number(e.target.value))}
                style={{ flex: 1, accentColor: blue }}
              />
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 20,
                  fontWeight: 600,
                  width: 56,
                  textAlign: "right",
                  color: text,
                }}
              >
                {targetGrade}%
              </span>
            </div>

            {result && (
              <div
                style={{
                  background: bg,
                  border: `1px solid ${result.isAchievable ? border : red}`,
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                {result.isAchievable ? (
                  <>
                    <div style={{ fontSize: 13, color: textDim, marginBottom: 6 }}>
                      You need to score
                    </div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 32,
                        fontWeight: 700,
                        color: blue,
                      }}
                    >
                      {result.neededPoints} / {result.possiblePoints}
                      <span style={{ fontSize: 18, color: textDim, marginLeft: 10 }}>
                        ({result.neededPercentage}%)
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, color: red, marginBottom: 6, fontWeight: 600 }}>
                      Not mathematically possible from this one assignment
                    </div>
                    <div style={{ fontSize: 14, color: textDim, lineHeight: 1.5 }}>
                      Even a perfect score here won't reach {targetGrade}% right now. Try a lower
                      target, or check what it'd take across your remaining assignments.
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI-generated study plan */}
        {studyTarget && (
          <div
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: 16,
              padding: 28,
              marginTop: 24,
            }}
          >
            <div style={{ fontSize: 13, color: textDim, marginBottom: 4 }}>Study plan</div>
            <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 20, color: text }}>
              Prep for {studyTarget.assignment.name}
            </h2>

            {!studyPlan && (
              <button
                onClick={generateStudyPlan}
                disabled={studyPlanLoading}
                style={{
                  padding: "12px 20px",
                  borderRadius: 10,
                  background: blue,
                  color: "white",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: studyPlanLoading ? "default" : "pointer",
                  opacity: studyPlanLoading ? 0.7 : 1,
                }}
              >
                {studyPlanLoading ? "Generating…" : "Generate study plan"}
              </button>
            )}

            {studyPlanError?.kind === "upgrade" && (
              <div style={{ marginTop: 12 }}>
                <UpgradePrompt message={studyPlanError.message} />
              </div>
            )}
            {studyPlanError?.kind === "error" && (
              <div style={{ color: red, fontSize: 13, marginTop: 12 }}>{studyPlanError.message}</div>
            )}

            {studyPlan && (
              <>
                <p style={{ color: textDim, fontSize: 14, marginBottom: 24 }}>
                  {studyPlan.days.length}-day plan leading up to {studyPlan.targetDueDate}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {studyPlan.days.map((day) => (
                    <div
                      key={day.date}
                      style={{
                        background: bg,
                        border: `1px solid ${border}`,
                        borderRadius: 12,
                        padding: 18,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 13,
                          fontWeight: 600,
                          color: blue,
                          marginBottom: 10,
                        }}
                      >
                        {day.label}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                        {day.tasks.map((t, i) => (
                          <li
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 10,
                              fontSize: 14,
                              lineHeight: 1.5,
                              color: text,
                            }}
                          >
                            <span style={{ flex: 1 }}>• {t}</span>
                            <button
                              type="button"
                              onClick={() => setFocusTask(t)}
                              title="Start a focus timer for this step"
                              style={{
                                flexShrink: 0,
                                background: "transparent",
                                border: `1px solid ${blue}`,
                                color: blue,
                                borderRadius: 8,
                                padding: "3px 10px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              ⏱ Focus
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <button
                  onClick={generateStudyPlan}
                  disabled={studyPlanLoading}
                  style={{
                    marginTop: 20,
                    padding: "10px 18px",
                    borderRadius: 10,
                    background: "transparent",
                    color: blue,
                    border: `1px solid ${border}`,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: studyPlanLoading ? "default" : "pointer",
                  }}
                >
                  {studyPlanLoading ? "Regenerating…" : "Regenerate plan"}
                </button>
              </>
            )}
          </div>
        )}

        {/* AI-generated study guide */}
        {studyTarget && (
          <div
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: 16,
              padding: 28,
              marginTop: 24,
            }}
          >
            <div style={{ fontSize: 13, color: textDim, marginBottom: 4 }}>Study guide</div>
            <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 20, color: text }}>
              Key concepts for {studyTarget.assignment.name}
            </h2>

            {!studyGuide && (
              <button
                onClick={generateStudyGuide}
                disabled={studyGuideLoading}
                style={{
                  padding: "12px 20px",
                  borderRadius: 10,
                  background: blue,
                  color: "white",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: studyGuideLoading ? "default" : "pointer",
                  opacity: studyGuideLoading ? 0.7 : 1,
                }}
              >
                {studyGuideLoading ? "Generating…" : "Generate study guide"}
              </button>
            )}

            {studyGuideError?.kind === "upgrade" && (
              <div style={{ marginTop: 12 }}>
                <UpgradePrompt message={studyGuideError.message} />
              </div>
            )}
            {studyGuideError?.kind === "error" && (
              <div style={{ color: red, fontSize: 13, marginTop: 12 }}>{studyGuideError.message}</div>
            )}

            {studyGuide && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {studyGuide.topics.map((topic, i) => (
                    <div
                      key={i}
                      style={{
                        background: bg,
                        border: `1px solid ${border}`,
                        borderRadius: 12,
                        padding: 18,
                      }}
                    >
                      <h3
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: blue,
                          marginTop: 0,
                          marginBottom: 8,
                        }}
                      >
                        {topic.title}
                      </h3>
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: text, margin: 0 }}>
                        {topic.explanation}
                      </p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={generateStudyGuide}
                  disabled={studyGuideLoading}
                  style={{
                    marginTop: 20,
                    padding: "10px 18px",
                    borderRadius: 10,
                    background: "transparent",
                    color: blue,
                    border: `1px solid ${border}`,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: studyGuideLoading ? "default" : "pointer",
                  }}
                >
                  {studyGuideLoading ? "Regenerating…" : "Regenerate guide"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Notes — private per-user, per-course journal */}
        <div
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 28,
            marginTop: 24,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: text }}>Notes</h2>
            {notesLoaded && notesStatus !== "idle" && (
              <div style={{ fontSize: 12, color: notesStatus === "error" ? red : textDim }}>
                {notesStatus === "saving"
                  ? "Saving…"
                  : notesStatus === "saved"
                    ? "Saved"
                    : "Failed to save"}
              </div>
            )}
          </div>
          <p style={{ fontSize: 12, color: textDim, marginBottom: 14 }}>
            Private to you — jot down anything about this course (e.g. &ldquo;ask teacher about the
            curve&rdquo;).
          </p>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            disabled={!notesLoaded}
            placeholder={notesLoaded ? "Notes for this course…" : "Loading notes…"}
            rows={6}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 10,
              border: `1px solid ${border}`,
              background: bg,
              color: text,
              fontSize: 14,
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {focusTask !== null && (
        <FocusTimer taskLabel={focusTask} onClose={() => setFocusTask(null)} />
      )}
    </div>
  );
}
