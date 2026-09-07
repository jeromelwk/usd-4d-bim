import { useScheduleStore } from "../../state/scheduleStore";
import { t } from "../../i18n/fr";

export function ProjectDateRange() {
  const calendar = useScheduleStore((s) => s.calendar);
  const setCalendar = useScheduleStore((s) => s.setCalendar);

  return (
    <div className="date-range">
      <label>
        {t.calendar.projectStart}
        <input
          type="date"
          value={calendar.projectStart}
          onChange={(e) => setCalendar({ ...calendar, projectStart: e.target.value })}
        />
      </label>
      <label>
        {t.calendar.projectEnd}
        <input
          type="date"
          value={calendar.projectEnd}
          onChange={(e) => setCalendar({ ...calendar, projectEnd: e.target.value })}
        />
      </label>
    </div>
  );
}
