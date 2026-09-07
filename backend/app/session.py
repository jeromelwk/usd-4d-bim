import uuid


def new_session_id() -> str:
    return uuid.uuid4().hex
