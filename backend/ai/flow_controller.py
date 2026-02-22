import uuid
from datetime import datetime, timezone

try:
    from ..services.state_service import get_clinical_mode
except ImportError:
    from services.state_service import get_clinical_mode

_sessions = {}


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _build_session_state(session_id, state=None):
    clinical_mode = get_clinical_mode()
    flow_completed = clinical_mode == "stable"
    mode = "free_consultation" if flow_completed else "guided_flow"
    base = state or {}
    now = _now_iso()
    base["id"] = session_id
    base["mode"] = mode
    base["clinicalMode"] = clinical_mode
    base["flowCompleted"] = flow_completed
    base["updatedAt"] = now
    if "createdAt" not in base:
        base["createdAt"] = now
    if "step" not in base:
        base["step"] = 1
    return base


def create_session():
    session_id = str(uuid.uuid4())
    state = _build_session_state(session_id, {})
    _sessions[session_id] = state
    return state


def get_session(session_id):
    state = _sessions.get(session_id)
    if not state:
        return None
    state = _build_session_state(session_id, state)
    _sessions[session_id] = state
    return state


def touch_session(session_id):
    state = _sessions.get(session_id)
    if not state:
        return create_session()
    state = _build_session_state(session_id, state)
    _sessions[session_id] = state
    return state

