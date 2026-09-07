import type { Phase } from "../../api/types";

export function PhaseAxis({ phases }: { phases: Phase[] }) {
  if (phases.length === 0) return <div className="timeline-axis" />;
  const step = 100 / phases.length;
  return (
    <div className="timeline-axis">
      {phases.map((phase, idx) => (
        <div key={phase.id} className="axis-tick" style={{ left: `${idx * step}%` }}>
          <span className="axis-tick-label">{phase.name}</span>
        </div>
      ))}
    </div>
  );
}
