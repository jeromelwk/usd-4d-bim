import { useState } from "react";
import { exportSchedule, downloadFileUrl } from "../../api/client";
import { ApiError } from "../../api/types";
import { useScheduleStore } from "../../state/scheduleStore";
import { t } from "../../i18n/fr";

export function ExportPanel() {
  const sessionId = useScheduleStore((s) => s.sessionId);
  const mode = useScheduleStore((s) => s.mode);
  const calendar = useScheduleStore((s) => s.calendar);
  const phase = useScheduleStore((s) => s.phase);
  const assignments = useScheduleStore((s) => s.assignments);
  const markScheduleExported = useScheduleStore((s) => s.markScheduleExported);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string[] | null>(null);
  const [success, setSuccess] = useState(false);

  if (!sessionId) return null;

  async function handleExport() {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await exportSchedule(sessionId, {
        mode,
        calendar,
        phase,
        assignments: Object.values(assignments),
      });
      setSuccess(true);
      markScheduleExported();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.errors.length > 0 ? err.errors : [err.message]);
      } else {
        setError([t.errors.generic]);
      }
    } finally {
      setLoading(false);
    }
  }

  const assignmentCount = Object.keys(assignments).length;

  return (
    <div className="menu-section">
      <button className="btn btn-primary" disabled={loading || assignmentCount === 0} onClick={handleExport}>
        {loading ? t.export.loading : t.export.button}
      </button>
      {error && (
        <ul className="error-list">
          {error.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {success && (
        <div className="export-success">
          <p>{t.export.success}</p>
          <div className="export-links">
            <a href={downloadFileUrl(sessionId, "geometry")} target="_blank" rel="noreferrer">
              {t.export.downloadGeometry}
            </a>
            <a href={downloadFileUrl(sessionId, "schedule")} target="_blank" rel="noreferrer">
              {t.export.downloadSchedule}
            </a>
          </div>
          <p className="hint-text">{t.export.warning}</p>
        </div>
      )}
    </div>
  );
}
