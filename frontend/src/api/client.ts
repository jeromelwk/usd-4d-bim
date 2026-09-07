import {
  ApiError,
  type ApiErrorBody,
  type ExportRequest,
  type ExportResponse,
  type GeometryResponse,
  type ScheduleStateResponse,
  type TreeResponse,
} from "./types";

const BASE = "/api";

async function handle<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let body: ApiErrorBody = {};
    try {
      body = await resp.json();
    } catch {
      // ignore, keep body empty
    }
    const detail = body.detail;
    if (typeof detail === "object" && detail !== null) {
      throw new ApiError(resp.status, detail.detail ?? "Erreur inconnue", detail.errors ?? []);
    }
    throw new ApiError(resp.status, (detail as string) ?? resp.statusText, body.errors ?? []);
  }
  return resp.json() as Promise<T>;
}

export async function uploadGeometry(file: File): Promise<GeometryResponse> {
  const form = new FormData();
  form.append("file", file);
  const resp = await fetch(`${BASE}/geometry/upload`, { method: "POST", body: form });
  return handle<GeometryResponse>(resp);
}

export async function generateSample(): Promise<GeometryResponse> {
  const resp = await fetch(`${BASE}/geometry/sample`, { method: "POST" });
  return handle<GeometryResponse>(resp);
}

export async function fetchTree(sessionId: string): Promise<TreeResponse> {
  const resp = await fetch(`${BASE}/geometry/tree?sessionId=${encodeURIComponent(sessionId)}`);
  return handle<TreeResponse>(resp);
}

export async function exportSchedule(sessionId: string, payload: ExportRequest): Promise<ExportResponse> {
  const resp = await fetch(`${BASE}/schedule/export?sessionId=${encodeURIComponent(sessionId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle<ExportResponse>(resp);
}

export async function importSchedule(sessionId: string): Promise<ScheduleStateResponse> {
  const resp = await fetch(`${BASE}/schedule/import?sessionId=${encodeURIComponent(sessionId)}`);
  return handle<ScheduleStateResponse>(resp);
}

export async function uploadSchedule(geometry: File, schedule: File): Promise<ScheduleStateResponse> {
  const form = new FormData();
  form.append("geometry", geometry);
  form.append("schedule", schedule);
  const resp = await fetch(`${BASE}/schedule/upload`, { method: "POST", body: form });
  return handle<ScheduleStateResponse>(resp);
}

export function downloadFileUrl(sessionId: string, fileKind: "geometry" | "schedule"): string {
  return `${BASE}/download/${fileKind}?sessionId=${encodeURIComponent(sessionId)}`;
}
