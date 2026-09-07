"""Core OpenUSD logic: sample generation, geometry parsing, schedule export/import.

Deliberately decoupled from FastAPI so it can be unit-tested with plain pytest.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Optional

from pxr import Usd, UsdGeom, Sdf, Tf

from app import fourd_schema, prim_tree, visibility_bake


class ScheduleValidationError(ValueError):
    def __init__(self, errors: list[str]):
        super().__init__("; ".join(errors))
        self.errors = errors


def _safe_open_stage(path: Path) -> Usd.Stage:
    """Open a USD stage, converting any pxr parse error into a ValueError."""
    try:
        stage = Usd.Stage.Open(str(path))
    except Tf.ErrorException as exc:
        raise ValueError(f"Fichier USD invalide ou illisible: {path.name}") from exc
    if not stage:
        raise ValueError(f"Fichier USD invalide ou illisible: {path.name}")
    return stage


# ---------------------------------------------------------------------------
# Sample geometry generation
# ---------------------------------------------------------------------------

def _make_box_mesh(mesh: UsdGeom.Mesh, origin: tuple[float, float, float], size: tuple[float, float, float]) -> None:
    x, y, z = origin
    sx, sy, sz = size
    points = [
        (x, y, z), (x + sx, y, z), (x + sx, y + sy, z), (x, y + sy, z),
        (x, y, z + sz), (x + sx, y, z + sz), (x + sx, y + sy, z + sz), (x, y + sy, z + sz),
    ]
    face_vertex_counts = [4] * 6
    face_vertex_indices = [
        0, 1, 2, 3,
        4, 5, 6, 7,
        0, 1, 5, 4,
        1, 2, 6, 5,
        2, 3, 7, 6,
        3, 0, 4, 7,
    ]
    mesh.CreatePointsAttr(points)
    mesh.CreateFaceVertexCountsAttr(face_vertex_counts)
    mesh.CreateFaceVertexIndicesAttr(face_vertex_indices)
    extent = UsdGeom.PointBased.ComputeExtent(points)
    mesh.CreateExtentAttr(extent)


def generate_sample_building(dest_path: Path) -> None:
    """Write a small demo building (4 Xform, 9 Mesh) to dest_path."""
    stage = Usd.Stage.CreateNew(str(dest_path))
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.z)
    UsdGeom.SetStageMetersPerUnit(stage, 1.0)

    building = UsdGeom.Xform.Define(stage, "/Building")

    foundation = UsdGeom.Mesh.Define(stage, "/Building/Foundation")
    _make_box_mesh(foundation, (0, 0, -0.3), (10, 8, 0.3))

    UsdGeom.Xform.Define(stage, "/Building/Floor1")

    UsdGeom.Xform.Define(stage, "/Building/Floor1/Walls")
    wall_north = UsdGeom.Mesh.Define(stage, "/Building/Floor1/Walls/Wall_North")
    _make_box_mesh(wall_north, (0, 7.8, 0), (10, 0.2, 3))
    wall_south = UsdGeom.Mesh.Define(stage, "/Building/Floor1/Walls/Wall_South")
    _make_box_mesh(wall_south, (0, 0, 0), (10, 0.2, 3))
    wall_east = UsdGeom.Mesh.Define(stage, "/Building/Floor1/Walls/Wall_East")
    _make_box_mesh(wall_east, (9.8, 0, 0), (0.2, 8, 3))
    wall_west = UsdGeom.Mesh.Define(stage, "/Building/Floor1/Walls/Wall_West")
    _make_box_mesh(wall_west, (0, 0, 0), (0.2, 8, 3))

    UsdGeom.Xform.Define(stage, "/Building/Floor1/Columns")
    column_1 = UsdGeom.Mesh.Define(stage, "/Building/Floor1/Columns/Column_1")
    _make_box_mesh(column_1, (2, 2, 0), (0.3, 0.3, 3))
    column_2 = UsdGeom.Mesh.Define(stage, "/Building/Floor1/Columns/Column_2")
    _make_box_mesh(column_2, (7, 6, 0), (0.3, 0.3, 3))

    slab = UsdGeom.Mesh.Define(stage, "/Building/Floor1/Slab")
    _make_box_mesh(slab, (0, 0, 3), (10, 8, 0.2))

    roof = UsdGeom.Mesh.Define(stage, "/Building/Roof")
    _make_box_mesh(roof, (0, 0, 3.2), (10, 8, 0.5))

    stage.SetDefaultPrim(building.GetPrim())
    stage.GetRootLayer().Save()


# ---------------------------------------------------------------------------
# Geometry upload / parsing
# ---------------------------------------------------------------------------

def open_and_normalize_geometry(source_path: Path, dest_path: Path) -> None:
    """Open an uploaded .usd/.usda/.usdc file and re-save it as ASCII at dest_path."""
    stage = _safe_open_stage(source_path)
    stage.GetRootLayer().Export(str(dest_path))


def load_geometry_tree(geometry_file: Path) -> list[dict]:
    if not geometry_file.exists():
        raise ValueError("geometry.usda introuvable")
    stage = _safe_open_stage(geometry_file)
    return prim_tree.build_tree(stage)


# ---------------------------------------------------------------------------
# Schedule export
# ---------------------------------------------------------------------------

def _validate_assignments(mode: str, calendar: dict, phase: dict, assignments: list[dict]) -> tuple[Optional[date], Optional[date], list[str]]:
    errors: list[str] = []
    start: Optional[date] = None
    end: Optional[date] = None

    if mode == "calendar":
        try:
            start = date.fromisoformat(calendar["projectStart"])
            end = date.fromisoformat(calendar["projectEnd"])
        except Exception as exc:
            raise ScheduleValidationError([f"Plage de dates de projet invalide: {exc}"])
        for a in assignments:
            for key in ("appear", "disappear"):
                value = a.get(key)
                if value is None:
                    continue
                try:
                    date.fromisoformat(value)
                except ValueError:
                    errors.append(f"{a['primPath']}: {key} '{value}' n'est pas une date ISO valide")
    elif mode == "phase":
        phase_ids = [p["id"] for p in phase.get("phases", [])]
        if not phase_ids:
            raise ScheduleValidationError(["La liste de phases est vide"])
        for a in assignments:
            for key in ("appear", "disappear"):
                value = a.get(key)
                if value is None:
                    continue
                if value not in phase_ids:
                    errors.append(f"{a['primPath']}: {key} '{value}' ne correspond a aucune phase connue")
    else:
        raise ScheduleValidationError([f"mode inconnu: {mode}"])

    return start, end, errors


def export_schedule(
    geometry_file: Path,
    schedule_file: Path,
    mode: str,
    calendar: dict,
    phase: dict,
    assignments: list[dict],
) -> dict:
    if not geometry_file.exists():
        raise ValueError("geometry.usda introuvable pour cette session")

    geo_stage = _safe_open_stage(geometry_file)

    start, end, errors = _validate_assignments(mode, calendar, phase, assignments)

    for a in assignments:
        if not geo_stage.GetPrimAtPath(a["primPath"]):
            errors.append(f"Prim introuvable dans la geometrie: {a['primPath']}")

    if errors:
        raise ScheduleValidationError(errors)

    if schedule_file.exists():
        schedule_file.unlink()
    schedule_layer = Sdf.Layer.CreateNew(str(schedule_file))
    schedule_layer.subLayerPaths.append(f"./{geometry_file.name}")

    stage = Usd.Stage.Open(schedule_layer)

    for a in assignments:
        prim = stage.OverridePrim(a["primPath"])
        fourd_schema.set_appear(prim, a["appear"])
        if a.get("disappear"):
            fourd_schema.set_disappear(prim, a["disappear"])

    frame_mapping = {
        "unit": "day" if mode == "calendar" else "phaseIndex",
        "framesPerUnit": 1.0,
        "startTimeCode": 0.0,
    }
    stage.GetRootLayer().customLayerData = fourd_schema.build_custom_layer_data(mode, calendar, phase, frame_mapping)

    bake_assignments = [
        visibility_bake.Assignment(a["primPath"], a["appear"], a.get("disappear")) for a in assignments
    ]
    if mode == "calendar":
        start_frame, end_frame = visibility_bake.bake_visibility(
            stage, mode, bake_assignments, project_start=start, project_end=end
        )
    else:
        phase_ids = [p["id"] for p in phase.get("phases", [])]
        start_frame, end_frame = visibility_bake.bake_visibility(
            stage, mode, bake_assignments, phase_order=phase_ids
        )

    stage.GetRootLayer().Save()

    return {
        "primsAssigned": len(assignments),
        "timeCodeRange": {"start": start_frame, "end": end_frame},
    }


# ---------------------------------------------------------------------------
# Schedule import (round-trip)
# ---------------------------------------------------------------------------

def import_schedule(schedule_file: Path) -> dict:
    if not schedule_file.exists():
        raise ValueError("schedule.usda introuvable pour cette session")
    stage = _safe_open_stage(schedule_file)

    meta = fourd_schema.read_custom_layer_data(stage.GetRootLayer())
    mode = meta.get("mode", "calendar")
    calendar = meta.get("calendar", {})
    phase = meta.get("phase", {})
    assignments = prim_tree.collect_assignments(stage)
    tree = prim_tree.build_tree(stage, include_schedule=True)

    return {
        "mode": mode,
        "calendar": calendar,
        "phase": phase,
        "assignments": assignments,
        "tree": tree,
    }
