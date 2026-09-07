import { useRef, useState } from "react";
import { uploadGeometry } from "../../api/client";
import { useScheduleStore } from "../../state/scheduleStore";
import { t } from "../../i18n/fr";

export function FileUpload() {
  const setSession = useScheduleStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const resp = await uploadGeometry(file);
      setSession(resp.sessionId, resp.tree);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.upload.error);
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div
      className="upload-zone"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".usd,.usda,.usdc"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <p className="upload-hint">{loading ? t.upload.loading : t.upload.dragHint}</p>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
