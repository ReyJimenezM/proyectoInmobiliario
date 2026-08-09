"use client";

export function ScoreGauge({
  score,
  maxScore = 1000,
  size = 148,
  label,
}: {
  score: number;
  maxScore?: number;
  size?: number;
  label?: string;
}) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, score / maxScore));
  const col =
    score >= maxScore * 0.78
      ? "#15803D"
      : score >= maxScore * 0.68
        ? "#C2410C"
        : score >= maxScore * 0.56
          ? "#B45309"
          : "#BC2C22";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F5F0EB" strokeWidth={11} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={11}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute text-center leading-tight">
        <span className="block text-3xl font-bold tracking-tight" style={{ color: col }}>
          {Math.round(score)}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          {label ?? `/ ${maxScore}`}
        </span>
      </div>
    </div>
  );
}
