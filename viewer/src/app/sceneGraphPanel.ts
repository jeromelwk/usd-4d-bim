import type { SceneGraphPrim } from "../usd/types";
import { runtime, state } from "./appState";
import { attrList, attrPrimPath, escHtml, sceneGraphList } from "./dom";
import { renderAttributes } from "./attributesPanel";
import { applyStageEdit } from "./stageEdits";
import { notifyExternalSelection } from "./automation";

function isAncestorCollapsed(path: string): boolean {
  const parts = path.split("/").filter(Boolean);
  for (let i = 1; i < parts.length; i++) {
    if (state.collapsedNodes.has("/" + parts.slice(0, i).join("/"))) return true;
  }
  return false;
}

function renderPrimItem(p: SceneGraphPrim): string {
  const indent = 4 + p.depth * 14;
  const isCollapsed = state.collapsedNodes.has(p.path);
  const toggle = p.hasChildren
    ? `<button class="sg-toggle" data-toggle-path="${escHtml(p.path)}" aria-label="${isCollapsed ? "Expand" : "Collapse"}">` +
      `<span class="sg-arrow${isCollapsed ? "" : " sg-arrow--open"}"></span></button>`
    : `<span class="sg-toggle-leaf"></span>`;
  const variantBadge = p.hasVariantSets
    ? `<span class="sg-badge sg-badge--variant" title="Has variant sets">V</span>`
    : "";
  const payloadUnloaded = p.hasPayloads && !p.isPayloadLoaded;
  const payloadBtn = p.hasPayloads
    ? `<button class="sg-badge sg-badge--payload${p.isPayloadLoaded ? " sg-badge--payload-loaded" : ""}" ` +
      `data-payload-path="${escHtml(p.path)}" data-payload-loaded="${p.isPayloadLoaded ? "1" : "0"}" ` +
      `title="${p.isPayloadLoaded ? "Unload payload" : "Load payload"}">P</button>`
    : "";
  return (
    `<li class="sg-item${p.isActive ? "" : " sg-inactive"}${payloadUnloaded ? " sg-payload-unloaded" : ""}" data-path="${escHtml(p.path)}" style="padding-left:${indent}px">` +
    toggle +
    `<span class="sg-name">${escHtml(p.name)}</span>` +
    variantBadge +
    payloadBtn +
    `<span class="sg-type">${escHtml(p.typeName || "?")}</span>` +
    `</li>`
  );
}

function _renderSceneGraphList(): void {
  if (!state.allPrims.length) {
    sceneGraphList.innerHTML = '<li class="sg-empty">No prims</li>';
    return;
  }
  sceneGraphList.innerHTML = state.allPrims
    .filter((p) => !isAncestorCollapsed(p.path))
    .map(renderPrimItem)
    .join("");
  for (const path of state.viewportSelection) {
    sceneGraphList
      .querySelector<HTMLElement>(`[data-path="${path.replace(/"/g, '\\"')}"]`)
      ?.classList.add("sg-selected");
  }
}

export function renderSceneGraph(prims: SceneGraphPrim[]): void {
  state.allPrims = prims;
  _renderSceneGraphList();
}

export function clearSceneGraph(): void {
  state.allPrims = [];
  state.collapsedNodes.clear();
  state.selectedPrimPath = null;
  state.viewportSelection = [];
  sceneGraphList.innerHTML = "";
  attrList.innerHTML = '<p class="sg-empty">Select a prim to inspect</p>';
  attrPrimPath.textContent = "";
  state.viewport.setSelectedPrim(null);
}

// Patched for USD 4D BIM: single entry point for every selection change
// (scene-graph clicks, viewport clicks, and external automation calls), so
// the prim list highlight, the attributes panel, the 3D highlight, and the
// automation callback to the embedding app never drift out of sync. `point`
// (viewport-relative client coordinates of the click that caused this change,
// when there was one) is forwarded to the embedding app so it can anchor its
// own assignment popup near the click instead of a fixed screen position.
export function setSelection(paths: string[], point: { x: number; y: number } | null = null): void {
  const uniquePaths = [...new Set(paths)];

  let ancestorsExpanded = false;
  for (const path of uniquePaths) {
    const parts = path.split("/").filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      const ancestor = "/" + parts.slice(0, i).join("/");
      if (state.collapsedNodes.has(ancestor)) {
        state.collapsedNodes.delete(ancestor);
        ancestorsExpanded = true;
      }
    }
  }
  state.viewportSelection = uniquePaths;
  state.selectedPrimPath = uniquePaths.length === 1 ? uniquePaths[0] : null;

  if (ancestorsExpanded) {
    _renderSceneGraphList();
  } else {
    sceneGraphList.querySelectorAll(".sg-item.sg-selected").forEach((el) => el.classList.remove("sg-selected"));
    for (const path of uniquePaths) {
      sceneGraphList
        .querySelector<HTMLElement>(`[data-path="${path.replace(/"/g, '\\"')}"]`)
        ?.classList.add("sg-selected");
    }
  }
  if (uniquePaths.length === 1) {
    sceneGraphList
      .querySelector<HTMLElement>(`[data-path="${uniquePaths[0].replace(/"/g, '\\"')}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }

  if (uniquePaths.length === 0) {
    attrList.innerHTML = '<p class="sg-empty">Select a prim to inspect</p>';
    attrPrimPath.textContent = "";
  } else if (uniquePaths.length === 1) {
    renderAttributes(uniquePaths[0], runtime.getPrimAttributes(uniquePaths[0]));
  } else {
    attrPrimPath.textContent = "";
    attrList.innerHTML = `<p class="sg-empty">${uniquePaths.length} prims selected</p>`;
  }

  state.viewport.setSelectedPrims(uniquePaths);
  notifyExternalSelection(uniquePaths, point);
}

// Patched for USD 4D BIM: add/remove one path from the current selection,
// for ctrl/shift-click multi-select (scene-graph list and 3D viewport alike).
export function toggleSelectionPath(path: string, point: { x: number; y: number } | null = null): void {
  const current = state.viewportSelection;
  const next = current.includes(path) ? current.filter((p) => p !== path) : [...current, path];
  setSelection(next, point);
}

export function selectPrimByPath(path: string, point: { x: number; y: number } | null = null): void {
  setSelection([path], point);
}

sceneGraphList.addEventListener("click", (e) => {
  const toggleBtn = (e.target as Element).closest<HTMLElement>(".sg-toggle");
  if (toggleBtn?.dataset.togglePath) {
    const path = toggleBtn.dataset.togglePath;
    if (state.collapsedNodes.has(path)) {
      state.collapsedNodes.delete(path);
    } else {
      state.collapsedNodes.add(path);
    }
    _renderSceneGraphList();
    return;
  }

  const payloadBtn = (e.target as Element).closest<HTMLElement>(".sg-badge--payload");
  if (payloadBtn?.dataset.payloadPath) {
    e.stopPropagation();
    const path = payloadBtn.dataset.payloadPath;
    const currentlyLoaded = payloadBtn.dataset.payloadLoaded === "1";
    runtime.setPayloadLoaded(path, !currentlyLoaded);
    void applyStageEdit(
      path,
      currentlyLoaded ? "unloading payload..." : "loading payload..."
    );
    return;
  }

  const item = (e.target as Element).closest<HTMLElement>(".sg-item");
  if (!item?.dataset.path) return;
  const point = { x: e.clientX, y: e.clientY };
  if (e.ctrlKey || e.metaKey || e.shiftKey) {
    toggleSelectionPath(item.dataset.path, point);
  } else {
    selectPrimByPath(item.dataset.path, point);
  }
});
