interface Props {
  projectStart: string;
  projectEnd: string;
}

function monthTicks(start: Date, end: Date): { label: string; pct: number }[] {
  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) return [];
  const ticks: { label: string; pct: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  if (cursor < start) cursor.setMonth(cursor.getMonth() + 1);
  while (cursor <= end) {
    const pct = ((cursor.getTime() - start.getTime()) / totalMs) * 100;
    ticks.push({
      label: cursor.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      pct,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
}

export function DateAxis({ projectStart, projectEnd }: Props) {
  const start = new Date(projectStart);
  const end = new Date(projectEnd);
  const ticks = monthTicks(start, end);

  return (
    <div className="timeline-axis">
      {ticks.map((tick) => (
        <div key={tick.label + tick.pct} className="axis-tick" style={{ left: `${tick.pct}%` }}>
          <span className="axis-tick-label">{tick.label}</span>
        </div>
      ))}
    </div>
  );
}
