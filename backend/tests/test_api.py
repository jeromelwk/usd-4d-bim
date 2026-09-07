from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_sample_export_import_flow():
    resp = client.post("/api/geometry/sample")
    assert resp.status_code == 200
    data = resp.json()
    session_id = data["sessionId"]
    assert data["tree"][0]["path"] == "/Building"

    export_payload = {
        "mode": "calendar",
        "calendar": {"projectStart": "2026-01-01", "projectEnd": "2026-12-31"},
        "phase": {"phases": []},
        "assignments": [
            {"primPath": "/Building/Foundation", "appear": "2026-01-01", "disappear": None},
            {"primPath": "/Building/Roof", "appear": "2026-06-01", "disappear": "2026-11-01"},
        ],
    }
    resp = client.post(f"/api/schedule/export?sessionId={session_id}", json=export_payload)
    assert resp.status_code == 200, resp.text
    export_data = resp.json()
    assert export_data["primsAssigned"] == 2

    resp = client.get(f"/api/schedule/import?sessionId={session_id}")
    assert resp.status_code == 200, resp.text
    imported = resp.json()
    assert imported["mode"] == "calendar"
    assert len(imported["assignments"]) == 2
    prim_paths = {a["primPath"] for a in imported["assignments"]}
    assert prim_paths == {"/Building/Foundation", "/Building/Roof"}


def test_export_rejects_invalid_phase_id():
    resp = client.post("/api/geometry/sample")
    session_id = resp.json()["sessionId"]

    export_payload = {
        "mode": "phase",
        "calendar": {"projectStart": "2026-01-01", "projectEnd": "2026-12-31"},
        "phase": {"phases": [{"id": "phase-1", "name": "Fondations"}]},
        "assignments": [
            {"primPath": "/Building/Foundation", "appear": "phase-unknown", "disappear": None},
        ],
    }
    resp = client.post(f"/api/schedule/export?sessionId={session_id}", json=export_payload)
    assert resp.status_code == 422


def test_get_tree_unknown_session():
    resp = client.get("/api/geometry/tree?sessionId=doesnotexist")
    assert resp.status_code == 404


def test_download_geometry_file():
    resp = client.post("/api/geometry/sample")
    session_id = resp.json()["sessionId"]

    resp = client.get(f"/api/download/geometry?sessionId={session_id}")
    assert resp.status_code == 200
    assert "#usda" in resp.text
