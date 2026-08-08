"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { BarChart3, Award } from "lucide-react";
import { weeklyTotals, minutesByCourse, totalMinutes, formatDuration, type StudySession } from "../lib/study-sessions";
import { resolveCssVar } from "../lib/theme-color";

ChartJS.register(BarElement, LinearScale, CategoryScale, Tooltip);

const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

const WEEKS_SHOWN = 8;

// Trends over time for logged study sessions — how many hours per week,
// and which course gets the most study time overall. Lives on the
// Schedule page below the calendar (both feed off the same sessions the
// week/month views place on specific days) — see ScheduleGrid.tsx.
export function StudyStats({
  sessions,
  courseName,
  courseColor,
}: {
  sessions: StudySession[];
  courseName: (courseId: string) => string;
  courseColor: (courseId: string) => string;
}) {
  const weeks = useMemo(() => weeklyTotals(sessions, WEEKS_SHOWN), [sessions]);
  const byCourse = useMemo(() => minutesByCourse(sessions), [sessions]);
  const allTimeTotal = useMemo(() => totalMinutes(sessions), [sessions]);

  const colors = useMemo(
    () => ({
      blue: resolveCssVar("--blue", "#2563EB"),
      border: resolveCssVar("--border", "#E2E8F0"),
      bg: resolveCssVar("--bg", "#FFFFFF"),
      text: resolveCssVar("--text", "#0F172A"),
      textDim: resolveCssVar("--text-dim", "#64748B"),
    }),
    []
  );

  const chartData = {
    labels: weeks.map((w) => w.label),
    datasets: [
      {
        data: weeks.map((w) => Math.round((w.minutes / 60) * 10) / 10),
        backgroundColor: colors.blue,
        borderRadius: 4,
        maxBarThickness: 28,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderWidth: 1,
        titleColor: colors.text,
        bodyColor: colors.blue,
        padding: 10,
        callbacks: {
          label: (ctx: TooltipItem<"bar">) => `${ctx.parsed.y}h studied`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: colors.textDim, font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: colors.border },
        ticks: { color: colors.textDim, font: { size: 11 }, callback: (v: string | number) => `${v}h` },
      },
    },
  };

  return (
    <div
      className="xf-card"
      style={{
        background: card,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-lg)",
        padding: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <BarChart3 size={16} strokeWidth={2} color={blue} />
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: text }}>Study stats</h2>
      </div>
      <p style={{ fontSize: 13, color: textDim, margin: "2px 0 20px" }}>
        {allTimeTotal === 0
          ? "Complete a focus session from a study plan step to start building your history."
          : `${formatDuration(allTimeTotal)} logged in total, across ${byCourse.length} course${byCourse.length === 1 ? "" : "s"}.`}
      </p>

      {allTimeTotal > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: textDim, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
            Hours studied per week
          </div>
          <div style={{ height: 160, marginBottom: 28 }}>
            <Bar data={chartData} options={chartOptions} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Award size={14} strokeWidth={2} color={blue} />
            <div style={{ fontSize: 12, fontWeight: 700, color: textDim, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Time by course (all time)
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {byCourse.map((entry, i) => {
              const share = allTimeTotal > 0 ? (entry.minutes / allTimeTotal) * 100 : 0;
              return (
                <div key={entry.courseId}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, color: text, fontWeight: 600 }}>
                      {i === 0 && <Award size={12} strokeWidth={2.25} color={blue} />}
                      {courseName(entry.courseId)}
                    </span>
                    <span style={{ color: textDim }}>{formatDuration(entry.minutes)}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--bg)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.max(share, 4)}%`,
                        background: courseColor(entry.courseId),
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
