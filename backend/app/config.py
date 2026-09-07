from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent
SESSIONS_DIR = BACKEND_DIR / "data" / "sessions"
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

VIEWER_DIST_DIR = PROJECT_DIR / "viewer" / "dist"
FRONTEND_DIST_DIR = PROJECT_DIR / "frontend" / "dist"

GEOMETRY_FILENAME = "geometry.usda"
SCHEDULE_FILENAME = "schedule.usda"


def session_dir(session_id: str) -> Path:
    d = SESSIONS_DIR / session_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def geometry_path(session_id: str) -> Path:
    return session_dir(session_id) / GEOMETRY_FILENAME


def schedule_path(session_id: str) -> Path:
    return session_dir(session_id) / SCHEDULE_FILENAME
