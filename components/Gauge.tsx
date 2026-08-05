const border = "#232C45";
const cyan = "#5EEAD4";
const amber = "#F5A623";
const red = "#F16565";

export function gradeColor(pct: number) {
  if (pct >= 85) return cyan;
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
