const border = "var(--border)";
const green = "var(--green)";
const amber = "var(--amber)";
const red = "var(--red)";
const text = "var(--text)";

export function gradeColor(pct: number) {
  if (pct >= 85) return green;
  if (pct >= 70) return amber;
  return red;
}

export function Gauge({ percentage, size = 88 }: { percentage: number; size?: number }) {
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
        fill={text}
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
