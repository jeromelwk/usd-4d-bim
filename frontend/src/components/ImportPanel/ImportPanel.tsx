import { useRef, useState } from "react";
import { importSchedule, uploadSchedule } from "../../api/client";
import { useScheduleStore } from "../../state/scheduleStore";
import { t } from "../../i18n/fr";

export function ImportPanel() {
  const sessionId = useScheduleStore((s) => s.sessionId);
  const loadFromImport = useScheduleStore((s) => s.loadFromImport);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geometryInput = useRef<HTMLInputElement>(null);
  const scheduleInput = useRef<HTMLInputElement>(null);

  async function handleReload() {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const state = await importSchedule(sessionId);
      loadFromImport(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    const geometry = geometryInput.current?.files?.[0];
    const schedule = scheduleInput.current?.files?.[0];
    if (!geometry || !schedule) return;
    setLoading(true);
    setError(null);
    try {
      const state = await uploadSchedule(geometry, schedule);
      loadFromImport(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{t.import.title}</h2>
      </div>
      {sessionId && (
        <button className="btn btn-secondary" disabled={loading} onClick={handleReload}>
          {loading ? t.import.loading : t.import.reload}
        </button>
      )}
      <div className="import-upload-row">
        <label className="file-label">
          {t.import.uploadGeometry}
          <input ref={geometryInput} type="file" accept=".usd,.usda,.usdc" />
        </label>
        <label className="file-label">
          {t.import.uploadSchedule}
          <input ref={scheduleInput} type="file" accept=".usd,.usda,.usdc" />
        </label>
        <button className="btn btn-secondary" disabled={loading} onClick={handleUpload}>
          {t.import.button}
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
