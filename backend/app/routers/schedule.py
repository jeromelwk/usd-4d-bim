from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse

from app import config, session, usd_service
from app.models import ExportRequest, ExportResponse, ScheduleStateResponse, TimeCodeRange

router = APIRouter(tags=["schedule"])


@router.post("/schedule/export", response_model=ExportResponse)
async def export_schedule(payload: ExportRequest, sessionId: str = Query(...)) -> ExportResponse:
    geo_path = config.geometry_path(sessionId)
    schedule_file = config.schedule_path(sessionId)

    assignments = [a.model_dump() for a in payload.assignments]
    try:
        result = usd_service.export_schedule(
            geo_path,
            schedule_file,
            payload.mode,
            payload.calendar.model_dump(),
            payload.phase.model_dump(),
            assignments,
        )
    except usd_service.ScheduleValidationError as exc:
        raise HTTPException(status_code=422, detail={"detail": "Validation du schedule echouee", "errors": exc.errors})
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return ExportResponse(
        sessionId=sessionId,
        scheduleFile=config.SCHEDULE_FILENAME,
        primsAssigned=result["primsAssigned"],
        timeCodeRange=TimeCodeRange(**result["timeCodeRange"]),
    )


@router.get("/schedule/import", response_model=ScheduleStateResponse)
async def import_schedule(sessionId: str = Query(...)) -> ScheduleStateResponse:
    schedule_file = config.schedule_path(sessionId)
    if not schedule_file.exists():
        raise HTTPException(status_code=404, detail="Aucun schedule.usda pour cette session")
    try:
        state = usd_service.import_schedule(schedule_file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ScheduleStateResponse(sessionId=sessionId, **state)


@router.post("/schedule/upload", response_model=ScheduleStateResponse)
async def upload_schedule(geometry: UploadFile = File(...), schedule: UploadFile = File(...)) -> ScheduleStateResponse:
    session_id = session.new_session_id()
    geo_path = config.geometry_path(session_id)
    schedule_file = config.schedule_path(session_id)

    geo_path.write_bytes(await geometry.read())
    schedule_file.write_bytes(await schedule.read())

    try:
        state = usd_service.import_schedule(schedule_file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return ScheduleStateResponse(sessionId=session_id, **state)


@router.get("/download/{file_kind}")
async def download_file(file_kind: str, sessionId: str = Query(...)) -> FileResponse:
    if file_kind == "geometry":
        path = config.geometry_path(sessionId)
        filename = config.GEOMETRY_FILENAME
    elif file_kind == "schedule":
        path = config.schedule_path(sessionId)
        filename = config.SCHEDULE_FILENAME
    else:
        raise HTTPException(status_code=400, detail="file_kind doit etre 'geometry' ou 'schedule'")

    if not path.exists():
        raise HTTPException(status_code=404, detail=f"{filename} introuvable pour cette session")

    return FileResponse(path=str(path), filename=filename, media_type="text/plain")
