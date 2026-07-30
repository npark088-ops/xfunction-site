"use client";

import Link from "next/link";
import { useMemo } from "react";
import { mockAssignmentGroups } from "../../lib/mock-canvas-data";
import { calculateCurrentGrade } from "../../lib/grade-calculator";

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

export default function AppPage() {
  const apBioGrade = useMemo(() => calculateCurrentGrade(mockAssignmentGroups), []);

  const courses = [
    { id: 1, name: "AP Biology", grade: apBioGrade },
    { id: 2, name: "US History", grade: 82.4 },
    { id: 3, name: "Algebra II", grade: 91.2 },
  ];

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
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* HEADER */}
        <div style={{ marginBottom: 8, color: textDim, fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          xFunction · App
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>
          Your courses
        </h1>
        <p style={{ color: textDim, marginBottom: 32, fontSize: 15 }}>
          Linked from Canvas · updated just now
        </p>

        {/* INTERNAL NAV */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 36,
            borderBottom: `1px solid ${border}`,
            paddingBottom: 20,
          }}
        >
          <Link
            href="/tasks"
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              background: card,
              border: `1px solid ${border}`,
              color: "white",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Tasks
          </Link>
          <Link
            href="/grades"
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              background: card,
              border: `1px solid ${border}`,
              color: "white",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Grades
          </Link>
        </div>

        {/* COURSE CARDS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          {courses.map((c) => (
            <Link
              key={c.id}
              href="/grades"
              className="course-card"
              style={{
                display: "block",
                background: card,
                border: `1px solid ${border}`,
                borderRadius: 16,
                padding: 24,
                textDecoration: "none",
                color: "white",
              }}
            >
              <div style={{ fontSize: 13, color: textDim, marginBottom: 10 }}>
                Course
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 18 }}>
                {c.name}
              </h2>
              <div style={{ fontSize: 13, color: textDim, marginBottom: 2 }}>
                Current grade
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 26,
                  fontWeight: 600,
                  color: gradeColor(c.grade),
                }}
              >
                {c.grade.toFixed(1)}%
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
