import { useEffect, useMemo, useRef, useState } from "react";
import { useScheduleStore, type UpAxisChoice } from "../../state/scheduleStore";
import { downloadFileUrl } from "../../api/client";
import { computeTotalFrames, frameToLabel } from "../../utils/frameMapping";
import { t } from "../../i18n/fr";

interface ViewerAutomationApi {
  waitForReady(timeoutMs?: number): Promise<unknown>;
  setTime(timeCode: number): Promise<void>;
  selectPrims(paths: string[]): void;
  clearSelection(): void;
  onSelectionChange(callback: (primPaths: string[]) => void): () => void;
  setUpAxis(choice: UpAxisChoice): void;
}

function getApi(iframe: HTMLIFrameElement | null): ViewerAutomationApi | null {
  try {
    const win = iframe?.contentWindow as
      | (Window & { __USD_WEBVIEW_AUTOMATION__?: ViewerAutomationApi })
      | null
      | undefined;
    return win?.__USD_WEBVIEW_AUTOMATION__ ?? null;
  } catch {
    return null;
  }
}

function selectionKey(paths: string[]): string {
  return [...paths].sort().join("|");
}

const PLAY_TICK_MS = 120;
const PLAY_STEPS = 90;

/**
 * Embeds the vendored usd-wg-webview (see /viewer) to render the loaded
 * geometry (or, once a schedule has been exported, the composed
 * schedule+geometry stage with its baked visibility timeline) and mirror
 * this app's prim selection into the 3D view (and back). When a schedule is
 * available, a timeline scrubber drives the 3D preview through the baked
 * construction sequence via the viewer's setTime() automation call.
 */
export function Viewer3DPanel() {
  const sessionId = useScheduleStore((s) => s.sessionId);
  const selectedPrimPaths = useScheduleStore((s) => s.selectedPrimPaths);
  const setSelection = useScheduleStore((s) => s.setSelection);
  const hasSchedule = useScheduleStore((s) => s.hasSchedule);
  const scheduleIsStale = useScheduleStore((s) => s.scheduleIsStale);
  const viewerReloadNonce = useScheduleStore((s) => s.viewerReloadNonce);
  const mode = useScheduleStore((s) => s.mode);
  const calendar = useScheduleStore((s) => s.calendar);
  const phases = useScheduleStore((s) => s.phase.phases);
  const viewerUpAxis = useScheduleStore((s) => s.viewerUpAxis);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const upAxisRef = useRef(viewerUpAxis);
  const selectionRef = useRef(selectedPrimPaths);
  const generationRef = useRef(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastPushedKeyRef = useRef<string>("");
  const lastReceivedKeyRef = useRef<string>("");
  const currentFrameRef = useRef(0);
  selectionRef.current = selectedPrimPaths;
  upAxisRef.current = viewerUpAxis;

  const [ready, setReady] = useState(false);
  const [statusText, setStatusText] = useState(t.viewer.loading);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const totalFrames = useMemo(
    () => computeTotalFrames(mode, calendar, phases),
    [mode, calendar, phases]
  );

  const iframeSrc = useMemo(() => {
    if (!sessionId) return null;
    const cacheBust = `&v=${viewerReloadNonce}`;
    const files = hasSchedule
      ? [
          { path: "schedule.usda", url: `${downloadFileUrl(sessionId, "schedule")}${cacheBust}` },
          { path: "geometry.usda", url: `${downloadFileUrl(sessionId, "geometry")}${cacheBust}` },
        ]
      : [{ path: "geometry.usda", url: `${downloadFileUrl(sessionId, "geometry")}${cacheBust}` }];
    const manifest = { rootFile: files[0].path, files };
    const manifestUrl = `data:application/json,${encodeURIComponent(JSON.stringify(manifest))}`;
    return `/viewer/index.html?automation=1&automationManifest=${encodeURIComponent(manifestUrl)}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, hasSchedule, viewerReloadNonce]);

  useEffect(
    () => () => {
      generationRef.current += 1;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    },
    []
  );

  useEffect(() => {
    setReady(false);
    setStatusText(t.viewer.loading);
    setIsPlaying(false);
    currentFrameRef.current = 0;
    setCurrentFrame(0);
    lastPushedKeyRef.current = "";
    lastReceivedKeyRef.current = "";
  }, [iframeSrc]);

  function handleIframeLoad() {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    const myGeneration = ++generationRef.current;

    void (async () => {
      const iframe = iframeRef.current;
      let api: ViewerAutomationApi | null = null;
      for (let attempt = 0; attempt < 150; attempt++) {
        if (generationRef.current !== myGeneration) return;
        api = getApi(iframe);
        if (api) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (!api || generationRef.current !== myGeneration) return;

      unsubscribeRef.current = api.onSelectionChange((paths) => {
        const key = selectionKey(paths);
        if (key === lastPushedKeyRef.current) return;
        lastReceivedKeyRef.current = key;
        setSelection(paths);
      });

      try {
        await api.waitForReady(30000);
      } catch {
        if (generationRef.current === myGeneration) setStatusText(t.viewer.error);
        return;
      }
      if (generationRef.current !== myGeneration) return;
      setReady(true);
      setStatusText(t.viewer.ready);
      lastPushedKeyRef.current = selectionKey(selectionRef.current);
      api.selectPrims(selectionRef.current);
      api.setUpAxis(upAxisRef.current);
    })();
  }

  useEffect(() => {
    if (!ready) return;
    const key = selectionKey(selectedPrimPaths);
    if (key === lastReceivedKeyRef.current) return;
    lastPushedKeyRef.current = key;
    getApi(iframeRef.current)?.selectPrims(selectedPrimPaths);
  }, [ready, selectedPrimPaths]);

  useEffect(() => {
    if (!ready) return;
    getApi(iframeRef.current)?.setUpAxis(viewerUpAxis);
  }, [ready, viewerUpAxis]);

  function pushFrame(frame: number) {
    currentFrameRef.current = frame;
    setCurrentFrame(frame);
    void getApi(iframeRef.current)?.setTime(frame);
  }

  function handleScrub(value: number) {
    setIsPlaying(false);
    pushFrame(value);
  }

  useEffect(() => {
    if (!isPlaying || totalFrames <= 0) return;
    const frameStep = Math.max(totalFrames / PLAY_STEPS, 0.001);
    const id = setInterval(() => {
      const next = currentFrameRef.current + frameStep;
      if (next >= totalFrames) {
        pushFrame(totalFrames);
        setIsPlaying(false);
      } else {
        pushFrame(next);
      }
    }, PLAY_TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, totalFrames]);

  if (!iframeSrc) return null;

  const showTimeline = ready && hasSchedule && totalFrames > 0;

  return (
    <div className="panel viewer-panel">
      <div className="panel-header viewer-panel-header">
        <div>
          <h2>{t.viewer.title}</h2>
          <p className="hint-text">{t.viewer.hint}</p>
        </div>
        <span className="hint-text">{statusText}</span>
      </div>
      <iframe
        key={iframeSrc}
        ref={iframeRef}
        src={iframeSrc}
        className="viewer-iframe"
        title="Vue 3D USD"
        onLoad={handleIframeLoad}
      />
      {ready && !hasSchedule && <p className="viewer-timeline-hint">{t.viewer.noSchedule}</p>}
      {showTimeline && (
        <div className="viewer-timeline">
          <button className="btn-icon-play" onClick={() => setIsPlaying((p) => !p)}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <input
            type="range"
            min={0}
            max={totalFrames}
            step={mode === "phase" ? 1 : Math.max(totalFrames / 200, 0.1)}
            value={currentFrame}
            onChange={(e) => handleScrub(Number(e.target.value))}
            className="viewer-timeline-slider"
          />
          <span className="viewer-timeline-label">
            {frameToLabel(mode, calendar, phases, currentFrame)}
          </span>
          <span
            className={`viewer-timeline-badge${scheduleIsStale ? " viewer-timeline-badge-stale" : ""}`}
            title={scheduleIsStale ? t.viewer.stale : t.viewer.upToDate}
          >
            {scheduleIsStale ? "⚠" : "✓"}
          </span>
        </div>
      )}
    </div>
  );
}
