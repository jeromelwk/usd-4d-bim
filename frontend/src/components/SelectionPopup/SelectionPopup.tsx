import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useScheduleStore } from "../../state/scheduleStore";
import { t } from "../../i18n/fr";

const POPUP_OFFSET = 16;
const VIEWPORT_MARGIN = 12;

export function SelectionPopup() {
  const mode = useScheduleStore((s) => s.mode);
  const phases = useScheduleStore((s) => s.phase.phases);
  const calendar = useScheduleStore((s) => s.calendar);
  const selectedPrimPaths = useScheduleStore((s) => s.selectedPrimPaths);
  const assignments = useScheduleStore((s) => s.assignments);
  const bulkAssign = useScheduleStore((s) => s.bulkAssign);
  const clearAssignments = useScheduleStore((s) => s.clearAssignments);
  const clearSelection = useScheduleStore((s) => s.clearSelection);
  const selectionAnchor = useScheduleStore((s) => s.selectionAnchor);

  const [appear, setAppear] = useState("");
  const [disappear, setDisappear] = useState("");
  const [neverDisappear, setNeverDisappear] = useState(true);

  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const selectionKey = selectedPrimPaths.join("|");

  useEffect(() => {
    const existing = selectedPrimPaths.length === 1 ? assignments[selectedPrimPaths[0]] : undefined;
    setAppear(existing?.appear ?? "");
    setDisappear(existing?.disappear ?? "");
    setNeverDisappear(!existing || existing.disappear == null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  // Anchor the popup near the click that produced the selection (in the tree
  // or the 3D viewer), clamped so it always stays fully on screen.
  useLayoutEffect(() => {
    const el = popupRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const anchor = selectionAnchor ?? {
      x: window.innerWidth - rect.width - VIEWPORT_MARGIN - POPUP_OFFSET,
      y: window.innerHeight - rect.height - VIEWPORT_MARGIN - POPUP_OFFSET,
    };
    const maxLeft = window.innerWidth - rect.width - VIEWPORT_MARGIN;
    const maxTop = window.innerHeight - rect.height - VIEWPORT_MARGIN;
    const left = Math.min(Math.max(VIEWPORT_MARGIN, anchor.x + POPUP_OFFSET), Math.max(VIEWPORT_MARGIN, maxLeft));
    const top = Math.min(Math.max(VIEWPORT_MARGIN, anchor.y + POPUP_OFFSET), Math.max(VIEWPORT_MARGIN, maxTop));
    setPos({ left, top });
  }, [selectionAnchor, selectionKey, neverDisappear]);

  if (selectedPrimPaths.length === 0) return null;

  function applyAppear(value: string) {
    setAppear(value);
    if (value) bulkAssign(selectedPrimPaths, value, neverDisappear ? null : disappear || null);
  }

  function applyDisappear(value: string) {
    setDisappear(value);
    if (appear && value) bulkAssign(selectedPrimPaths, appear, value);
  }

  function toggleNever(checked: boolean) {
    setNeverDisappear(checked);
    if (appear) bulkAssign(selectedPrimPaths, appear, checked ? null : disappear || null);
  }

  function handleClear() {
    clearAssignments(selectedPrimPaths);
    setAppear("");
    setDisappear("");
    setNeverDisappear(true);
  }

  return (
    <div
      className="selection-popup"
      ref={popupRef}
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
    >
      <div className="selection-popup-header">
        <span>{t.tree.selectedCount(selectedPrimPaths.length)}</span>
        <button className="icon-btn" onClick={clearSelection} aria-label="Fermer" title="Fermer">
          ✕
        </button>
      </div>

      <label>
        {t.assignment.appear}
        {mode === "calendar" ? (
          <input
            type="date"
            min={calendar.projectStart}
            max={calendar.projectEnd}
            value={appear}
            onChange={(e) => applyAppear(e.target.value)}
          />
        ) : (
          <select value={appear} onChange={(e) => applyAppear(e.target.value)}>
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
        <input type="checkbox" checked={neverDisappear} onChange={(e) => toggleNever(e.target.checked)} />
        {t.assignment.never}
      </label>

      {!neverDisappear && (
        <label>
          {t.assignment.disappear}
          {mode === "calendar" ? (
            <input
              type="date"
              min={calendar.projectStart}
              max={calendar.projectEnd}
              value={disappear}
              onChange={(e) => applyDisappear(e.target.value)}
            />
          ) : (
            <select value={disappear} onChange={(e) => applyDisappear(e.target.value)}>
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

      <button className="btn btn-secondary" onClick={handleClear}>
        {t.assignment.clear}
      </button>
    </div>
  );
}
