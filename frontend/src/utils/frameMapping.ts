import type { CalendarConfig, Mode, Phase } from "../api/types";

// Mirrors the backend's visibility_bake.py frame convention: 1 frame = 1 day
// in calendar mode, 1 frame = 1 phase index in phase mode.

export function computeTotalFrames(mode: Mode, calendar: CalendarConfig, phases: Phase[]): number {
  if (mode === "calendar") {
    const start = new Date(calendar.projectStart).getTime();
    const end = new Date(calendar.projectEnd).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
    return Math.round((end - start) / 86400000);
  }
  return Math.max(phases.length - 1, 0);
}

export function formatDateDMY(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export function frameToLabel(mode: Mode, calendar: CalendarConfig, phases: Phase[], frame: number): string {
  if (mode === "calendar") {
    const d = new Date(calendar.projectStart);
    if (Number.isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + Math.round(frame));
    return formatDateDMY(d.toISOString().slice(0, 10));
  }
  const phase = phases[Math.round(frame)];
  return phase ? phase.name : "";
}
