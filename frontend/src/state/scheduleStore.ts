import { create } from "zustand";
import type {
  Assignment,
  CalendarConfig,
  Mode,
  Phase,
  PhaseConfig,
  PrimNode,
  ScheduleStateResponse,
} from "../api/types";

function defaultCalendar(): CalendarConfig {
  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const end = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate())
    .toISOString()
    .slice(0, 10);
  return { projectStart: start, projectEnd: end };
}

function defaultPhases(): Phase[] {
  return [
    { id: "phase-1", name: "Fondations" },
    { id: "phase-2", name: "Structure" },
    { id: "phase-3", name: "Second oeuvre" },
    { id: "phase-4", name: "Finitions" },
  ];
}

export type UpAxisChoice = "stage" | "y" | "z";

interface ScheduleStore {
  sessionId: string | null;
  tree: PrimNode[];
  mode: Mode;
  calendar: CalendarConfig;
  phase: PhaseConfig;
  assignments: Record<string, Assignment>;
  selectedPrimPaths: string[];
  // A schedule.usda exists on disk for this session (export or import
  // succeeded) and can be loaded into the 3D preview's timeline.
  hasSchedule: boolean;
  // True once mode/calendar/phase/assignments changed since the schedule was
  // last exported/imported -- the 3D preview would be showing a stale bake.
  scheduleIsStale: boolean;
  // Bumped every time a fresh schedule.usda is available, so the 3D preview
  // knows to reload it (its own fetch cache would otherwise keep old bytes).
  viewerReloadNonce: number;
  // Display-only preference for the 3D preview; not part of the saved
  // schedule, persists across sessions in this tab.
  viewerUpAxis: UpAxisChoice;

  setSession: (sessionId: string, tree: PrimNode[]) => void;
  setTree: (tree: PrimNode[]) => void;
  setMode: (mode: Mode) => void;
  setCalendar: (calendar: CalendarConfig) => void;
  setViewerUpAxis: (choice: UpAxisChoice) => void;

  addPhase: (name: string) => void;
  removePhase: (id: string) => void;
  renamePhase: (id: string, name: string) => void;
  movePhase: (id: string, direction: -1 | 1) => void;

  togglePrimSelection: (path: string, additive: boolean) => void;
  setSelection: (paths: string[]) => void;
  clearSelection: () => void;

  bulkAssign: (paths: string[], appear: string, disappear: string | null) => void;
  removeAssignment: (path: string) => void;

  markScheduleExported: () => void;
  loadFromImport: (state: ScheduleStateResponse) => void;
  reset: () => void;
}

let phaseCounter = defaultPhases().length;

export const useScheduleStore = create<ScheduleStore>((set) => ({
  sessionId: null,
  tree: [],
  mode: "calendar",
  calendar: defaultCalendar(),
  phase: { phases: defaultPhases() },
  assignments: {},
  selectedPrimPaths: [],
  hasSchedule: false,
  scheduleIsStale: false,
  viewerReloadNonce: 0,
  viewerUpAxis: "stage",

  setSession: (sessionId, tree) =>
    set({
      sessionId,
      tree,
      assignments: {},
      selectedPrimPaths: [],
      hasSchedule: false,
      scheduleIsStale: false,
    }),
  setTree: (tree) => set({ tree }),
  setMode: (mode) => set((s) => ({ mode, scheduleIsStale: s.hasSchedule || s.scheduleIsStale })),
  setCalendar: (calendar) =>
    set((s) => ({ calendar, scheduleIsStale: s.hasSchedule || s.scheduleIsStale })),
  setViewerUpAxis: (viewerUpAxis) => set({ viewerUpAxis }),

  addPhase: (name) =>
    set((s) => {
      phaseCounter += 1;
      const id = `phase-${phaseCounter}`;
      return {
        phase: { phases: [...s.phase.phases, { id, name }] },
        scheduleIsStale: s.hasSchedule || s.scheduleIsStale,
      };
    }),
  removePhase: (id) =>
    set((s) => ({
      phase: { phases: s.phase.phases.filter((p) => p.id !== id) },
      scheduleIsStale: s.hasSchedule || s.scheduleIsStale,
    })),
  renamePhase: (id, name) =>
    set((s) => ({
      phase: { phases: s.phase.phases.map((p) => (p.id === id ? { ...p, name } : p)) },
      scheduleIsStale: s.hasSchedule || s.scheduleIsStale,
    })),
  movePhase: (id, direction) =>
    set((s) => {
      const phases = [...s.phase.phases];
      const idx = phases.findIndex((p) => p.id === id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= phases.length) return {};
      [phases[idx], phases[target]] = [phases[target], phases[idx]];
      return { phase: { phases }, scheduleIsStale: s.hasSchedule || s.scheduleIsStale };
    }),

  togglePrimSelection: (path, additive) =>
    set((s) => {
      if (!additive) {
        const isOnlySelected = s.selectedPrimPaths.length === 1 && s.selectedPrimPaths[0] === path;
        return { selectedPrimPaths: isOnlySelected ? [] : [path] };
      }
      const exists = s.selectedPrimPaths.includes(path);
      return {
        selectedPrimPaths: exists
          ? s.selectedPrimPaths.filter((p) => p !== path)
          : [...s.selectedPrimPaths, path],
      };
    }),
  setSelection: (paths) => set({ selectedPrimPaths: paths }),
  clearSelection: () => set({ selectedPrimPaths: [] }),

  bulkAssign: (paths, appear, disappear) =>
    set((s) => {
      const next = { ...s.assignments };
      for (const path of paths) {
        next[path] = { primPath: path, appear, disappear };
      }
      return { assignments: next, scheduleIsStale: s.hasSchedule || s.scheduleIsStale };
    }),
  removeAssignment: (path) =>
    set((s) => {
      const next = { ...s.assignments };
      delete next[path];
      return { assignments: next, scheduleIsStale: s.hasSchedule || s.scheduleIsStale };
    }),

  markScheduleExported: () =>
    set((s) => ({ hasSchedule: true, scheduleIsStale: false, viewerReloadNonce: s.viewerReloadNonce + 1 })),

  loadFromImport: (state) =>
    set((s) => {
      const assignments: Record<string, Assignment> = {};
      for (const a of state.assignments) {
        assignments[a.primPath] = a;
      }
      const maxPhaseNum = state.phase.phases.reduce((max, p) => {
        const m = /^phase-(\d+)$/.exec(p.id);
        return m ? Math.max(max, Number(m[1])) : max;
      }, 0);
      phaseCounter = Math.max(phaseCounter, maxPhaseNum);
      return {
        sessionId: state.sessionId,
        mode: state.mode,
        calendar: state.calendar,
        phase: state.phase,
        assignments,
        tree: state.tree,
        selectedPrimPaths: [],
        hasSchedule: true,
        scheduleIsStale: false,
        viewerReloadNonce: s.viewerReloadNonce + 1,
      };
    }),

  reset: () =>
    set({
      sessionId: null,
      tree: [],
      mode: "calendar",
      calendar: defaultCalendar(),
      phase: { phases: defaultPhases() },
      assignments: {},
      selectedPrimPaths: [],
      hasSchedule: false,
      scheduleIsStale: false,
    }),
}));
