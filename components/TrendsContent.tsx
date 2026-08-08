"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  type TooltipItem,
} from "chart.js";
import { TrendingUp, TrendingDown, Minus, Clock, CalendarClock, AlertTriangle, Sparkles } from "lucide-react";
import {
  minutesByWeekday,
  minutesByTimeOfDay,
  minutesByCourse,
  weeklyTotals,
  weeklyTrendDirection,
  totalMinutes,
  formatDuration,
  WEEKDAY_LABELS,
  type StudySession,
} from "../lib/study-sessions";
import { gradeColor } from "./Gauge";
import { resolveCssVar } from "../lib/theme-color";
import { courseColor } from "../lib/course-colors";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

const card = "var(--card)";
const border = "var(--border)";
const blue = "var(--blue)";
const green = "var(--green)";
const red = "var(--red)";
const text = "var(--text)";
const textDim = "var(--text-dim)";

const WEEKS_SHOWN = 10;

export interface CourseSummary {
  id: string;
  name: string;
  grade: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return `rgba(37, 99, 235, ${alpha})`;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: textDim,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  marginBottom: 14,
};

const cardStyle = {
  background: card,
  border: `1px solid ${border}`,
  borderRadius: "var(--radius-lg)",
  padding: 24,
  marginBottom: 24,
};

export function TrendsContent({
  sessions,
  courses,
}: {
  sessions: StudySession[];
  courses: CourseSummary[];
}) {
  const total = useMemo(() => totalMinutes(sessions), [sessions]);

  // --- Peak productivity windows ---
  const weekdayMinutes = useMemo(() => minutesByWeekday(sessions), [sessions]);
  const timeBuckets = useMemo(() => minutesByTimeOfDay(sessions), [sessions]);
  const peakDayIndex = weekdayMinutes.indexOf(Math.max(...weekdayMinutes));
  const peakBucket = timeBuckets.reduce((a, b) => (b.minutes > a.minutes ? b : a), timeBuckets[0]);
  const maxWeekdayMinutes = Math.max(...weekdayMinutes, 1);
  const maxBucketMinutes = Math.max(...timeBuckets.map((b) => b.minutes), 1);

  // --- Consistency trend ---
  const weeks = useMemo(() => weeklyTotals(sessions, WEEKS_SHOWN), [sessions]);
  const trend = useMemo(() => weeklyTrendDirection(weeks), [weeks]);

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

  const lineData = {
    labels: weeks.map((w) => w.label),
    datasets: [
      {
        data: weeks.map((w) => Math.round((w.minutes / 60) * 10) / 10),
        borderColor: colors.blue,
        backgroundColor: hexToRgba(colors.blue, 0.08),
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: colors.blue,
        pointBorderColor: colors.blue,
        borderWidth: 2,
      },
    ],
  };

  const lineOptions = {
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
          label: (ctx: TooltipItem<"line">) => `${ctx.parsed.y}h studied`,
        },
      },
    },
    scales: {
      x: { grid: { color: colors.border }, ticks: { color: colors.textDim, font: { size: 11 } } },
      y: {
        beginAtZero: true,
        grid: { color: colors.border },
        ticks: { color: colors.textDim, font: { size: 11 }, callback: (v: string | number) => `${v}h` },
      },
    },
  };

  const trendLabel =
    trend === "up" ? "Trending up" : trend === "down" ? "Trending down" : trend === "steady" ? "Steady" : "Not enough data yet";
  const trendColor = trend === "up" ? green : trend === "down" ? red : textDim;
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  // --- Course attention vs. grade ---
  const byCourse = useMemo(() => minutesByCourse(sessions), [sessions]);
  const averageGrade = courses.length
    ? courses.reduce((sum, c) => sum + c.grade, 0) / courses.length
    : 0;
  const expectedShare = courses.length ? 1 / courses.length : 0;

  const courseRows = courses
    .map((c) => {
      const minutes = byCourse.find((b) => b.courseId === c.id)?.minutes ?? 0;
      const share = total > 0 ? minutes / total : 0;
      const flagged = total > 0 && c.grade < averageGrade && share < expectedShare * 0.75;
      return { ...c, minutes, share, flagged };
    })
    .sort((a, b) => a.minutes - b.minutes);

  const hasData = sessions.length > 0;

  return (
    <>
      {/* PEAK PRODUCTIVITY WINDOWS */}
      <div className="xf-card" style={cardStyle}>
        <div style={sectionHeader}>
          <Clock size={14} strokeWidth={2} />
          Peak productivity windows
        </div>
        {!hasData ? (
          <div style={{ fontSize: 14, color: textDim }}>
            Complete a few focus sessions and this will show when you tend to study most.
          </div>
        ) : (
          <>
            <p style={{ fontSize: 14, color: text, marginTop: 0, marginBottom: 20, lineHeight: 1.6 }}>
              <Sparkles size={13} strokeWidth={2} color={blue} style={{ verticalAlign: -1, marginRight: 4 }} />
              You study most on <strong>{WEEKDAY_LABELS[peakDayIndex]}s</strong>, usually in the{" "}
              <strong>{peakBucket.label.toLowerCase()}</strong>.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: textDim, marginBottom: 10 }}>By day of week</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {WEEKDAY_LABELS.map((label, i) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 30, fontSize: 11, color: textDim }}>{label}</div>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--bg)", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.max((weekdayMinutes[i] / maxWeekdayMinutes) * 100, weekdayMinutes[i] > 0 ? 4 : 0)}%`,
                            background: i === peakDayIndex ? blue : "var(--border)",
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: textDim, marginBottom: 10 }}>By time of day</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {timeBuckets.map((b) => (
                    <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 68, fontSize: 11, color: textDim }}>{b.label}</div>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--bg)", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.max((b.minutes / maxBucketMinutes) * 100, b.minutes > 0 ? 4 : 0)}%`,
                            background: b.label === peakBucket.label ? blue : "var(--border)",
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CONSISTENCY TREND */}
      <div className="xf-card" style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          <div style={sectionHeader}>
            <CalendarClock size={14} strokeWidth={2} />
            Consistency over time
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: trendColor }}>
            <TrendIcon size={15} strokeWidth={2.5} />
            {trendLabel}
          </div>
        </div>
        {!hasData ? (
          <div style={{ fontSize: 14, color: textDim }}>
            Your weekly study hours will start trending here once you&apos;ve logged a few sessions.
          </div>
        ) : (
          <div style={{ height: 180, marginTop: 12 }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        )}
      </div>

      {/* COURSE ATTENTION VS. GRADE */}
      <div className="xf-card" style={cardStyle}>
        <div style={sectionHeader}>
          <AlertTriangle size={14} strokeWidth={2} />
          Study time vs. grade, by course
        </div>
        <p style={{ fontSize: 13, color: textDim, marginTop: 0, marginBottom: 18 }}>
          {hasData
            ? "Courses below your average grade that are also getting a below-average share of your study time are flagged — the combination most worth a closer look."
            : "Once you've logged sessions across a few courses, this will flag any course that's both behind on grade and getting little study time."}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {courseRows.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: c.flagged ? "rgba(241, 101, 101, 0.06)" : "var(--bg)",
                border: `1px solid ${c.flagged ? red : border}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: text }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: courseColor(c.id),
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  {c.flagged && <AlertTriangle size={13} strokeWidth={2.5} color={red} style={{ flexShrink: 0 }} />}
                  {c.name}
                </div>
                {c.flagged && (
                  <div style={{ fontSize: 12, color: red, marginTop: 2 }}>
                    Below your average grade, and getting less study time than the other courses.
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 700, color: gradeColor(c.grade) }}>
                  {c.grade.toFixed(1)}%
                </div>
                <div style={{ fontSize: 11, color: textDim }}>{c.minutes > 0 ? formatDuration(c.minutes) : "No sessions yet"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
