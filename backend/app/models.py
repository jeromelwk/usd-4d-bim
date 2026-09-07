"""Pydantic request/response DTOs for the FastAPI layer."""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class PrimNode(BaseModel):
    path: str
    name: str
    type: str
    kind: Optional[str] = None
    bbox: Optional[dict[str, list[float]]] = None
    children: list["PrimNode"] = []
    appear: Optional[str] = None
    disappear: Optional[str] = None


PrimNode.model_rebuild()


class GeometryResponse(BaseModel):
    sessionId: str
    geometryFile: str
    tree: list[PrimNode]


class TreeResponse(BaseModel):
    sessionId: str
    tree: list[PrimNode]


class Phase(BaseModel):
    id: str
    name: str


class CalendarConfig(BaseModel):
    projectStart: str
    projectEnd: str


class PhaseConfig(BaseModel):
    phases: list[Phase] = []


class Assignment(BaseModel):
    primPath: str
    appear: str
    disappear: Optional[str] = None


class ExportRequest(BaseModel):
    mode: str  # "calendar" | "phase"
    calendar: CalendarConfig
    phase: PhaseConfig
    assignments: list[Assignment]


class TimeCodeRange(BaseModel):
    start: float
    end: float


class ExportResponse(BaseModel):
    sessionId: str
    scheduleFile: str
    primsAssigned: int
    timeCodeRange: TimeCodeRange


class ScheduleStateResponse(BaseModel):
    sessionId: str
    mode: str
    calendar: CalendarConfig
    phase: PhaseConfig
    assignments: list[Assignment]
    tree: list[PrimNode]


class ErrorResponse(BaseModel):
    detail: str
    errors: list[str] = []
