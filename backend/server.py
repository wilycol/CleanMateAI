from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
import json
import time
from datetime import datetime
from dotenv import load_dotenv
import hashlib

try:
    from .services.state_service import load_state, save_state, get_clinical_mode, update_last_analysis, update_last_optimization, append_history
except ImportError:
    from services.state_service import load_state, save_state, get_clinical_mode, update_last_analysis, update_last_optimization, append_history

try:
    from .ai.agent_prompt import get_system_prompt
    from .ai.flow_controller import create_session, get_session, touch_session
except ImportError:
    from ai.agent_prompt import get_system_prompt
    from ai.flow_controller import create_session, get_session, touch_session

load_dotenv()

app = Flask(__name__)
CORS(app)
load_state()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
_last_groq_body = None


def _call_groq(messages, max_tokens=400, temperature=0.3, timeout=30):
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY no configurada")
    app.logger.info(f"Groq request endpoint={GROQ_URL} model={GROQ_MODEL}")
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    started_at = time.time()
    try:
        resp = requests.post(GROQ_URL, json=payload, headers=headers, timeout=timeout)
    except requests.exceptions.Timeout:
        response_time_ms = int((time.time() - started_at) * 1000)
        app.logger.error(f"Groq request timeout timeMs={response_time_ms}")
        raise RuntimeError("Groq timeout")
    response_time_ms = int((time.time() - started_at) * 1000)
    body_text = resp.text or ""
    body_len = len(body_text)
    global _last_groq_body
    _last_groq_body = body_text
    app.logger.info(f"Groq response status={resp.status_code} timeMs={response_time_ms} bodyLen={body_len}")
    app.logger.info(f"Groq raw body={body_text}")
    if resp.status_code == 200:
        data = resp.json()
        return data
    if resp.status_code == 429:
        app.logger.warning(f"Groq 429 body={resp.text}")
        raise RuntimeError("Groq rate limit (429)")
    if resp.status_code == 401:
        raise RuntimeError("Groq unauthorized (401)")
    if 500 <= resp.status_code < 600:
        raise RuntimeError(f"Groq server error ({resp.status_code})")
    raise RuntimeError(resp.text)

@app.route('/api/analyze', methods=['POST'])
def analyze_system():
    data = request.json
    
    # Validar estructura básica de entrada
    if not data or 'system_info' not in data:
        return jsonify({"error": "Datos inválidos"}), 400

    try:
        system_info = data.get('system_info', {}) or {}
        cleanup_info = data.get('cleanup_info', {}) or {}

        cpu = system_info.get('cpu')
        ram = system_info.get('ram_percent')
        disk = system_info.get('disk_percent')

        status_parts = []
        if cpu is not None:
            status_parts.append(f"CPU {cpu}%")
        if ram is not None:
            status_parts.append(f"RAM {ram}%")
        if disk is not None:
            status_parts.append(f"Disco {disk}%")
        status_text = ", ".join(status_parts) if status_parts else "sin métricas claras"

        freed_mb = cleanup_info.get('freed_mb')
        files_deleted = cleanup_info.get('files_deleted')
        cleanup_summary = ""
        if freed_mb is not None or files_deleted is not None:
            cleanup_summary = f" Limpieza reciente: liberados {freed_mb or 0} MB en {files_deleted or 0} elementos."

        message_text = f"Estado actual: {status_text}.{cleanup_summary} Se recomienda revisar procesos en segundo plano y considerar una optimización si percibes lentitud."

        response_payload = {
            "choices": [
                {
                    "message": {
                        "content": message_text
                    }
                }
            ]
        }

        return jsonify(response_payload), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/report', methods=['POST'])
def receive_report():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Log del reporte recibido (Simulación de guardado en DB)
        print(f"Reporte recibido: {data.get('type', 'unknown')} - {len(str(data))} bytes")
        
        # Aquí se podría guardar en base de datos
        # db.save_report(data)
        
        return jsonify({"status": "success", "message": "Report received successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/system/executed', methods=['POST'])
def system_executed():
    data = request.json or {}
    print("===========================================")
    print("SYSTEM EXECUTED ENDPOINT HIT")
    print("PAYLOAD:", data)
    event_type = data.get("type")
    report = data.get("report")
    print("TYPE:", event_type)
    print("REPORT:", report)
    state_before = load_state()
    print("STATE BEFORE UPDATE:")
    print("LAST_ANALYSIS:", state_before.get("last_analysis"))
    print("LAST_OPTIMIZATION:", state_before.get("last_optimization"))
    print("CLINICAL_MODE_BEFORE:", get_clinical_mode())
    print("===========================================")
    if event_type not in ["analyze", "optimize"] or report is None:
        return jsonify({"error": "Invalid payload"}), 400
    timestamp = datetime.utcnow().isoformat() + "Z"
    event = {
        "type": event_type,
        "timestamp": timestamp,
        "summary": report
    }
    if event_type == "analyze":
        update_last_analysis(timestamp, report)
    elif event_type == "optimize":
        update_last_optimization(timestamp, report)
    append_history(event)
    state_after = load_state()
    print("STATE AFTER UPDATE (POST EXECUTION):")
    print("LAST_ANALYSIS:", state_after.get("last_analysis"))
    print("LAST_OPTIMIZATION:", state_after.get("last_optimization"))
    print("CLINICAL_MODE_AFTER:", get_clinical_mode())
    print("===========================================")
    return jsonify({"status": "ok"}), 201


def build_compact_clinical_context(state, messages):
    clinical_mode = state.get("clinical_mode") or state.get("mode") or get_clinical_mode()
    confidence = state.get("confidence") or "unknown"
    compact_summary = state.get("compact_summary") or ""
    active_factors = state.get("active_factors") or []
    if not isinstance(active_factors, list):
        active_factors = [str(active_factors)]
    active_factors = active_factors[:5]
    recent_messages = (messages or [])[-6:]
    return {
        "clinical_mode": clinical_mode,
        "confidence": confidence,
        "summary": compact_summary,
        "active_factors": active_factors,
        "recent_messages": recent_messages
    }

def compute_summary_hash(summary: str) -> str:
    return hashlib.sha256(summary.encode()).hexdigest()

def generate_compact_summary(state: dict) -> str:
    clinical_mode = state.get("clinical_mode") or get_clinical_mode()
    confidence = state.get("confidence") or "unknown"
    last_metrics = state.get("last_metrics") or {}
    cpu = last_metrics.get("cpu")
    ram = last_metrics.get("ram")
    disk = last_metrics.get("disk")
    freedMB = None
    filesDeleted = None
    spaceRecoverableMB = None
    fileCount = None
    risk_level = None

    base = None
    if state.get("last_optimization"):
        base = state.get("last_optimization")
    elif state.get("last_analysis"):
        base = state.get("last_analysis")

    if base and isinstance(base, dict):
        summary_obj = base.get("summary") if isinstance(base.get("summary"), dict) else base
        stats = summary_obj.get("stats") if isinstance(summary_obj.get("stats"), dict) else summary_obj
        freedMB = stats.get("freedMB")
        filesDeleted = stats.get("filesDeleted")
        spaceRecoverableMB = stats.get("spaceRecoverableMB")
        fileCount = stats.get("fileCount")
        risk_level = summary_obj.get("risk_level")
        if risk_level is None and isinstance(base.get("summary"), dict):
            risk_level = base["summary"].get("risk_level")

    lines = []
    lines.append(f"Mode: {clinical_mode}")
    lines.append(f"Confidence: {confidence}")
    if cpu is not None and ram is not None and disk is not None:
        lines.append(f"System Metrics: CPU {cpu}%, RAM {ram}%, Disk {disk}%")
    if spaceRecoverableMB is not None or fileCount is not None:
        lines.append(f"Analysis: {spaceRecoverableMB or 0}MB recoverable, {fileCount or 0} files")
    if freedMB is not None or filesDeleted is not None:
        lines.append(f"Optimization: {freedMB or 0}MB freed, {filesDeleted or 0} files")
    if risk_level:
        lines.append(f"Risk Level: {risk_level}")
    if len(lines) > 6:
        lines = lines[:6]
    summary = " | ".join(lines)
    words = summary.split()
    if len(words) > 180:
        summary = " ".join(words[:180])
    return summary

def should_regenerate_summary(state, new_metrics) -> bool:
    prev_metrics = state.get("last_metrics") or {}
    clinical_mode_now = get_clinical_mode()
    if clinical_mode_now != (state.get("clinical_mode") or clinical_mode_now):
        return True
    if (state.get("confidence") or "unknown") != (state.get("confidence") or "unknown"):
        pass
    if prev_metrics.get("cpu") != new_metrics.get("cpu"):
        return True
    if prev_metrics.get("ram") != new_metrics.get("ram"):
        return True
    if prev_metrics.get("disk") != new_metrics.get("disk"):
        return True
    prev_an_ts = state.get("last_analysis_ts_snapshot")
    prev_op_ts = state.get("last_optimization_ts_snapshot")
    cur_an_ts = (state.get("last_analysis") or {}).get("timestamp")
    cur_op_ts = (state.get("last_optimization") or {}).get("timestamp")
    if prev_an_ts != cur_an_ts:
        return True
    if prev_op_ts != cur_op_ts:
        return True
    return False

def _build_chat_context_and_prompt(user_message, context, session_state):
    system_metrics = context.get("systemMetrics", {})
    state = load_state() or {}
    clinical_mode = get_clinical_mode()
    state["clinical_mode"] = clinical_mode
    if not state.get("confidence"):
        state["confidence"] = "unknown"

    cpu = system_metrics.get("cpuLoad")
    ram = system_metrics.get("ramUsed")
    disk = system_metrics.get("diskUsed")
    disk_free = system_metrics.get("diskFreeGB")
    metrics_snapshot = {
        "cpu": cpu,
        "ram": ram,
        "disk": disk,
        "disk_free": disk_free,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    if should_regenerate_summary(state, metrics_snapshot):
        state["last_metrics"] = metrics_snapshot
        summary_text = generate_compact_summary(state)
        summary_hash = compute_summary_hash(summary_text)
        state["compact_summary"] = summary_text
        state["compact_summary_hash"] = summary_hash
        state["last_analysis_ts_snapshot"] = (state.get("last_analysis") or {}).get("timestamp")
        state["last_optimization_ts_snapshot"] = (state.get("last_optimization") or {}).get("timestamp")
        save_state(state)
    else:
        state["last_metrics"] = metrics_snapshot
        save_state(state)

    messages = context.get("recentMessages") or []
    compact_context = {
        "clinical_mode": state.get("clinical_mode"),
        "confidence": state.get("confidence"),
        "compact_summary": state.get("compact_summary") or generate_compact_summary(state),
        "recent_messages": (messages or [])[-6:]
    }
    full_prompt = json.dumps(compact_context, ensure_ascii=False)

    return full_prompt, clinical_mode


def _run_chat_llm(user_message, context, session_state):
    session_state = touch_session(session_state.get("id"))
    print("CHAT SESSION STATE BEFORE LLM:")
    print(session_state)
    guide_chat_active = context.get("guide_chat_active")
    if guide_chat_active is False:
        safe_payload = {
            "message": "El chat guiado está desactivado actualmente.",
            "nextAction": {
                "type": "none",
                "label": "",
                "autoExecute": False
            },
            "mode": session_state.get("mode"),
            "sessionState": session_state
        }
        return safe_payload, 200
    full_prompt, clinical_mode = _build_chat_context_and_prompt(user_message, context, session_state)
    prompt_len_chars = len(full_prompt)
    try:
        prompt_len_words = len(full_prompt.split())
    except Exception:
        prompt_len_words = 0
    approx_tokens = int(prompt_len_chars / 4) if prompt_len_chars else 0
    app.logger.info(f"CHAT_LLM_PROMPT_METRICS clinical_mode={clinical_mode} promptLenChars={prompt_len_chars} promptLenWords={prompt_len_words} approxTokens={approx_tokens}")
    if approx_tokens > 8000:
        app.logger.warning(f"CHAT_LLM_ABORT due to token estimate {approx_tokens}")
        safe_payload = {
            "message": "La solicitud fue bloqueada por tamaño excesivo del prompt.",
            "nextAction": {
                "type": "none",
                "label": "",
                "autoExecute": False
            },
            "mode": session_state.get("mode"),
            "sessionState": session_state
        }
        return safe_payload, 200
    system_prompt = get_system_prompt(session_state)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": full_prompt}
    ]
    messages = messages[-6:]


    if not GROQ_API_KEY:
        return {"error": "Servidor sin clave de IA configurada (Groq_API_KEY ausente)"}, 500

    try:
        raw = _call_groq(messages, max_tokens=200)
        choice = (raw.get("choices") or [{}])[0]
        msg = (choice.get("message") or {})
        content = msg.get("content") or ""

        try:
            parsed = json.loads(content)
        except Exception:
            parsed = None

        timestamp = datetime.utcnow().isoformat() + "Z"

        if not isinstance(parsed, dict):
            log_entry = {
                "timestamp": timestamp,
                "mode": clinical_mode,
                "input": user_message,
                "llm_output": content,
                "validated_action": "none",
                "executed_action": None
            }
            app.logger.info("AI_CHAT_LOG %s", json.dumps(log_entry, ensure_ascii=False))
            safe_payload = {
                "message": content.strip() or "No se pudo procesar correctamente la respuesta de la IA.",
                "nextAction": {
                    "type": "none",
                    "label": "",
                    "autoExecute": False
                },
                "mode": session_state.get("mode"),
                "sessionState": session_state
            }
            return safe_payload, 200

        message_text = parsed.get("message") or ""
        next_action = parsed.get("nextAction") or {}
        action_type = next_action.get("type") or "none"
        label = next_action.get("label") or ""
        auto_execute = bool(next_action.get("autoExecute", False))

        if action_type not in ["analyze", "optimize", "none"]:
            action_type = "none"

        if clinical_mode == "needs_analysis":
            if action_type != "analyze":
                action_type = "none"
        elif clinical_mode == "needs_optimization":
            if action_type != "optimize":
                action_type = "none"
        elif clinical_mode == "stable":
            action_type = "none"
        elif clinical_mode == "maintenance_due":
            if action_type != "optimize":
                action_type = "none"
        else:
            action_type = "none"

        log_entry = {
            "timestamp": timestamp,
            "mode": clinical_mode,
            "input": user_message,
            "llm_output": content,
            "validated_action": action_type,
            "executed_action": None
        }
        app.logger.info("AI_CHAT_LOG %s", json.dumps(log_entry, ensure_ascii=False))

        payload = {
            "message": message_text.strip() or "Respuesta recibida sin contenido legible.",
            "nextAction": {
                "type": action_type,
                "label": label,
                "autoExecute": auto_execute if action_type != "none" else False
            },
            "mode": session_state.get("mode"),
            "sessionState": session_state
        }
        return payload, 200
    except Exception as e:
        error_type = type(e).__name__
        error_message = str(e)
        cause = "unknown"
        if "Groq timeout" in error_message:
            cause = "timeout"
        elif "Groq rate limit" in error_message:
            cause = "status_429"
        elif "Groq unauthorized" in error_message:
            cause = "unauthorized"
        elif "Groq server error" in error_message:
            cause = "server_error"
        app.logger.error(f"CHAT_LLM_EXCEPTION type={error_type} cause={cause} message={error_message}")
        global _last_groq_body
        if _last_groq_body is not None:
            app.logger.error(f"CHAT_LLM_EXCEPTION GroqRawBody={_last_groq_body}")
        app.logger.error("Error en IA de chat (Groq)", exc_info=True)
        return {"error": "Error al consultar IA de chat", "details": str(e)}, 502


@app.route('/api/chat/start', methods=['POST'])
def chat_start():
    session_state = create_session()
    print("CHAT_START ENDPOINT HIT")
    print("SESSION_ID_CREATED:", session_state.get("id"))
    return jsonify({"sessionId": session_state.get("id"), "sessionState": session_state}), 201


@app.route('/api/chat/message', methods=['POST'])
def chat_message():
    data = request.json or {}
    session_id = data.get("sessionId")
    user_message = data.get("userMessage", "")
    context = data.get("context") or {}

    print("CHAT_MESSAGE ENDPOINT HIT")
    print("SESSION_ID_FROM_REQUEST:", session_id)

    if not user_message:
        return jsonify({"error": "Mensaje vacío"}), 400

    created_new = False
    session_state = None
    if session_id:
        session_state = get_session(session_id)
        if session_state is None:
            print("CHAT_MESSAGE SESSION NOT FOUND, NOT CREATING NEW")
            return jsonify({"error": "Sesión no encontrada"}), 404
    else:
        session_state = create_session()
        created_new = True

    print("SESSION_ID_USED:", session_state.get("id"))
    print("SESSION_WAS_CREATED:", created_new)

    payload, status_code = _run_chat_llm(user_message, context, session_state)
    return jsonify(payload), status_code


@app.route('/api/chat/session/<session_id>', methods=['GET'])
def chat_session(session_id):
    session_state = get_session(session_id)
    if not session_state:
        return jsonify({"error": "Sesión no encontrada"}), 404
    return jsonify({"sessionId": session_state.get("id"), "sessionState": session_state}), 200


@app.route('/api/chat', methods=['POST'])
def chat():
    return jsonify({
        "error": "Endpoint /api/chat deprecado. Usa /api/chat/message con sesión guiada."
    }), 410

@app.route('/api/ai-health', methods=['GET'])
def ai_health():
    return jsonify({
        "status": "ok",
        "gemini_configured": bool(GROQ_API_KEY),
        "gemini_model": GROQ_MODEL,
        "grok_configured": False
    })

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "CleanMate AI Backend is running", "version": "1.0.0"})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
