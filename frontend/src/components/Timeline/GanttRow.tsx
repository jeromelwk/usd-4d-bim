import { useRef } from "react";
import type { Assignment, CalendarConfig, Mode, Phase } from "../../api/types";
import { useScheduleStore } from "../../state/scheduleStore";
import {
  calendarDateToPct,
  phaseIdToPct,
  pctToCalendarDate,
  pctToPhaseId,
} from "../../utils/ganttScale";

function pctFor(mode: Mode, value: string, calendar: CalendarConfig, phases: Phase[]): number {
  return mode === "calendar" ? calendarDateToPct(value, calendar) : phaseIdToPct(value, phases);
}

function valueFromPct(mode: Mode, pct: number, calendar: CalendarConfig, phases: Phase[]): string | null {
  return mode === "calendar" ? pctToCalendarDate(pct, calendar) : pctToPhaseId(pct, phases);
}

const MIN_GAP_PCT = 2;

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
  const updateAssignmentField = useScheduleStore((s) => s.updateAssignmentField);
  const trackRef = useRef<HTMLDivElement>(null);

  const startPct = pctFor(mode, assignment.appear, calendar, phases);
  const endPct = assignment.disappear ? pctFor(mode, assignment.disappear, calendar, phases) : 100;

  const label =
    mode === "phase"
      ? `${phases.find((p) => p.id === assignment.appear)?.name ?? assignment.appear} → ${
          assignment.disappear ? phases.find((p) => p.id === assignment.disappear)?.name ?? assignment.disappear : "fin"
        }`
      : `${assignment.appear} → ${assignment.disappear ?? "fin"}`;

  function pctFromClientX(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  }

  function handleHandleDrag(edge: "appear" | "disappear") {
    return (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      const onMove = (moveEvent: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
        const pct = pctFromClientX(moveEvent.clientX);
        if (edge === "appear") {
          const clamped = Math.min(pct, endPct - MIN_GAP_PCT);
          const value = valueFromPct(mode, clamped, calendar, phases);
          if (value) updateAssignmentField(assignment.primPath, "appear", value);
        } else {
          const clamped = Math.max(pct, startPct + MIN_GAP_PCT);
          const value = valueFromPct(mode, clamped, calendar, phases);
          if (value) updateAssignmentField(assignment.primPath, "disappear", value);
        }
      };

      const target = e.currentTarget;
      const onUp = () => {
        target.removeEventListener("pointermove", onMove as (ev: PointerEvent) => void);
        target.removeEventListener("pointerup", onUp);
      };
      target.addEventListener("pointermove", onMove as (ev: PointerEvent) => void);
      target.addEventListener("pointerup", onUp);
    };
  }

  return (
    <div className="gantt-row">
      <div className="gantt-row-label" title={assignment.primPath}>
        {name}
      </div>
      <div className="gantt-row-track" ref={trackRef}>
        <div
          className="gantt-bar"
          style={{ left: `${startPct}%`, width: `${Math.max(1, endPct - startPct)}%` }}
          title={label}
        >
          <div className="gantt-bar-handle gantt-bar-handle-start" onPointerDown={handleHandleDrag("appear")} />
          <div className="gantt-bar-handle gantt-bar-handle-end" onPointerDown={handleHandleDrag("disappear")} />
        </div>
      </div>
      <button className="icon-btn icon-btn-danger" onClick={() => removeAssignment(assignment.primPath)} title="Retirer">
        ✕
      </button>
    </div>
  );
}
