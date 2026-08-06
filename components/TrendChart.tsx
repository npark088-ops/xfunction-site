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
import type { GradePoint } from "../lib/grade-history";
import { resolveCssVar } from "../lib/theme-color";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

function hexToRgba(hex: string, alpha: number): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return `rgba(37, 99, 235, ${alpha})`;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function TrendChart({ points, height = 160 }: { points: GradePoint[]; height?: number }) {
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

  const data = {
    labels: points.map((p) => p.label),
    datasets: [
      {
        data: points.map((p) => Math.round(p.percentage * 10) / 10),
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

  const options = {
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
          label: (ctx: TooltipItem<"line">) =>
            `${(Math.round((ctx.parsed.y as number) * 10) / 10).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: colors.border },
        ticks: { color: colors.textDim, font: { size: 11 } },
      },
      y: {
        grid: { color: colors.border },
        ticks: {
          color: colors.textDim,
          font: { size: 11 },
          callback: (value: string | number) =>
            `${(Math.round(Number(value) * 10) / 10).toFixed(1)}%`,
        },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Line data={data} options={options} />
    </div>
  );
}
