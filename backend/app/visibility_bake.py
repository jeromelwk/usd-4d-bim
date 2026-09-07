"""Bake standard USD `visibility` time samples from fourD: schedule data.

This is a derived convenience so the composed stage plays back correctly in
any standard USD-aware viewer (usdview, DCC tools) without understanding the
custom `fourD:` namespace. It is never the source of truth.

Frame mapping convention: 1 USD time-code frame = 1 day (calendar mode) or
1 frame = 1 phase index (phase mode), starting at frame 0.
"""
from __future__ import annotations

from datetime import date
from typing import Iterable, List, Optional

from pxr import Usd, UsdGeom


def frame_for_calendar_date(date_str: str, project_start: date, frames_per_unit: float = 1.0) -> float:
    d = date.fromisoformat(date_str)
    return (d - project_start).days * frames_per_unit


def frame_for_phase(phase_id: str, phase_order: List[str], frames_per_unit: float = 1.0) -> float:
    return phase_order.index(phase_id) * frames_per_unit


class Assignment:
    __slots__ = ("prim_path", "appear", "disappear")

    def __init__(self, prim_path: str, appear: str, disappear: Optional[str]):
        self.prim_path = prim_path
        self.appear = appear
        self.disappear = disappear


def bake_visibility(
    stage: Usd.Stage,
    mode: str,
    assignments: Iterable[Assignment],
    *,
    project_start: Optional[date] = None,
    project_end: Optional[date] = None,
    phase_order: Optional[List[str]] = None,
) -> tuple[float, float]:
    """Author time-varying visibility on each assigned prim. Returns (start_frame, end_frame)."""
    if mode == "calendar":
        if project_start is None or project_end is None:
            raise ValueError("project_start/project_end required for calendar mode")
        total_frames = float((project_end - project_start).days)

        def to_frame(value: str) -> float:
            return frame_for_calendar_date(value, project_start)
    elif mode == "phase":
        if not phase_order:
            raise ValueError("phase_order required for phase mode")
        total_frames = float(max(len(phase_order) - 1, 0))

        def to_frame(value: str) -> float:
            return frame_for_phase(value, phase_order)
    else:
        raise ValueError(f"unknown mode: {mode}")

    stage.SetStartTimeCode(0.0)
    stage.SetEndTimeCode(total_frames)
    stage.SetTimeCodesPerSecond(24.0)
    stage.SetFramesPerSecond(24.0)

    for assignment in assignments:
        prim = stage.GetPrimAtPath(assignment.prim_path)
        if not prim:
            continue
        imageable = UsdGeom.Imageable(prim)
        vis_attr = imageable.CreateVisibilityAttr()
        appear_frame = to_frame(assignment.appear)

        if appear_frame > 0.0:
            vis_attr.Set(UsdGeom.Tokens.invisible, Usd.TimeCode(0.0))
        vis_attr.Set(UsdGeom.Tokens.inherited, Usd.TimeCode(appear_frame))

        if assignment.disappear:
            disappear_frame = to_frame(assignment.disappear)
            vis_attr.Set(UsdGeom.Tokens.invisible, Usd.TimeCode(disappear_frame))

    return 0.0, total_frames
