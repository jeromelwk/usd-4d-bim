from fastapi import APIRouter, HTTPException, UploadFile, File, Query

from app import config, session, usd_service
from app.models import GeometryResponse, TreeResponse

router = APIRouter(prefix="/geometry", tags=["geometry"])


@router.post("/upload", response_model=GeometryResponse)
async def upload_geometry(file: UploadFile = File(...)) -> GeometryResponse:
    session_id = session.new_session_id()
    session_dir = config.session_dir(session_id)

    suffix = "".join(char for char in (file.filename or "") if char.isalnum() or char in "._-")[-16:] or "upload.usda"
    raw_path = session_dir / f"_upload_{suffix}"
    content = await file.read()
    raw_path.write_bytes(content)

    dest_path = config.geometry_path(session_id)
    try:
        usd_service.open_and_normalize_geometry(raw_path, dest_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        raw_path.unlink(missing_ok=True)

    tree = usd_service.load_geometry_tree(dest_path)
    return GeometryResponse(sessionId=session_id, geometryFile=config.GEOMETRY_FILENAME, tree=tree)


@router.post("/sample", response_model=GeometryResponse)
async def generate_sample() -> GeometryResponse:
    session_id = session.new_session_id()
    dest_path = config.geometry_path(session_id)
    usd_service.generate_sample_building(dest_path)
    tree = usd_service.load_geometry_tree(dest_path)
    return GeometryResponse(sessionId=session_id, geometryFile=config.GEOMETRY_FILENAME, tree=tree)


@router.get("/tree", response_model=TreeResponse)
async def get_tree(sessionId: str = Query(...)) -> TreeResponse:
    geo_path = config.geometry_path(sessionId)
    if not geo_path.exists():
        raise HTTPException(status_code=404, detail="Session ou geometry.usda introuvable")
    try:
        tree = usd_service.load_geometry_tree(geo_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return TreeResponse(sessionId=sessionId, tree=tree)
