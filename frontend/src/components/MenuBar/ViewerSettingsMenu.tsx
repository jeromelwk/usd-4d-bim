import { useScheduleStore, type UpAxisChoice } from "../../state/scheduleStore";
import { t } from "../../i18n/fr";

const CHOICES: { value: UpAxisChoice; label: string }[] = [
  { value: "stage", label: t.settings.upAxisStage },
  { value: "y", label: t.settings.upAxisY },
  { value: "z", label: t.settings.upAxisZ },
];

export function ViewerSettingsMenu() {
  const viewerUpAxis = useScheduleStore((s) => s.viewerUpAxis);
  const setViewerUpAxis = useScheduleStore((s) => s.setViewerUpAxis);

  return (
    <div className="menu-section">
      <p className="hint-text">{t.settings.upAxisLabel}</p>
      <div className="segmented">
        {CHOICES.map((choice) => (
          <button
            key={choice.value}
            className={`segmented-btn${viewerUpAxis === choice.value ? " active" : ""}`}
            onClick={() => setViewerUpAxis(choice.value)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}
