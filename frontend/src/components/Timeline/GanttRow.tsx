import type { Assignment, CalendarConfig, Mode, Phase } from "../../api/types";
import { useScheduleStore } from "../../state/scheduleStore";

function pctForCalendar(value: string, calendar: CalendarConfig): number {
  const start = new Date(calendar.projectStart).getTime();
  const end = new Date(calendar.projectEnd).getTime();
  const v = new Date(value).getTime();
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, ((v - start) / (end - start)) * 100));
}

function pctForPhase(phaseId: string, phases: Phase[]): number {
  const idx = phases.findIndex((p) => p.id === phaseId);
  if (idx < 0 || phases.length === 0) return 0;
  return (idx / phases.length) * 100;
}

export function GanttRow({
  name,
  assignment,
  mode,
  calendar,
  phases,
}: {
  name: string;
  assignment: Assignment;
  mode: Mode;
  calendar: CalendarConfig;
  phases: Phase[];
}) {
  const removeAssignment = useScheduleStore((s) => s.removeAssignment);

  const startPct =
    mode === "calendar" ? pctForCalendar(assignment.appear, calendar) : pctForPhase(assignment.appear, phases);
  const endPct = assignment.disappear
    ? mode === "calendar"
      ? pctForCalendar(assignment.disappear, calendar)
      : pctForPhase(assignment.disappear, phases)
    : 100;

  const label =
    mode === "phase"
      ? `${phases.find((p) => p.id === assignment.appear)?.name ?? assignment.appear} → ${
          assignment.disappear ? phases.find((p) => p.id === assignment.disappear)?.name ?? assignment.disappear : "fin"
        }`
      : `${assignment.appear} → ${assignment.disappear ?? "fin"}`;

  return (
    <div className="gantt-row">
      <div className="gantt-row-label" title={assignment.primPath}>
        {name}
      </div>
      <div className="gantt-row-track">
        <div
          className="gantt-bar"
          style={{ left: `${startPct}%`, width: `${Math.max(1, endPct - startPct)}%` }}
          title={label}
        />
      </div>
      <button className="icon-btn icon-btn-danger" onClick={() => removeAssignment(assignment.primPath)} title="Retirer">
        ✕
      </button>
    </div>
  );
}
