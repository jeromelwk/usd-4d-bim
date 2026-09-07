import { useScheduleStore } from "../../state/scheduleStore";
import { t } from "../../i18n/fr";

export function ModeToggle() {
  const mode = useScheduleStore((s) => s.mode);
  const setMode = useScheduleStore((s) => s.setMode);

  return (
    <div className="mode-toggle">
      <span className="mode-toggle-label">{t.mode.label}</span>
      <div className="segmented">
        <button
          className={`segmented-btn${mode === "calendar" ? " active" : ""}`}
          onClick={() => setMode("calendar")}
        >
          {t.mode.calendar}
        </button>
        <button
          className={`segmented-btn${mode === "phase" ? " active" : ""}`}
          onClick={() => setMode("phase")}
        >
          {t.mode.phase}
        </button>
      </div>
    </div>
  );
}
