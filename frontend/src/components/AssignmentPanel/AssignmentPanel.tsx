import { useState } from "react";
import { useScheduleStore } from "../../state/scheduleStore";
import { t } from "../../i18n/fr";

export function AssignmentPanel() {
  const mode = useScheduleStore((s) => s.mode);
  const phases = useScheduleStore((s) => s.phase.phases);
  const selectedPrimPaths = useScheduleStore((s) => s.selectedPrimPaths);
  const bulkAssign = useScheduleStore((s) => s.bulkAssign);
  const calendar = useScheduleStore((s) => s.calendar);

  const [appear, setAppear] = useState("");
  const [disappear, setDisappear] = useState("");
  const [noDisappear, setNoDisappear] = useState(true);

  const canApply = selectedPrimPaths.length > 0 && appear !== "";

  function handleApply() {
    bulkAssign(selectedPrimPaths, appear, noDisappear ? null : disappear || null);
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{t.assignment.title}</h2>
      </div>
      {selectedPrimPaths.length === 0 ? (
        <p className="empty-hint">{t.assignment.noSelection}</p>
      ) : (
        <>
          <p className="hint-text">{t.tree.selectedCount(selectedPrimPaths.length)}</p>
          <div className="assignment-form">
            <label>
              {t.assignment.appear}
              {mode === "calendar" ? (
                <input
                  type="date"
                  min={calendar.projectStart}
                  max={calendar.projectEnd}
                  value={appear}
                  onChange={(e) => setAppear(e.target.value)}
                />
              ) : (
                <select value={appear} onChange={(e) => setAppear(e.target.value)}>
                  <option value="" disabled>
                    —
                  </option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={noDisappear}
                onChange={(e) => setNoDisappear(e.target.checked)}
              />
              {t.assignment.never}
            </label>

            {!noDisappear && (
              <label>
                {t.assignment.disappear}
                {mode === "calendar" ? (
                  <input
                    type="date"
                    min={calendar.projectStart}
                    max={calendar.projectEnd}
                    value={disappear}
                    onChange={(e) => setDisappear(e.target.value)}
                  />
                ) : (
                  <select value={disappear} onChange={(e) => setDisappear(e.target.value)}>
                    <option value="">—</option>
                    {phases.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            )}

            <button className="btn btn-primary" disabled={!canApply} onClick={handleApply}>
              {t.assignment.apply}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
