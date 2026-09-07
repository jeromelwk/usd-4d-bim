"""Build a JSON-serializable prim tree from a USD stage."""
from __future__ import annotations

from typing import Any, Optional

from pxr import Usd, UsdGeom

from app import fourd_schema


def _bbox(bbox_cache: UsdGeom.BBoxCache, prim: Usd.Prim) -> Optional[dict]:
    if not prim.IsA(UsdGeom.Boundable):
        return None
    try:
        world_bbox = bbox_cache.ComputeWorldBound(prim)
        rng = world_bbox.ComputeAlignedRange()
    except Exception:
        return None
    if rng.IsEmpty():
        return None
    return {"min": list(rng.GetMin()), "max": list(rng.GetMax())}


def _visit(prim: Usd.Prim, bbox_cache: UsdGeom.BBoxCache, include_schedule: bool) -> dict[str, Any]:
    type_name = prim.GetTypeName()
    node: dict[str, Any] = {
        "path": str(prim.GetPath()),
        "name": prim.GetName(),
        "type": str(type_name) if type_name else "Prim",
        "kind": Usd.ModelAPI(prim).GetKind() or None,
        "bbox": _bbox(bbox_cache, prim),
        "children": [_visit(c, bbox_cache, include_schedule) for c in prim.GetChildren()],
    }
    if include_schedule:
        node["appear"] = fourd_schema.get_appear(prim)
        node["disappear"] = fourd_schema.get_disappear(prim)
    return node


def build_tree(stage: Usd.Stage, include_schedule: bool = False) -> list[dict[str, Any]]:
    bbox_cache = UsdGeom.BBoxCache(Usd.TimeCode.Default(), [UsdGeom.Tokens.default_, UsdGeom.Tokens.render])
    root = stage.GetPseudoRoot()
    return [_visit(c, bbox_cache, include_schedule) for c in root.GetChildren()]


def collect_assignments(stage: Usd.Stage) -> list[dict[str, Any]]:
    """Walk the composed stage and collect every prim with an authored fourD:appear."""
    assignments = []
    for prim in stage.Traverse():
        appear = fourd_schema.get_appear(prim)
        if appear is None:
            continue
        assignments.append({
            "primPath": str(prim.GetPath()),
            "appear": appear,
            "disappear": fourd_schema.get_disappear(prim),
        })
    return assignments
