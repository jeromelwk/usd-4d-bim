import { useMemo } from "react";
import { useScheduleStore } from "../../state/scheduleStore";
import { flattenTree } from "../../utils/tree";
import { formatDateDMY } from "../../utils/frameMapping";
import { t } from "../../i18n/fr";
import { DateAxis } from "./DateAxis";
import { PhaseAxis } from "./PhaseAxis";
import { GanttRow } from "./GanttRow";

export function GanttGrid() {
  const mode = useScheduleStore((s) => s.mode);
  const calendar = useScheduleStore((s) => s.calendar);
  const phases = useScheduleStore((s) => s.phase.phases);
  const assignments = useScheduleStore((s) => s.assignments);
  const tree = useScheduleStore((s) => s.tree);

  const nodesByPath = useMemo(() => flattenTree(tree), [tree]);
  const rows = Object.values(assignments).sort((a, b) => a.primPath.localeCompare(b.primPath));

  const rangeStart = mode === "calendar" ? formatDateDMY(calendar.projectStart) : phases[0]?.name ?? "";
  const rangeEnd =
    mode === "calendar" ? formatDateDMY(calendar.projectEnd) : phases[phases.length - 1]?.name ?? "";

  return (
    <div className="panel">
      <div className="panel-header timeline-range-header">
        <span className="timeline-range-label">{rangeStart}</span>
        <span className="timeline-range-label timeline-range-label-end">{rangeEnd}</span>
      </div>
      {rows.length === 0 ? (
        <p className="empty-hint">{t.timeline.empty}</p>
      ) : (
        <div className="gantt">
          <div className="gantt-header">
            <div className="gantt-row-label" />
            {mode === "calendar" ? (
              <DateAxis projectStart={calendar.projectStart} projectEnd={calendar.projectEnd} />
            ) : (
              <PhaseAxis phases={phases} />
            )}
            <div style={{ width: 28 }} />
          </div>
          {rows.map((assignment) => (
            <GanttRow
              key={assignment.primPath}
              name={nodesByPath.get(assignment.primPath)?.name ?? assignment.primPath}
              assignment={assignment}
              mode={mode}
              calendar={calendar}
              phases={phases}
            />
          ))}
        </div>
      )}
    </div>
  );
}
