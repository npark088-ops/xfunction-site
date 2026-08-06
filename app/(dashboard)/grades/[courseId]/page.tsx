"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Check,
  Timer,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Target,
  Pencil,
  CheckCircle2,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
} from "lucide-react";
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
import { downloadGradePdf } from "../../../../lib/pdf-export";

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

type QuizQuestion = {
  question: string;
  answer: string;
};

type PracticeQuiz = {
  courseName: string;
  targetAssignment: string;
  targetGroup: string;
  questions: QuizQuestion[];
};

const backLink = (
  <Link
    href="/courses"
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      color: blue,
      textDecoration: "none",
      fontSize: 14,
      fontWeight: 600,
      marginBottom: 20,
    }}
  >
    <ArrowLeft size={15} strokeWidth={2.5} />
    Back to courses
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
      setPlanSaveStatus("idle");
    } catch {
      setStudyPlanError({ kind: "error", message: "Failed to generate study plan" });
    } finally {
      setStudyPlanLoading(false);
    }
  };

  // Saved/edited plans, persisted in Supabase (study_plans, see
  // supabase/migrations/0010_study_plans.sql) — without this, an
  // AI-generated (or hand-edited) plan would vanish on refresh.
  // planLoaded gates the "Generate study plan" button so it doesn't
  // flash before a previously-saved plan has had a chance to load.
  const [planLoaded, setPlanLoaded] = useState(false);
  const [planEditing, setPlanEditing] = useState(false);
  const [planSaveStatus, setPlanSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("study_plans")
      .select("plan")
      .eq("course_id", courseId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error(error);
        if (data?.plan) setStudyPlan(data.plan as StudyPlan);
        setPlanLoaded(true);
      });
  }, [courseId]);

  const saveStudyPlan = () => {
    if (!studyPlan) return;
    setPlanSaveStatus("saving");
    const supabase = createClient();
    supabase
      .from("study_plans")
      .upsert({ course_id: courseId, plan: studyPlan, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        setPlanSaveStatus(error ? "error" : "saved");
        if (error) console.error(error);
      });
  };

  const updatePlanTaskText = (dayIndex: number, taskIndex: number, value: string) => {
    setStudyPlan((prev) => {
      if (!prev) return prev;
      const days = prev.days.map((d, di) =>
        di !== dayIndex ? d : { ...d, tasks: d.tasks.map((t, ti) => (ti === taskIndex ? value : t)) }
      );
      return { ...prev, days };
    });
  };

  const removePlanTask = (dayIndex: number, taskIndex: number) => {
    setStudyPlan((prev) => {
      if (!prev) return prev;
      const days = prev.days.map((d, di) =>
        di !== dayIndex ? d : { ...d, tasks: d.tasks.filter((_, ti) => ti !== taskIndex) }
      );
      return { ...prev, days };
    });
  };

  const addPlanTask = (dayIndex: number) => {
    setStudyPlan((prev) => {
      if (!prev) return prev;
      const days = prev.days.map((d, di) => (di !== dayIndex ? d : { ...d, tasks: [...d.tasks, ""] }));
      return { ...prev, days };
    });
  };

  const movePlanTask = (dayIndex: number, taskIndex: number, direction: -1 | 1) => {
    setStudyPlan((prev) => {
      if (!prev) return prev;
      const day = prev.days[dayIndex];
      const target = taskIndex + direction;
      if (target < 0 || target >= day.tasks.length) return prev;

      const tasks = [...day.tasks];
      [tasks[taskIndex], tasks[target]] = [tasks[target], tasks[taskIndex]];

      const days = prev.days.map((d, di) => (di !== dayIndex ? d : { ...d, tasks }));
      return { ...prev, days };
    });
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

  const [quiz, setQuiz] = useState<PracticeQuiz | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<{ kind: "error" | "upgrade"; message: string } | null>(
    null
  );
  // Which questions currently have their answer showing — cleared on
  // regenerate so a fresh set of questions always starts hidden.
  const [revealedQuestions, setRevealedQuestions] = useState<Set<number>>(new Set());

  const generateQuiz = async () => {
    setQuizLoading(true);
    setQuizError(null);
    try {
      const res = await fetch("/api/practice-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuizError({
          kind: res.status === 402 ? "upgrade" : "error",
          message: data.message || data.error || "Failed to generate practice quiz",
        });
        return;
      }
      setQuiz(data);
      setRevealedQuestions(new Set());
    } catch {
      setQuizError({ kind: "error", message: "Failed to generate practice quiz" });
    } finally {
      setQuizLoading(false);
    }
  };

  const toggleRevealed = (index: number) => {
    setRevealedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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

  // Grade goal, persisted in Supabase (course_goals, see
  // supabase/migrations/0009_course_goals.sql). Loaded once on mount;
  // goalLoaded gates rendering the set-goal vs. edit-goal UI so it
  // doesn't flash the "no goal set" state for a returning goal.
  const [goal, setGoal] = useState<number | null>(null);
  const [goalLoaded, setGoalLoaded] = useState(false);
  const [goalInput, setGoalInput] = useState("90");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("course_goals")
      .select("target_grade")
      .eq("course_id", courseId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
        }
        if (data?.target_grade != null) {
          setGoal(data.target_grade);
          setGoalInput(String(data.target_grade));
          // Seeds the "what do I need on the next assignment" calculator
          // below with the same target the student already set for this
          // course, instead of always defaulting to 90 — only happens
          // once, right here on initial load, so it never fights with
          // the student's own later adjustments to that slider.
          setTargetGrade(data.target_grade);
        } else {
          setEditingGoal(true);
        }
        setGoalLoaded(true);
      });
  }, [courseId]);

  const saveGoal = () => {
    const value = Number(goalInput);
    if (!Number.isFinite(value) || value <= 0 || value > 100) return;

    setGoalSaving(true);
    const supabase = createClient();
    supabase
      .from("course_goals")
      .upsert({ course_id: courseId, target_grade: value, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        setGoalSaving(false);
        if (error) {
          console.error(error);
          return;
        }
        setGoal(value);
        setEditingGoal(false);
      });
  };

  // Pomodoro-style focus timer, launched from a study plan step below.
  // Non-null taskLabel means the overlay is open.
  const [focusTask, setFocusTask] = useState<string | null>(null);

  const [pdfGenerating, setPdfGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    if (!course) return;
    setPdfGenerating(true);
    try {
      await downloadGradePdf({
        courseName: course.name,
        currentGrade,
        letterGrade,
        breakdown: breakdown.map((c) => ({ name: c.name, percentage: c.percentage, weight: c.weight })),
        studyGuideTopics: studyGuide?.topics ?? null,
      });
    } finally {
      setPdfGenerating(false);
    }
  };

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
      className="xf-page-enter"
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em", color: text }}>
            {course.name}
          </h1>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfGenerating}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: "var(--radius-sm)",
              background: "transparent",
              border: `1px solid ${border}`,
              color: text,
              fontSize: 13,
              fontWeight: 600,
              cursor: pdfGenerating ? "default" : "pointer",
              opacity: pdfGenerating ? 0.7 : 1,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <Download size={14} strokeWidth={2} />
            {pdfGenerating ? "Preparing…" : "Download PDF"}
          </button>
        </div>
        <p style={{ color: textDim, marginBottom: 36, fontSize: 15 }}>
          Linked from Canvas · updated just now
        </p>

        {/* Current grade + category breakdown */}
        <div
          className="xf-card"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
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

        {/* Grade goal — persisted per course, progress updates live as currentGrade changes */}
        <div
          className="xf-card"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
            padding: 28,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: goalLoaded ? 18 : 0,
            }}
          >
            <h2
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 19,
                fontWeight: 600,
                margin: 0,
                color: text,
              }}
            >
              <Target size={17} strokeWidth={2} />
              Grade goal
            </h2>
            {goalLoaded && goal !== null && !editingGoal && (
              <button
                type="button"
                onClick={() => {
                  setGoalInput(String(goal));
                  setEditingGoal(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: "none",
                  color: blue,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Pencil size={12} strokeWidth={2} />
                Edit
              </button>
            )}
          </div>

          {goalLoaded && editingGoal && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <label style={{ fontSize: 13, color: textDim }}>I want to end up with</label>
              <input
                type="number"
                min={1}
                max={100}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                style={{
                  width: 72,
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${border}`,
                  background: bg,
                  color: text,
                  fontSize: 14,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              />
              <span style={{ fontSize: 13, color: textDim }}>% in {course.name}</span>
              <button
                type="button"
                onClick={saveGoal}
                disabled={goalSaving}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: blue,
                  color: "white",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: goalSaving ? "default" : "pointer",
                  opacity: goalSaving ? 0.7 : 1,
                }}
              >
                {goalSaving ? "Saving…" : "Save goal"}
              </button>
              {goal !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setGoalInput(String(goal));
                    setEditingGoal(false);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: textDim,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "8px 4px",
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {goalLoaded && goal !== null && !editingGoal && (
            <>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: textDim }}>
                  Target: <strong style={{ color: text }}>{goal}%</strong> · Currently{" "}
                  <strong style={{ color: gradeColor(currentGrade) }}>{currentGrade.toFixed(1)}%</strong>
                </div>
                {currentGrade >= goal ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: green }}>
                    <CheckCircle2 size={15} strokeWidth={2.5} />
                    Goal reached
                  </div>
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 700, color: blue }}>
                    {(goal - currentGrade).toFixed(1)} pts to go
                  </div>
                )}
              </div>
              <div style={{ height: 10, background: border, borderRadius: 999, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.min(100, (currentGrade / goal) * 100)}%`,
                    height: "100%",
                    background: currentGrade >= goal ? green : blue,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Assignments — done tracking, separate from grading state */}
        <div
          className="xf-card"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
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
                            borderRadius: "var(--radius-sm)",
                            border: `1.5px solid ${done ? green : border}`,
                            background: done ? green : "transparent",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                            padding: 0,
                          }}
                        >
                          {done && <Check size={14} strokeWidth={3} />}
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
          className="xf-card"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
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
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                fontWeight: 700,
                color: trend === "up" ? green : trend === "down" ? red : textDim,
              }}
            >
              {trend === "up" ? (
                <TrendingUp size={15} strokeWidth={2.5} />
              ) : trend === "down" ? (
                <TrendingDown size={15} strokeWidth={2.5} />
              ) : (
                <Minus size={15} strokeWidth={2.5} />
              )}
              {trend === "up" ? "Improving" : trend === "down" ? "Declining" : "Steady"}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: textDim,
              marginBottom: 18,
            }}
          >
            <AlertTriangle size={13} strokeWidth={2} />
            Simulated historical data — real Canvas grade history isn&apos;t connected yet.
          </div>
          <TrendChart points={gradeHistory} />
        </div>

        {/* The core feature: target grade calculator */}
        {nextUngraded && (
          <div
            className="xf-card"
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: "var(--radius-lg)",
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
            className="xf-card"
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: "var(--radius-lg)",
              padding: 28,
              marginTop: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: textDim }}>
                <Sparkles size={13} strokeWidth={2} />
                Study plan
              </div>
              {studyPlan && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {planSaveStatus !== "idle" && (
                    <span style={{ fontSize: 12, color: planSaveStatus === "error" ? red : textDim }}>
                      {planSaveStatus === "saving"
                        ? "Saving…"
                        : planSaveStatus === "saved"
                          ? "Saved"
                          : "Failed to save"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      saveStudyPlan();
                    }}
                    disabled={planSaveStatus === "saving"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "transparent",
                      border: "none",
                      color: blue,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: planSaveStatus === "saving" ? "default" : "pointer",
                      padding: 0,
                    }}
                  >
                    <Save size={13} strokeWidth={2} />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanEditing((v) => !v)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "transparent",
                      border: "none",
                      color: blue,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <Pencil size={12} strokeWidth={2} />
                    {planEditing ? "Done editing" : "Edit"}
                  </button>
                </div>
              )}
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 20, color: text }}>
              Prep for {studyTarget.assignment.name}
            </h2>

            {!studyPlan && !planLoaded && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="xf-skeleton" style={{ height: 40, width: 200 }} />
              </div>
            )}

            {!studyPlan && planLoaded && (
              <button
                onClick={generateStudyPlan}
                disabled={studyPlanLoading}
                style={{
                  padding: "12px 20px",
                  borderRadius: "var(--radius-sm)",
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
                  {planEditing && " — editing"}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {studyPlan.days.map((day, dayIndex) => (
                    <div
                      key={day.date}
                      style={{
                        background: bg,
                        border: `1px solid ${border}`,
                        borderRadius: "var(--radius-md)",
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
                      {planEditing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {day.tasks.map((t, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <input
                                value={t}
                                onChange={(e) => updatePlanTaskText(dayIndex, i, e.target.value)}
                                style={{
                                  flex: 1,
                                  padding: "8px 10px",
                                  borderRadius: "var(--radius-sm)",
                                  border: `1px solid ${border}`,
                                  background: card,
                                  color: text,
                                  fontSize: 13,
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => movePlanTask(dayIndex, i, -1)}
                                disabled={i === 0}
                                title="Move up"
                                style={{
                                  display: "flex",
                                  background: "transparent",
                                  border: `1px solid ${border}`,
                                  borderRadius: "var(--radius-sm)",
                                  color: text,
                                  padding: 6,
                                  cursor: i === 0 ? "default" : "pointer",
                                  opacity: i === 0 ? 0.4 : 1,
                                }}
                              >
                                <ChevronUp size={13} strokeWidth={2} />
                              </button>
                              <button
                                type="button"
                                onClick={() => movePlanTask(dayIndex, i, 1)}
                                disabled={i === day.tasks.length - 1}
                                title="Move down"
                                style={{
                                  display: "flex",
                                  background: "transparent",
                                  border: `1px solid ${border}`,
                                  borderRadius: "var(--radius-sm)",
                                  color: text,
                                  padding: 6,
                                  cursor: i === day.tasks.length - 1 ? "default" : "pointer",
                                  opacity: i === day.tasks.length - 1 ? 0.4 : 1,
                                }}
                              >
                                <ChevronDown size={13} strokeWidth={2} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removePlanTask(dayIndex, i)}
                                title="Remove step"
                                style={{
                                  display: "flex",
                                  background: "transparent",
                                  border: `1px solid ${red}`,
                                  borderRadius: "var(--radius-sm)",
                                  color: red,
                                  padding: 6,
                                  cursor: "pointer",
                                }}
                              >
                                <Trash2 size={13} strokeWidth={2} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addPlanTask(dayIndex)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              alignSelf: "flex-start",
                              background: "transparent",
                              border: `1px dashed ${border}`,
                              borderRadius: "var(--radius-sm)",
                              color: blue,
                              padding: "6px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              marginTop: 2,
                            }}
                          >
                            <Plus size={13} strokeWidth={2} />
                            Add step
                          </button>
                        </div>
                      ) : (
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
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  flexShrink: 0,
                                  background: "transparent",
                                  border: `1px solid ${blue}`,
                                  color: blue,
                                  borderRadius: "var(--radius-sm)",
                                  padding: "3px 10px",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Timer size={12} strokeWidth={2} />
                                Focus
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={generateStudyPlan}
                  disabled={studyPlanLoading}
                  style={{
                    marginTop: 20,
                    padding: "10px 18px",
                    borderRadius: "var(--radius-sm)",
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
            className="xf-card"
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: "var(--radius-lg)",
              padding: 28,
              marginTop: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: textDim,
                marginBottom: 4,
              }}
            >
              <Sparkles size={13} strokeWidth={2} />
              Study guide
            </div>
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

        {/* AI-generated practice quiz */}
        {studyTarget && (
          <div
            className="xf-card"
            style={{
              background: card,
              border: `1px solid ${border}`,
              borderRadius: "var(--radius-lg)",
              padding: 28,
              marginTop: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: textDim,
                marginBottom: 4,
              }}
            >
              <Sparkles size={13} strokeWidth={2} />
              Practice quiz
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 20, color: text }}>
              Test yourself on {studyTarget.assignment.name}
            </h2>

            {!quiz && (
              <button
                onClick={generateQuiz}
                disabled={quizLoading}
                style={{
                  padding: "12px 20px",
                  borderRadius: "var(--radius-sm)",
                  background: blue,
                  color: "white",
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: quizLoading ? "default" : "pointer",
                  opacity: quizLoading ? 0.7 : 1,
                }}
              >
                {quizLoading ? "Generating…" : "Generate practice quiz"}
              </button>
            )}

            {quizError?.kind === "upgrade" && (
              <div style={{ marginTop: 12 }}>
                <UpgradePrompt message={quizError.message} />
              </div>
            )}
            {quizError?.kind === "error" && (
              <div style={{ color: red, fontSize: 13, marginTop: 12 }}>{quizError.message}</div>
            )}

            {quiz && (
              <>
                <p style={{ color: textDim, fontSize: 14, marginBottom: 24 }}>
                  {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"} — click a
                  question to reveal its answer.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {quiz.questions.map((q, i) => {
                    const revealed = revealedQuestions.has(i);
                    return (
                      <div
                        key={i}
                        style={{
                          background: bg,
                          border: `1px solid ${border}`,
                          borderRadius: "var(--radius-md)",
                          padding: 16,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleRevealed(i)}
                          style={{
                            display: "flex",
                            width: "100%",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 12,
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 600, color: text, lineHeight: 1.5 }}>
                            {i + 1}. {q.question}
                          </span>
                          <span style={{ flexShrink: 0, color: blue, marginTop: 2 }}>
                            {revealed ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                          </span>
                        </button>
                        {revealed && (
                          <div
                            style={{
                              marginTop: 12,
                              paddingTop: 12,
                              borderTop: `1px solid ${border}`,
                              fontSize: 14,
                              lineHeight: 1.6,
                              color: textDim,
                            }}
                          >
                            {q.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={generateQuiz}
                  disabled={quizLoading}
                  style={{
                    marginTop: 20,
                    padding: "10px 18px",
                    borderRadius: "var(--radius-sm)",
                    background: "transparent",
                    color: blue,
                    border: `1px solid ${border}`,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: quizLoading ? "default" : "pointer",
                  }}
                >
                  {quizLoading ? "Regenerating…" : "Regenerate quiz"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Notes — private per-user, per-course journal */}
        <div
          className="xf-card"
          style={{
            background: card,
            border: `1px solid ${border}`,
            borderRadius: "var(--radius-lg)",
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
