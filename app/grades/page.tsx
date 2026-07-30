"use client";

import { useMemo, useState } from "react";
import { mockAssignmentGroups } from "../../lib/mock-canvas-data";
import {
  calculateCategoryBreakdown,
  calculateCurrentGrade,
  calculateNeededScore,
} from "../../lib/grade-calculator";

const bg = "#0B1120";
const card = "#141B2E";
const border = "#232C45";
const cyan = "#5EEAD4";
const amber = "#F5A623";
const red = "#F16565";
const textDim = "#8B94AC";

function gradeColor(pct: number) {
  if (pct >= 85) return cyan;
  if (pct >= 70) return amber;
  return red;
}

function Gauge({ percentage, size = 88 }: { percentage: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = circumference * (1 - clamped / 100);
  const color = gradeColor(clamped);

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={border} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize="20"
        fontFamily="'IBM Plex Mono', monospace"
        fontWeight="600"
        transform={`rotate(90, ${size / 2}, ${size / 2})`}
      >
        {Math.round(clamped)}
      </text>
    </svg>
  );
}

export default function GradesPage() {
  const [targetGrade, setTargetGrade] = useState(90);

  const currentGrade = useMemo(() => calculateCurrentGrade(mockAssignmentGroups), []);
  const breakdown = useMemo(() => calculateCategoryBreakdown(mockAssignmentGroups), []);

  // Find the next ungraded assignment to build the "what do I need" calculator around
  const nextUngraded = useMemo(() => {
    for (const group of mockAssignmentGroups) {
      for (const a of group.assignments) {
        if (!a.submission || a.submission.score === null) {
          return { groupName: group.name, assignment: a };
        }
      }
    }
    return null;
  }, []);

  const result = useMemo(() => {
    if (!nextUngraded) return null;
    try {
      return calculateNeededScore(mockAssignmentGroups, nextUngraded.assignment.id, targetGrade);
    } catch {
      return null;
    }
  }, [targetGrade, nextUngraded]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        color: "white",
        fontFamily: "Inter, sans-serif",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, color: textDim, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          xFunction · Grades
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>
          AP Biology
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
      </div>
    </div>
  );
}
