import type { StageSummary } from "../usd/types";
import { runtime, state } from "./appState";
import { playbar, playbarEnd, playbarScrubber, playbarTime, playBtn } from "./dom";

export function setPlaying(playing: boolean): void {
  state.animPlaying = playing;
  state.animLastTimestamp = performance.now();
  playBtn.innerHTML = playing ? "&#9646;&#9646;" : "&#9654;";
  playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
}

export function updatePlaybarScrubber(): void {
  playbarScrubber.value = String(state.animCurrent);
  playbarTime.textContent = state.animCurrent.toFixed(1);
}

export function showPlaybar(summary: StageSummary): void {
  state.animStart = summary.startTimeCode ?? 0;
  state.animEnd = summary.endTimeCode ?? 0;
  state.animFps = summary.timeCodesPerSecond ?? 24;
  state.animCurrent = state.animStart;

  if (state.animEnd <= state.animStart) {
    playbar.hidden = true;
    return;
  }

  playbarScrubber.min = String(state.animStart);
  playbarScrubber.max = String(state.animEnd);
  playbarScrubber.step = "1";
  playbarEnd.textContent = state.animEnd.toFixed(0);

  // For long animations, widen the track so it becomes scrollable
  const frameCount = Math.ceil(state.animEnd - state.animStart);
  playbarScrubber.style.width = frameCount > 200
    ? `${frameCount * 2}px`
    : "100%";

  setPlaying(false);
  updatePlaybarScrubber();
  playbar.hidden = false;
}

export function hidePlaybar(): void {
  state.animPlaying = false;
  playbar.hidden = true;
}

export function sampleAnimationFrame(timeCode: number): void {
  if (state.isLoadingStage) {
    return;
  }
  // Patched for USD 4D BIM: the native driver's "time-varying" classification
  // (used by the partial draw, full=false) only tracks animated points/xforms
  // -- it never considers animated `visibility`, so appear/disappear baked as
  // visibility time samples (see visibility_bake.py) would never show up
  // through a partial draw: a mesh that becomes invisible simply keeps
  // rendering forever, and one that starts invisible then becomes visible
  // never gets added. A full draw re-evaluates every mesh's visibility at
  // this timeCode and updateRenderables() diffs it against the current scene
  // (add/update/remove), all without the full stage teardown that
  // renderStage() does -- so it's safe to call on every scrub/play tick.
  const renderables = runtime.drawAtTime(timeCode, true);
  state.viewport.updateRenderables(renderables);
  // Meshes that were added or recreated by the redraw need their selection
  // overlay (re)built from scratch; see Picking.ts's meshHighlightOverlays.
  state.viewport.setSelectedPrims(state.viewportSelection);
  state.viewport.setStageLights(runtime.extractStageLights(timeCode));
}

export function onTick(): void {
  if (!state.animPlaying) return;
  const now = performance.now();
  state.animCurrent += ((now - state.animLastTimestamp) / 1000) * state.animFps;
  state.animLastTimestamp = now;
  if (state.animCurrent >= state.animEnd) state.animCurrent = state.animStart;
  updatePlaybarScrubber();
  sampleAnimationFrame(state.animCurrent);
}

playBtn.addEventListener("click", () => setPlaying(!state.animPlaying));

playbarScrubber.addEventListener("input", () => {
  state.animCurrent = Number(playbarScrubber.value);
  playbarTime.textContent = state.animCurrent.toFixed(1);
  if (!state.animPlaying) {
    sampleAnimationFrame(state.animCurrent);
  }
});
