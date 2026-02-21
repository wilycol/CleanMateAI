import os
import json
from datetime import datetime, timezone

_root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_state_dir = os.path.join(_root_dir, "state")
_state_path = os.path.join(_state_dir, "system_state.json")
_state = None


def _default_state():
    return {
        "last_analysis": None,
        "last_optimization": None,
        "history": []
    }


def load_state():
    global _state
    if not os.path.isdir(_state_dir):
        os.makedirs(_state_dir, exist_ok=True)
    if _state is not None:
        return _state
    if not os.path.isfile(_state_path):
        _state = _default_state()
        save_state(_state)
        return _state
    try:
        with open(_state_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                data = _default_state()
    except Exception:
        data = _default_state()
    _state = {
        "last_analysis": data.get("last_analysis"),
        "last_optimization": data.get("last_optimization"),
        "history": data.get("history") or []
    }
    return _state


def save_state(state):
    global _state
    if not os.path.isdir(_state_dir):
        os.makedirs(_state_dir, exist_ok=True)
    _state = state
    with open(_state_path, "w", encoding="utf-8") as f:
        json.dump(_state, f, ensure_ascii=False)
    return _state


def update_last_analysis(timestamp, summary):
    state = load_state()
    state["last_analysis"] = {
        "timestamp": timestamp,
        "summary": summary
    }
    save_state(state)


def update_last_optimization(timestamp, summary):
    state = load_state()
    state["last_optimization"] = {
        "timestamp": timestamp,
        "summary": summary
    }
    save_state(state)


def append_history(event_object):
    state = load_state()
    history = state.get("history") or []
    history.append(event_object)
    state["history"] = history
    save_state(state)


def _parse_timestamp(value):
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1]
        return datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
    except Exception:
        return None


def get_clinical_mode():
    state = load_state()
    last_analysis = state.get("last_analysis")
    last_optimization = state.get("last_optimization")
    if not last_analysis:
        return "needs_analysis"
    if last_analysis and not last_optimization:
        return "needs_optimization"
    ts_opt = _parse_timestamp((last_optimization or {}).get("timestamp"))
    if ts_opt is None:
        return "maintenance_due"
    now = datetime.now(timezone.utc)
    hours = (now - ts_opt).total_seconds() / 3600.0
    threshold_hours = float(os.getenv("CLINICAL_OPTIMIZATION_THRESHOLD_HOURS", "72"))
    if hours <= threshold_hours:
        return "stable"
    return "maintenance_due"

