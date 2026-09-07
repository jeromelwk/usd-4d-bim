import { runtime, state, type UpAxisChoice } from "./appState";
import { sampleAnimationFrame, updatePlaybarScrubber } from "./animation";
import { loadAutomationManifestStage } from "./loadOrchestrator";
import { applyStageEdit } from "./stageEdits";
import { setSelection } from "./sceneGraphPanel";
import { applyUpAxisOptions } from "./menus";
import type { ReferenceCaptureOptions, ViewportDebugMaterialInfo } from "../viewer/ThreeViewport";

export type AutomationManifest = {
  caseId?: string;
  rootFile?: string;
  files: Array<{
    path: string;
    url?: string;
    absolutePath?: string;
    mimeType?: string;
  }>;
};

export type AutomationState =
  | { state: "idle" | "booting" | "loading" | "ready"; detail: string; caseId: string | null }
  | { state: "error"; detail: string; caseId: string | null };

export type AutomationApi = {
  getState(): AutomationState;
  waitForReady(timeoutMs?: number): Promise<AutomationState>;
  loadManifest(manifestUrl: string, timeoutMs?: number): Promise<AutomationState>;
  configureReferenceCapture(options: ReferenceCaptureOptions): Promise<void>;
  setTime(timeCode: number): Promise<void>;
  setVariantSelection(
    primPath: string,
    variantSetName: string,
    selection: string
  ): Promise<boolean>;
  setPayloadLoaded(primPath: string, loaded: boolean): Promise<boolean>;
  settle(frameCount?: number): Promise<void>;
  renderForCapture(passes?: number): Promise<void>;
  getViewportDebugMaterialInfo(): ViewportDebugMaterialInfo[];
  // Patched for USD 4D BIM: external selection control/sync (multi-select),
  // for embedding this viewer in another app (iframe) and keeping selection
  // in sync both ways.
  selectPrims(primPaths: string[]): void;
  clearSelection(): void;
  onSelectionChange(callback: (primPaths: string[]) => void): () => void;
  // Patched for USD 4D BIM: let the embedding app drive the viewport's
  // up-axis choice ("stage" = respect the loaded file's authored up-axis).
  setUpAxis(choice: UpAxisChoice): void;
};

declare global {
  interface Window {
    __USD_WEBVIEW_AUTOMATION__?: AutomationApi;
  }
}

const searchParams = new URLSearchParams(window.location.search);
export const automationManifestUrl = searchParams.get("automationManifest");
export const automationEnabled =
  searchParams.get("automation") === "1" || !!automationManifestUrl;
export const automationSettleFrames = Math.max(
  1,
  Number(searchParams.get("settleFrames") ?? "6") || 6
);
document.documentElement.classList.toggle("automation-mode", automationEnabled);

let automationState: AutomationState = {
  state: automationEnabled ? "booting" : "idle",
  detail: automationEnabled ? "booting viewer" : "idle",
  caseId: null,
};
const automationListeners = new Set<(state: AutomationState) => void>();

export function setAutomationState(
  state: AutomationState["state"],
  detail: string,
  caseId = automationState.caseId
): void {
  automationState = {
    state,
    detail,
    caseId: caseId ?? null,
  };
  for (const listener of automationListeners) {
    listener(automationState);
  }
}

export function getAutomationState(): AutomationState {
  return automationState;
}

// Patched for USD 4D BIM: notify external listeners (the embedding app) when
// selection changes from inside the viewer (e.g. the user clicked a mesh),
// with the full current multi-selection.
const selectionListeners = new Set<(primPaths: string[]) => void>();

export function notifyExternalSelection(primPaths: string[]): void {
  for (const listener of selectionListeners) {
    listener(primPaths);
  }
}

export function waitForAutomationReady(timeoutMs = 30000): Promise<AutomationState> {
  if (automationState.state === "ready") {
    return Promise.resolve(automationState);
  }
  if (automationState.state === "error") {
    return Promise.reject(new Error(automationState.detail));
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      automationListeners.delete(onStateChange);
      reject(new Error(`Timed out waiting for automation readiness: ${automationState.detail}`));
    }, timeoutMs);

    const onStateChange = (nextState: AutomationState): void => {
      if (nextState.state === "ready") {
        window.clearTimeout(timeout);
        automationListeners.delete(onStateChange);
        resolve(nextState);
      } else if (nextState.state === "error") {
        window.clearTimeout(timeout);
        automationListeners.delete(onStateChange);
        reject(new Error(nextState.detail));
      }
    };

    automationListeners.add(onStateChange);
  });
}

export function waitForUiPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export async function waitForSettledFrames(frameCount = automationSettleFrames): Promise<void> {
  for (let index = 0; index < frameCount; index += 1) {
    await waitForUiPaint();
  }
}

window.__USD_WEBVIEW_AUTOMATION__ = {
  getState(): AutomationState {
    return automationState;
  },
  waitForReady(timeoutMs?: number): Promise<AutomationState> {
    return waitForAutomationReady(timeoutMs);
  },
  async loadManifest(manifestUrl: string, timeoutMs = 30000): Promise<AutomationState> {
    await loadAutomationManifestStage(manifestUrl);
    return waitForAutomationReady(timeoutMs);
  },
  async configureReferenceCapture(options: ReferenceCaptureOptions): Promise<void> {
    const materialXDebugChanged = options.materialXDebugOutput !== undefined
      ? state.viewport.setMaterialXDebugOutputMode(options.materialXDebugOutput)
      : false;
    if (options.axesVisible !== undefined) {
      state.axesVisible = options.axesVisible;
    }
    if (options.lightGizmosVisible !== undefined) {
      state.lightGizmosVisible = options.lightGizmosVisible;
    }
    if (options.hdriMapVisible !== undefined) {
      state.hdriMapVisible = options.hdriMapVisible;
    }
    const coordinateSpaceChanged = state.viewport.applyReferenceCaptureOptions(options);
    if (materialXDebugChanged || coordinateSpaceChanged) {
      await applyStageEdit(undefined, "updating reference capture...");
      state.viewport.applyReferenceCaptureOptions(options);
    }
    await waitForSettledFrames();
  },
  // The mutation entrypoints below intentionally re-use the exact code paths
  // the UI handlers hit (scrubber input, variant select, payload badge) so
  // automation captures exercise real user behavior.
  async setTime(timeCode: number): Promise<void> {
    state.animCurrent = timeCode;
    updatePlaybarScrubber();
    sampleAnimationFrame(timeCode);
    await waitForSettledFrames();
  },
  async setVariantSelection(
    primPath: string,
    variantSetName: string,
    selection: string
  ): Promise<boolean> {
    const changed = runtime.setVariantSelection(primPath, variantSetName, selection);
    if (!changed) {
      return false;
    }
    await applyStageEdit(primPath, "loading variant...");
    await waitForSettledFrames();
    return true;
  },
  async setPayloadLoaded(primPath: string, loaded: boolean): Promise<boolean> {
    const changed = runtime.setPayloadLoaded(primPath, loaded);
    await applyStageEdit(
      primPath,
      loaded ? "loading payload..." : "unloading payload..."
    );
    await waitForSettledFrames();
    return changed;
  },
  async settle(frameCount?: number): Promise<void> {
    await waitForSettledFrames(frameCount);
  },
  async renderForCapture(passes?: number): Promise<void> {
    await state.viewport.renderForCapture(passes);
  },
  getViewportDebugMaterialInfo(): ViewportDebugMaterialInfo[] {
    return state.viewport.getDebugMaterialInfo();
  },
  selectPrims(primPaths: string[]): void {
    setSelection(primPaths);
  },
  clearSelection(): void {
    setSelection([]);
  },
  onSelectionChange(callback: (primPaths: string[]) => void): () => void {
    selectionListeners.add(callback);
    return () => selectionListeners.delete(callback);
  },
  setUpAxis(choice: UpAxisChoice): void {
    state.upAxisChoice = choice;
    applyUpAxisOptions();
  },
};
