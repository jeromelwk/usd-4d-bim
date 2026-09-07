import type { CalendarConfig, Phase } from "../api/types";

export function calendarDateToPct(value: string, calendar: CalendarConfig): number {
  const start = new Date(calendar.projectStart).getTime();
  const end = new Date(calendar.projectEnd).getTime();
  const v = new Date(value).getTime();
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, ((v - start) / (end - start)) * 100));
}

export function pctToCalendarDate(pct: number, calendar: CalendarConfig): string {
  const start = new Date(calendar.projectStart).getTime();
  const end = new Date(calendar.projectEnd).getTime();
  if (end <= start) return calendar.projectStart;
  const clamped = Math.min(100, Math.max(0, pct));
  const days = Math.round(((clamped / 100) * (end - start)) / 86400000);
  return new Date(start + days * 86400000).toISOString().slice(0, 10);
}

export function phaseIdToPct(phaseId: string, phases: Phase[]): number {
  const idx = phases.findIndex((p) => p.id === phaseId);
  if (idx < 0 || phases.length === 0) return 0;
  return (idx / phases.length) * 100;
}

export function pctToPhaseId(pct: number, phases: Phase[]): string | null {
  if (phases.length === 0) return null;
  const idx = Math.round((Math.min(100, Math.max(0, pct)) / 100) * phases.length);
  return phases[Math.min(phases.length - 1, Math.max(0, idx))]?.id ?? null;
}
