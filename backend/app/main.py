import mimetypes

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import config
from app.routers import geometry, schedule

# Browsers require the "application/wasm" content-type for fast/streaming
# WASM compilation; Windows' registry-based mimetypes lookup doesn't always
# know it.
mimetypes.add_type("application/wasm", ".wasm")

app = FastAPI(title="USD 4D BIM API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(geometry.router, prefix="/api")
app.include_router(schedule.router, prefix="/api")


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


if config.VIEWER_DIST_DIR.exists():
    app.mount("/viewer", StaticFiles(directory=str(config.VIEWER_DIST_DIR), html=True), name="viewer")

# Serves the built frontend (see frontend/README or the project's start.bat).
# Mounted last and at the root so it never shadows /api or /viewer.
if config.FRONTEND_DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(config.FRONTEND_DIST_DIR), html=True), name="frontend")
