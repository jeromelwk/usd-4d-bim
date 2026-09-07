import { state } from "./appState";
import {
  app,
  statsPanel,
  tutorialOverlay,
  viewportElement,
} from "./dom";
import { closeMenus } from "./menus";
import { setSelection, toggleSelectionPath } from "./sceneGraphPanel";

// --- Keyboard shortcuts ---
document.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
  if ((e.key === "f" || e.key === "F") && state.selectedPrimPath) {
    state.viewport.framePrim(state.selectedPrimPath);
  }
  if (e.key === "Escape") {
    closeMenus();
    statsPanel.hidden = true;
    tutorialOverlay.hidden = true;
  }
});

// --- Viewport pick on click (distinguish from orbit drag) ---
let pickMouseStart: { x: number; y: number } | null = null;

viewportElement.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  pickMouseStart = { x: e.clientX, y: e.clientY };
});

viewportElement.addEventListener("mouseup", (e) => {
  if (e.button !== 0 || !pickMouseStart) return;
  const dx = e.clientX - pickMouseStart.x;
  const dy = e.clientY - pickMouseStart.y;
  pickMouseStart = null;
  if (dx * dx + dy * dy > 16) return; // was a drag
  const path = state.viewport.pickPrim(e.clientX, e.clientY);
  // Patched for USD 4D BIM: ctrl/cmd/shift-click adds to (or removes from) the
  // current selection instead of replacing it, matching the multi-select
  // convention used by the embedding app's own prim tree.
  const additive = e.ctrlKey || e.metaKey || e.shiftKey;
  if (path) {
    if (additive) {
      toggleSelectionPath(path);
    } else {
      setSelection([path]);
    }
  } else if (!additive) {
    // click on empty space — deselect (unless accumulating a multi-selection)
    setSelection([]);
  }
});

// --- Docked panel resize ---
const shell = app.querySelector<HTMLElement>("#shell")!;
const sgResizeX = app.querySelector<HTMLElement>("#sgResizeX")!;
const attrResizeY = app.querySelector<HTMLElement>("#attrResizeY")!;

let sgDrag: { startX: number; startW: number } | null = null;
let attrDrag: { startY: number; startH: number } | null = null;

sgResizeX.addEventListener("mousedown", (e) => {
  sgDrag = {
    startX: e.clientX,
    startW: parseInt(shell.style.getPropertyValue("--sg-w") || "240"),
  };
  document.body.style.cursor = "col-resize";
  e.preventDefault();
});

attrResizeY.addEventListener("mousedown", (e) => {
  attrDrag = {
    startY: e.clientY,
    startH: parseInt(shell.style.getPropertyValue("--attr-h") || "200"),
  };
  document.body.style.cursor = "row-resize";
  e.preventDefault();
});

document.addEventListener("mousemove", (e) => {
  if (sgDrag) {
    const w = Math.max(140, Math.min(600, sgDrag.startW + e.clientX - sgDrag.startX));
    shell.style.setProperty("--sg-w", `${w}px`);
  }
  if (attrDrag) {
    const h = Math.max(60, Math.min(600, attrDrag.startH + attrDrag.startY - e.clientY));
    shell.style.setProperty("--attr-h", `${h}px`);
  }
});

document.addEventListener("mouseup", () => {
  if (sgDrag || attrDrag) document.body.style.cursor = "";
  sgDrag = null;
  attrDrag = null;
});
