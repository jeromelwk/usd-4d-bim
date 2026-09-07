import { useState } from "react";
import { useScheduleStore } from "../../state/scheduleStore";
import { t } from "../../i18n/fr";

export function PhaseListEditor() {
  const phases = useScheduleStore((s) => s.phase.phases);
  const addPhase = useScheduleStore((s) => s.addPhase);
  const removePhase = useScheduleStore((s) => s.removePhase);
  const renamePhase = useScheduleStore((s) => s.renamePhase);
  const movePhase = useScheduleStore((s) => s.movePhase);
  const [newName, setNewName] = useState("");

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    addPhase(name);
    setNewName("");
  }

  return (
    <div className="phase-editor">
      {phases.length === 0 && <p className="empty-hint">{t.phaseEditor.empty}</p>}
      <ul className="phase-list">
        {phases.map((phase, idx) => (
          <li key={phase.id} className="phase-item">
            <input
              className="phase-name-input"
              value={phase.name}
              onChange={(e) => renamePhase(phase.id, e.target.value)}
            />
            <button
              className="icon-btn"
              disabled={idx === 0}
              onClick={() => movePhase(phase.id, -1)}
              title={t.phaseEditor.moveUp}
            >
              ↑
            </button>
            <button
              className="icon-btn"
              disabled={idx === phases.length - 1}
              onClick={() => movePhase(phase.id, 1)}
              title={t.phaseEditor.moveDown}
            >
              ↓
            </button>
            <button
              className="icon-btn icon-btn-danger"
              onClick={() => removePhase(phase.id)}
              title={t.phaseEditor.remove}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="phase-add-row">
        <input
          placeholder={t.phaseEditor.namePlaceholder}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className="btn btn-secondary" onClick={handleAdd}>
          {t.phaseEditor.addPhase}
        </button>
      </div>
    </div>
  );
}
