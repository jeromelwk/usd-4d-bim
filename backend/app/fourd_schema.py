"""Constants and helpers for the custom `fourD:` USD attribute namespace.

The `fourD:` namespace is the source of truth for scheduling data authored on
`over` prim specs in a schedule layer. Baked `visibility` time samples
(see visibility_bake.py) are a derived convenience for standard USD viewers,
not the source of truth.
"""
from __future__ import annotations

from typing import Optional

from pxr import Usd, Sdf, Vt

ATTR_APPEAR = "fourD:appear"
ATTR_DISAPPEAR = "fourD:disappear"

CUSTOM_LAYER_DATA_KEY = "fourD"
SCHEMA_VERSION = 1


def set_appear(prim: Usd.Prim, value: str) -> None:
    attr = prim.CreateAttribute(ATTR_APPEAR, Sdf.ValueTypeNames.String, custom=True)
    attr.Set(value)


def set_disappear(prim: Usd.Prim, value: str) -> None:
    attr = prim.CreateAttribute(ATTR_DISAPPEAR, Sdf.ValueTypeNames.String, custom=True)
    attr.Set(value)


def get_appear(prim: Usd.Prim) -> Optional[str]:
    attr = prim.GetAttribute(ATTR_APPEAR)
    if attr and attr.IsAuthored():
        return attr.Get()
    return None


def get_disappear(prim: Usd.Prim) -> Optional[str]:
    attr = prim.GetAttribute(ATTR_DISAPPEAR)
    if attr and attr.IsAuthored():
        return attr.Get()
    return None


def has_schedule(prim: Usd.Prim) -> bool:
    return get_appear(prim) is not None


def build_custom_layer_data(mode: str, calendar: dict, phase: dict, frame_mapping: dict) -> dict:
    """Build the customLayerData dict authored on the schedule layer root.

    Note: USD's customLayerData (a VtDictionary) cannot reliably round-trip a
    plain Python list through the text file writer/parser -- it gets converted
    to a heterogeneous vector<VtValue>, which is not a registered serializable
    type (and a list of dicts is even less supported). So the phase list is
    flattened into parallel Vt.StringArray fields (phaseIds/phaseNames), which
    USD writes as a typed `string[]`, and reassembled into {"phases": [...]}
    on read.
    """
    phases = phase.get("phases", [])
    flat_phase = {
        "phaseIds": Vt.StringArray([p["id"] for p in phases]),
        "phaseNames": Vt.StringArray([p["name"] for p in phases]),
    }
    return {
        CUSTOM_LAYER_DATA_KEY: {
            "schemaVersion": SCHEMA_VERSION,
            "mode": mode,
            "calendar": calendar,
            "phase": flat_phase,
            "frameMapping": frame_mapping,
        }
    }


def read_custom_layer_data(root_layer: Sdf.Layer) -> dict:
    data = root_layer.customLayerData or {}
    raw = dict(data.get(CUSTOM_LAYER_DATA_KEY, {}))
    flat_phase = raw.get("phase") or {}
    phase_ids = flat_phase.get("phaseIds", [])
    phase_names = flat_phase.get("phaseNames", [])
    raw["phase"] = {"phases": [{"id": i, "name": n} for i, n in zip(phase_ids, phase_names)]}
    return raw
