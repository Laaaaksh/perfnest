function scoreColor(score: number): string {
  if (score >= 90) return "var(--good)";
  if (score >= 50) return "var(--mid)";
  return "var(--bad)";
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-sm text-[var(--text-dim)]">—</span>;
  }

  const color = scoreColor(score);

  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
      style={{ border: `2px solid ${color}`, color }}
    >
      {Math.round(score)}
    </span>
  );
}
