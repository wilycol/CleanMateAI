from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
import json
from datetime import datetime
from dotenv import load_dotenv

try:
    from .services.state_service import load_state, get_clinical_mode, update_last_analysis, update_last_optimization, append_history
except ImportError:
    from services.state_service import load_state, get_clinical_mode, update_last_analysis, update_last_optimization, append_history

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
def _call_groq(messages, max_tokens=400, temperature=0.3, timeout=10):
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
    resp = requests.post(GROQ_URL, json=payload, headers=headers, timeout=timeout)
    app.logger.info(f"Groq response status={resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        return data
    if resp.status_code == 429:
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
        system_info = data.get('system_info', {})
        cleanup_info = data.get('cleanup_info', {})
        
        prompt_content = f"""
        Analiza el siguiente estado del sistema y proporciona recomendaciones breves:
        
        CPU: {system_info.get('cpu', 'N/A')}%
        RAM: {system_info.get('ram_percent', 'N/A')}%
        Disco: {system_info.get('disk_percent', 'N/A')}%
        
        Última limpieza: {cleanup_info.get('last_cleanup', 'Nunca')}
        """

        messages = [
            {
                "role": "system",
                "content": "Eres CleanMateAI, un experto en mantenimiento de Windows. Responde en español, breve y conciso."
            },
            {
                "role": "user",
                "content": prompt_content
            }
        ]

        if GROQ_API_KEY:
            try:
                data = _call_groq(messages, max_tokens=180)
                return jsonify(data)
            except Exception as e:
                app.logger.error("Error en IA de análisis (Groq)", exc_info=True)
                return jsonify({"error": "Error al consultar IA de análisis", "details": str(e)}), 502

        return jsonify({"error": "Servidor sin clave de IA configurada (Groq_API_KEY ausente)"}), 500

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
    state_before = load_state()
    print("STATE BEFORE UPDATE:")
    print("LAST_ANALYSIS:", state_before.get("last_analysis"))
    print("LAST_OPTIMIZATION:", state_before.get("last_optimization"))
    print("CLINICAL_MODE_BEFORE:", get_clinical_mode())
    print("===========================================")
    event_type = data.get("type")
    report = data.get("report")
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

def _build_chat_context_and_prompt(user_message, context, session_state):
    system_metrics = context.get("systemMetrics", {})

    cpu = system_metrics.get("cpuLoad", "N/A")
    ram = system_metrics.get("ramUsed", "N/A")
    disk = system_metrics.get("diskUsed", "N/A")
    disk_free = system_metrics.get("diskFreeGB", "N/A")

    state = load_state()
    clinical_mode = get_clinical_mode()

    last_analysis = state.get("last_analysis")
    last_optimization = state.get("last_optimization")
    history = state.get("history") or []
    last_event = history[-1] if history else None

    analysis_summary = "None"
    analysis_timestamp = "None"
    if last_analysis:
        analysis_summary = json.dumps(last_analysis.get("summary") or {}, ensure_ascii=False)
        analysis_timestamp = last_analysis.get("timestamp") or "None"

    optimization_summary = "None"
    optimization_timestamp = "None"
    if last_optimization:
        optimization_summary = json.dumps(last_optimization.get("summary") or {}, ensure_ascii=False)
        optimization_timestamp = last_optimization.get("timestamp") or "None"

    last_event_summary = "None"
    if last_event:
        last_event_summary = json.dumps(last_event, ensure_ascii=False)

    reports = context.get("reports", []) or []
    latest_analysis = next((r for r in reports if r.get("type") == "analysis"), None)
    latest_cleanup = next((r for r in reports if r.get("type") == "cleanup"), None)

    analysis_details = "None"
    if latest_analysis:
        stats = latest_analysis.get("stats", {}) or {}
        ai_msg = (latest_analysis.get("ai", {}) or {}).get("message")
        ai_excerpt = (ai_msg or "")[:280] if ai_msg else "N/A"
        analysis_details = (
            f"spaceRecoverableMB={stats.get('spaceRecoverableMB', 'N/A')}, "
            f"fileCount={stats.get('fileCount', 'N/A')}, "
            f"aiExcerpt={ai_excerpt}"
        )

    cleanup_details = "None"
    if latest_cleanup:
        stats = latest_cleanup.get("stats", {}) or latest_cleanup
        cleanup_details = (
            f"freedMB={stats.get('freedMB', 'N/A')}, "
            f"filesDeleted={stats.get('filesDeleted', 'N/A')}"
        )

    context_text = f"""
SESSION MODE:
{session_state.get("mode")}

CLINICAL MODE:
{clinical_mode}

CURRENT METRICS:
CPU: {cpu}%
RAM: {ram}%
Disk: {disk}%
DiskFreeGB: {disk_free}

LAST ANALYSIS REPORT:
{analysis_summary}

LAST ANALYSIS TIMESTAMP:
{analysis_timestamp}

LAST OPTIMIZATION REPORT:
{optimization_summary}

LAST OPTIMIZATION TIMESTAMP:
{optimization_timestamp}

LAST EVENT:
{last_event_summary}

ANALYSIS HISTORY (latest):
{analysis_details}

OPTIMIZATION HISTORY (latest):
{cleanup_details}
"""

    full_prompt = f"""
{context_text}

USER MESSAGE:
{user_message}
"""

    return full_prompt, clinical_mode


def _run_chat_llm(user_message, context, session_state):
    session_state = touch_session(session_state.get("id"))
    print("CHAT SESSION STATE BEFORE LLM:")
    print(session_state)
    full_prompt, clinical_mode = _build_chat_context_and_prompt(user_message, context, session_state)
    system_prompt = get_system_prompt(session_state)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": full_prompt}
    ]

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
    data = request.json or {}
    user_message = data.get("message", "")
    context = data.get("context", {})
    session_state = create_session()
    payload, status_code = _run_chat_llm(user_message, context, session_state)
    return jsonify(payload), status_code

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
