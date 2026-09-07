export type Mode = "calendar" | "phase";

export interface Bbox {
  min: [number, number, number];
  max: [number, number, number];
}

export interface PrimNode {
  path: string;
  name: string;
  type: string;
  kind: string | null;
  bbox: Bbox | null;
  children: PrimNode[];
  appear?: string | null;
  disappear?: string | null;
}

export interface Phase {
  id: string;
  name: string;
}

export interface CalendarConfig {
  projectStart: string;
  projectEnd: string;
}

export interface PhaseConfig {
  phases: Phase[];
}

export interface Assignment {
  primPath: string;
  appear: string;
  disappear: string | null;
}

export interface GeometryResponse {
  sessionId: string;
  geometryFile: string;
  tree: PrimNode[];
}

export interface TreeResponse {
  sessionId: string;
  tree: PrimNode[];
}

export interface ExportRequest {
  mode: Mode;
  calendar: CalendarConfig;
  phase: PhaseConfig;
  assignments: Assignment[];
}

export interface TimeCodeRange {
  start: number;
  end: number;
}

export interface ExportResponse {
  sessionId: string;
  scheduleFile: string;
  primsAssigned: number;
  timeCodeRange: TimeCodeRange;
}

export interface ScheduleStateResponse {
  sessionId: string;
  mode: Mode;
  calendar: CalendarConfig;
  phase: PhaseConfig;
  assignments: Assignment[];
  tree: PrimNode[];
}

export interface ApiErrorBody {
  detail?: string | { detail?: string; errors?: string[] };
  errors?: string[];
}

export class ApiError extends Error {
  status: number;
  errors: string[];

  constructor(status: number, message: string, errors: string[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
