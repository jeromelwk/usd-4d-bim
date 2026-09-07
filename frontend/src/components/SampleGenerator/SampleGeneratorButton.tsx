import { useState } from "react";
import { generateSample } from "../../api/client";
import { useScheduleStore } from "../../state/scheduleStore";
import { t } from "../../i18n/fr";

export function SampleGeneratorButton() {
  const setSession = useScheduleStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const resp = await generateSample();
      setSession(resp.sessionId, resp.tree);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn btn-secondary" onClick={handleClick} disabled={loading}>
      {loading ? t.sample.loading : t.sample.button}
    </button>
  );
}
