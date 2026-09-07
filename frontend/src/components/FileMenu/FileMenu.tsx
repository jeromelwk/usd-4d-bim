import { useState } from "react";
import { uploadGeometry, uploadSchedule } from "../../api/client";
import { useScheduleStore } from "../../state/scheduleStore";
import { t } from "../../i18n/fr";

export function FileMenu() {
  const setSession = useScheduleStore((s) => s.setSession);
  const loadFromImport = useScheduleStore((s) => s.loadFromImport);
  const [geometryFile, setGeometryFile] = useState<File | null>(null);
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoad() {
    if (!geometryFile) return;
    setLoading(true);
    setError(null);
    try {
      if (scheduleFile) {
        const state = await uploadSchedule(geometryFile, scheduleFile);
        loadFromImport(state);
      } else {
        const resp = await uploadGeometry(geometryFile);
        setSession(resp.sessionId, resp.tree);
      }
      setGeometryFile(null);
      setScheduleFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.upload.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="file-menu">
      <label className="file-label">
        {t.upload.geometryLabel}
        <input
          type="file"
          accept=".usd,.usda,.usdc"
          onChange={(e) => setGeometryFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <label className="file-label">
        {t.upload.scheduleLabel}
        <input
          type="file"
          accept=".usd,.usda,.usdc"
          onChange={(e) => setScheduleFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <button className="btn btn-primary" disabled={!geometryFile || loading} onClick={handleLoad}>
        {loading ? t.upload.loading : t.upload.loadButton}
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
