"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { mockCourses } from "../../../../lib/mock-canvas-data";
import {
  calculateCategoryBreakdown,
  calculateCurrentGrade,
  calculateNeededScore,
} from "../../../../lib/grade-calculator";
import { findTargetAssignment } from "../../../../lib/study-target";
import { Gauge, gradeColor } from "../../../../components/Gauge";
import { getCourseGradeHistory, trendDirection } from "../../../../lib/grade-history";
import { TrendChart } from "../../../../components/TrendChart";
import { UpgradePrompt } from "../../../../components/UpgradePrompt";

const amber = "#F5A623";

const bg = "#0B1120";
const card = "#141B2E";
const border = "#232C45";
const cyan = "#5EEAD4";
const red = "#F16565";
const textDim = "#8B94AC";

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
      color: cyan,
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
  const breakdown = useMemo(
    () => (course ? calculateCategoryBreakdown(course.assignmentGroups) : []),
    [course]
  );

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
          color: "white",
          fontFamily: "Inter, sans-serif",
          padding: "48px 40px",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {backLink}
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Course not found</h1>
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
        color: "white",
        fontFamily: "Inter, sans-serif",
        padding: "48px 40px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {backLink}
        <div style={{ marginBottom: 8, color: textDim, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          xFunction · Grades
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>
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
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 28,
                fontWeight: 600,
                color: gradeColor(currentGrade),
                marginBottom: 12,
              }}
            >
              {currentGrade.toFixed(1)}%
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
                  <span style={{ width: 40, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>
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
            <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>Grade trend</h2>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: trend === "up" ? cyan : trend === "down" ? red : amber,
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
            <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 20 }}>
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
                style={{ flex: 1, accentColor: cyan }}
              />
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 20,
                  fontWeight: 600,
                  width: 56,
                  textAlign: "right",
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
                        color: cyan,
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
            <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 20 }}>
              Prep for {studyTarget.assignment.name}
            </h2>

            {!studyPlan && (
              <button
                onClick={generateStudyPlan}
                disabled={studyPlanLoading}
                style={{
                  padding: "12px 20px",
                  borderRadius: 10,
                  background: cyan,
                  color: "#0B1120",
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
                          color: cyan,
                          marginBottom: 10,
                        }}
                      >
                        {day.label}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                        {day.tasks.map((t, i) => (
                          <li key={i} style={{ fontSize: 14, lineHeight: 1.5 }}>
                            {t}
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
                    color: cyan,
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
            <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 20 }}>
              Key concepts for {studyTarget.assignment.name}
            </h2>

            {!studyGuide && (
              <button
                onClick={generateStudyGuide}
                disabled={studyGuideLoading}
                style={{
                  padding: "12px 20px",
                  borderRadius: 10,
                  background: cyan,
                  color: "#0B1120",
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
                          color: cyan,
                          marginTop: 0,
                          marginBottom: 8,
                        }}
                      >
                        {topic.title}
                      </h3>
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: "white", margin: 0 }}>
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
                    color: cyan,
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
      </div>
    </div>
  );
}
