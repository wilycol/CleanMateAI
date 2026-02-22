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
    print("===================================")
    print("STATE_SERVICE UPDATE_LAST_ANALYSIS CALLED")
    print("STATE BEFORE UPDATE:")
    print(state)
    state["last_analysis"] = {
        "timestamp": timestamp,
        "summary": summary
    }
    print("STATE AFTER UPDATE (BEFORE SAVE):")
    print(state)
    save_state(state)
    persisted = load_state()
    print("STATE AFTER PERSIST (ANALYSIS):")
    print("LAST_ANALYSIS:", persisted.get("last_analysis"))
    print("LAST_OPTIMIZATION:", persisted.get("last_optimization"))
    print("CLINICAL_MODE_CALCULATED:", get_clinical_mode())
    print("===================================")


def update_last_optimization(timestamp, summary):
    state = load_state()
    print("===================================")
    print("STATE_SERVICE UPDATE_LAST_OPTIMIZATION CALLED")
    print("STATE BEFORE UPDATE:")
    print(state)
    state["last_optimization"] = {
        "timestamp": timestamp,
        "summary": summary
    }
    print("STATE AFTER UPDATE (BEFORE SAVE):")
    print(state)
    save_state(state)
    persisted = load_state()
    print("STATE AFTER PERSIST (OPTIMIZATION):")
    print("LAST_ANALYSIS:", persisted.get("last_analysis"))
    print("LAST_OPTIMIZATION:", persisted.get("last_optimization"))
    print("CLINICAL_MODE_CALCULATED:", get_clinical_mode())
    print("===================================")


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
    print("=== STATE DEBUG (GET_CLINICAL_MODE INPUT) ===")
    print("LAST_ANALYSIS:", last_analysis)
    print("LAST_OPTIMIZATION:", last_optimization)
    if not last_analysis:
        clinical_mode = "needs_analysis"
        print("CLINICAL_MODE_CALCULATED:", clinical_mode)
        print("===========================================")
        return clinical_mode
    if last_analysis and not last_optimization:
        clinical_mode = "needs_optimization"
        print("CLINICAL_MODE_CALCULATED:", clinical_mode)
        print("===========================================")
        return clinical_mode
    ts_opt = _parse_timestamp((last_optimization or {}).get("timestamp"))
    if ts_opt is None:
        clinical_mode = "maintenance_due"
        print("CLINICAL_MODE_CALCULATED:", clinical_mode)
        print("===========================================")
        return clinical_mode
    now = datetime.now(timezone.utc)
    hours = (now - ts_opt).total_seconds() / 3600.0
    threshold_hours = float(os.getenv("CLINICAL_OPTIMIZATION_THRESHOLD_HOURS", "72"))
    if hours <= threshold_hours:
        clinical_mode = "stable"
        print("CLINICAL_MODE_CALCULATED:", clinical_mode)
        print("===========================================")
        return clinical_mode
    clinical_mode = "maintenance_due"
    print("CLINICAL_MODE_CALCULATED:", clinical_mode)
    print("===========================================")
    return clinical_mode
