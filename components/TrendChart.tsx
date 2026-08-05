"use client";

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

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

const cyan = "#5EEAD4";
const border = "#232C45";
const card = "#141B2E";
const textDim = "#8B94AC";

export function TrendChart({ points, height = 160 }: { points: GradePoint[]; height?: number }) {
  const data = {
    labels: points.map((p) => p.label),
    datasets: [
      {
        data: points.map((p) => Math.round(p.percentage * 10) / 10),
        borderColor: cyan,
        backgroundColor: "rgba(94, 234, 212, 0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: cyan,
        pointBorderColor: cyan,
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
        backgroundColor: card,
        borderColor: border,
        borderWidth: 1,
        titleColor: "white",
        bodyColor: cyan,
        padding: 10,
        callbacks: {
          label: (ctx: TooltipItem<"line">) =>
            `${(Math.round((ctx.parsed.y as number) * 10) / 10).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: border },
        ticks: { color: textDim, font: { size: 11 } },
      },
      y: {
        grid: { color: border },
        ticks: {
          color: textDim,
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
