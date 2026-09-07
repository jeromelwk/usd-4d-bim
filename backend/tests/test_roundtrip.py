import pytest
from pxr import Usd, UsdGeom, Sdf

from app import usd_service, fourd_schema


CALENDAR_PAYLOAD = {
    "mode": "calendar",
    "calendar": {"projectStart": "2026-01-01", "projectEnd": "2026-12-31"},
    "phase": {"phases": []},
    "assignments": [
        {"primPath": "/Building/Foundation", "appear": "2026-01-01", "disappear": None},
        {"primPath": "/Building/Floor1/Walls/Wall_North", "appear": "2026-03-01", "disappear": None},
        {"primPath": "/Building/Floor1/Walls/Wall_South", "appear": "2026-03-01", "disappear": None},
        {"primPath": "/Building/Roof", "appear": "2026-06-01", "disappear": "2026-11-01"},
    ],
}

PHASE_LIST = [
    {"id": "phase-1", "name": "Fondations"},
    {"id": "phase-2", "name": "Structure"},
    {"id": "phase-3", "name": "Second oeuvre"},
    {"id": "phase-4", "name": "Finitions"},
]

PHASE_PAYLOAD = {
    "mode": "phase",
    "calendar": {"projectStart": "2026-01-01", "projectEnd": "2026-12-31"},
    "phase": {"phases": PHASE_LIST},
    "assignments": [
        {"primPath": "/Building/Foundation", "appear": "phase-1", "disappear": None},
        {"primPath": "/Building/Floor1/Walls/Wall_North", "appear": "phase-2", "disappear": None},
        {"primPath": "/Building/Roof", "appear": "phase-2", "disappear": "phase-4"},
    ],
}


@pytest.fixture
def geometry_file(tmp_path):
    path = tmp_path / "geometry.usda"
    usd_service.generate_sample_building(path)
    return path


def _export(tmp_path, geometry_file, payload):
    schedule_file = tmp_path / "schedule.usda"
    result = usd_service.export_schedule(
        geometry_file,
        schedule_file,
        payload["mode"],
        payload["calendar"],
        payload["phase"],
        payload["assignments"],
    )
    return schedule_file, result


def test_export_calendar_mode(tmp_path, geometry_file):
    schedule_file, result = _export(tmp_path, geometry_file, CALENDAR_PAYLOAD)
    assert schedule_file.exists()
    assert result["primsAssigned"] == 4

    sublayer = Sdf.Layer.FindOrOpen(str(schedule_file))
    assert list(sublayer.subLayerPaths) == ["./geometry.usda"]

    stage = Usd.Stage.Open(str(schedule_file))
    root_meta = stage.GetRootLayer().customLayerData["fourD"]
    assert root_meta["mode"] == "calendar"
    assert root_meta["calendar"]["projectStart"] == "2026-01-01"

    foundation = stage.GetPrimAtPath("/Building/Foundation")
    assert fourd_schema.get_appear(foundation) == "2026-01-01"
    assert fourd_schema.get_disappear(foundation) is None

    roof = stage.GetPrimAtPath("/Building/Roof")
    assert fourd_schema.get_appear(roof) == "2026-06-01"
    assert fourd_schema.get_disappear(roof) == "2026-11-01"

    # visibility baked correctly: invisible before appear, visible after, invisible after disappear
    vis_attr = UsdGeom.Imageable(roof).GetVisibilityAttr()
    appear_frame = (
        __import__("datetime").date.fromisoformat("2026-06-01")
        - __import__("datetime").date.fromisoformat("2026-01-01")
    ).days
    disappear_frame = (
        __import__("datetime").date.fromisoformat("2026-11-01")
        - __import__("datetime").date.fromisoformat("2026-01-01")
    ).days

    assert vis_attr.Get(Usd.TimeCode(0.0)) == UsdGeom.Tokens.invisible
    assert vis_attr.Get(Usd.TimeCode(appear_frame)) == UsdGeom.Tokens.inherited
    assert vis_attr.Get(Usd.TimeCode(appear_frame + 5)) == UsdGeom.Tokens.inherited
    assert vis_attr.Get(Usd.TimeCode(disappear_frame)) == UsdGeom.Tokens.invisible

    # a prim never assigned keeps default (inherited) visibility, untouched
    col1 = stage.GetPrimAtPath("/Building/Floor1/Columns/Column_1")
    assert fourd_schema.get_appear(col1) is None


def test_export_phase_mode(tmp_path, geometry_file):
    schedule_file, result = _export(tmp_path, geometry_file, PHASE_PAYLOAD)
    assert result["primsAssigned"] == 3

    stage = Usd.Stage.Open(str(schedule_file))
    root_meta = fourd_schema.read_custom_layer_data(stage.GetRootLayer())
    assert root_meta["mode"] == "phase"
    assert [p["id"] for p in root_meta["phase"]["phases"]] == [p["id"] for p in PHASE_LIST]

    roof = stage.GetPrimAtPath("/Building/Roof")
    vis_attr = UsdGeom.Imageable(roof).GetVisibilityAttr()
    # phase-2 -> index 1, phase-4 -> index 3
    assert vis_attr.Get(Usd.TimeCode(0.0)) == UsdGeom.Tokens.invisible
    assert vis_attr.Get(Usd.TimeCode(1.0)) == UsdGeom.Tokens.inherited
    assert vis_attr.Get(Usd.TimeCode(3.0)) == UsdGeom.Tokens.invisible


def test_geometry_layer_untouched(tmp_path, geometry_file):
    _export(tmp_path, geometry_file, CALENDAR_PAYLOAD)

    geo_layer = Sdf.Layer.FindOrOpen(str(geometry_file))
    text = geo_layer.ExportToString()
    assert "fourD:" not in text
    assert "visibility.timeSamples" not in text
    assert "timeSamples" not in text


def test_roundtrip_fidelity(tmp_path, geometry_file):
    schedule_file, _ = _export(tmp_path, geometry_file, CALENDAR_PAYLOAD)

    imported = usd_service.import_schedule(schedule_file)
    assert imported["mode"] == CALENDAR_PAYLOAD["mode"]
    assert imported["calendar"] == CALENDAR_PAYLOAD["calendar"]

    expected = {(a["primPath"], a["appear"], a["disappear"]) for a in CALENDAR_PAYLOAD["assignments"]}
    actual = {(a["primPath"], a["appear"], a["disappear"]) for a in imported["assignments"]}
    assert actual == expected

    # tree should include full composed geometry (round-trip includes geometry via sublayer)
    paths = set()

    def _collect(node):
        paths.add(node["path"])
        for c in node["children"]:
            _collect(c)

    for n in imported["tree"]:
        _collect(n)
    assert "/Building/Floor1/Columns/Column_1" in paths  # unscheduled prim still present


def test_roundtrip_phase_fidelity(tmp_path, geometry_file):
    schedule_file, _ = _export(tmp_path, geometry_file, PHASE_PAYLOAD)
    imported = usd_service.import_schedule(schedule_file)

    assert imported["mode"] == "phase"
    assert [p["id"] for p in imported["phase"]["phases"]] == [p["id"] for p in PHASE_LIST]

    expected = {(a["primPath"], a["appear"], a["disappear"]) for a in PHASE_PAYLOAD["assignments"]}
    actual = {(a["primPath"], a["appear"], a["disappear"]) for a in imported["assignments"]}
    assert actual == expected


def test_export_rejects_unknown_prim_path(tmp_path, geometry_file):
    payload = {
        "mode": "calendar",
        "calendar": {"projectStart": "2026-01-01", "projectEnd": "2026-12-31"},
        "phase": {"phases": []},
        "assignments": [{"primPath": "/Building/DoesNotExist", "appear": "2026-01-01", "disappear": None}],
    }
    with pytest.raises(usd_service.ScheduleValidationError):
        _export(tmp_path, geometry_file, payload)


def test_export_rejects_invalid_date(tmp_path, geometry_file):
    payload = {
        "mode": "calendar",
        "calendar": {"projectStart": "2026-01-01", "projectEnd": "2026-12-31"},
        "phase": {"phases": []},
        "assignments": [{"primPath": "/Building/Foundation", "appear": "not-a-date", "disappear": None}],
    }
    with pytest.raises(usd_service.ScheduleValidationError):
        _export(tmp_path, geometry_file, payload)


def test_export_rejects_unknown_phase_id(tmp_path, geometry_file):
    payload = {
        "mode": "phase",
        "calendar": {"projectStart": "2026-01-01", "projectEnd": "2026-12-31"},
        "phase": {"phases": PHASE_LIST},
        "assignments": [{"primPath": "/Building/Foundation", "appear": "phase-unknown", "disappear": None}],
    }
    with pytest.raises(usd_service.ScheduleValidationError):
        _export(tmp_path, geometry_file, payload)
