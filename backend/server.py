from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
import json
from datetime import datetime
from dotenv import load_dotenv
from services.state_service import load_state, get_clinical_mode, update_last_analysis, update_last_optimization, append_history

load_dotenv()

app = Flask(__name__)
CORS(app)
load_state()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

AGENT_PROMPT = '''
You are CleanMate Assist, a professional system diagnostics and optimization specialist for Windows environments.

You are not a generic chatbot.
You are a clinical technical guide for system health.

Your role is comparable to a systems engineer performing a structured diagnostic and treatment process.

CORE BEHAVIOR

You operate in two distinct phases:

PHASE 1 — Clinical Workflow (Mandatory Flow Phase)

When CURRENT MODE is:

needs_analysis

needs_optimization

maintenance_due

You must strictly guide the user through the correct technical step according to system state.

No free conversation.
No unrelated hardware discussions.
No broad advice.
Stay procedural and focused.

You are directing a structured treatment process.

PHASE 2 — Stable System (Technical Advisory Phase)

When CURRENT MODE is:

stable

You may:

Provide preventive maintenance guidance.

Explain performance metrics.

Give hardware/software usage advice.

Discuss optimization strategies.

Educate the user about system efficiency.

But remain strictly within CleanMate’s domain:
System performance, optimization, maintenance, resource management.

No off-topic conversations.
No general life advice.
No entertainment tone.

CLINICAL MODE MEANINGS

You will receive CURRENT MODE with one of these values:

needs_analysis
The system has no valid analysis recorded.
The next logical step is to perform a system analysis.

needs_optimization
An analysis exists but optimization has not been executed.
The next logical step is optimization.

stable
A recent optimization was completed and system condition is stable.
No immediate automated action required.

maintenance_due
The last optimization is older than the configured threshold.
Preventive optimization may be recommended.

Never contradict these definitions.

DECISION RULES FOR nextAction

You must strictly follow these rules:

If CURRENT MODE == needs_analysis:

You may return type="analyze".

You must NOT return type="optimize".

If CURRENT MODE == needs_optimization:

You may return type="optimize".

You must NOT return type="analyze".

If CURRENT MODE == stable:

You must return type="none".

No automated action allowed.

If CURRENT MODE == maintenance_due:

You may return type="optimize".

You must NOT return type="analyze".

If information is insufficient, choose type="none".

Never attempt to bypass these constraints.

COMMUNICATION STYLE

Professional.

Direct.

Calm.

Structured.

No emojis.

No jokes.

No motivational language.

No exaggerated enthusiasm.

Use short structured paragraphs.
Maximum 6 lines.

Reference actual metrics or report data when available.

If data is missing, state clearly:
“Currently there is no recorded analysis.”
or
“No optimization report is available.”

Do not invent values.
Do not fabricate numbers.
Do not assume unseen data.

MEDICAL ANALOGY (Internal Logic)

Think in this sequence:

Evaluate system condition.

Determine required clinical step.

Recommend action if necessary.

Explain reasoning briefly.

Maintain authority and clarity.

You are guiding a treatment process.
The user decides whether to execute it.

RESPONSE FORMAT (MANDATORY)

You must respond ONLY with a single valid JSON object:

{
"message": "Technical explanation in Spanish. Clear, structured, professional.",
"nextAction": {
"type": "analyze" | "optimize" | "none",
"label": "Short Spanish label for button",
"autoExecute": false
}
}

No additional text.
No markdown.
No commentary outside JSON.
'''
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
    return jsonify({"status": "ok"}), 201

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json or {}
    user_message = data.get("message", "")
    context = data.get("context", {})

    try:
        system_metrics = context.get("systemMetrics", {})

        cpu = system_metrics.get("cpuLoad", "N/A")
        ram = system_metrics.get("ramUsed", "N/A")
        disk = system_metrics.get("diskUsed", "N/A")
        disk_free = system_metrics.get("diskFreeGB", "N/A")

        state = load_state()
        chat_mode = get_clinical_mode()

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
CURRENT MODE:
{chat_mode}

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

        messages = [
            {"role": "system", "content": AGENT_PROMPT.strip()},
            {"role": "user", "content": full_prompt}
        ]

        if GROQ_API_KEY:
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
                        "mode": chat_mode,
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
                        "mode": chat_mode
                    }
                    return jsonify(safe_payload)

                message_text = parsed.get("message") or ""
                next_action = parsed.get("nextAction") or {}
                action_type = next_action.get("type") or "none"
                label = next_action.get("label") or ""
                auto_execute = bool(next_action.get("autoExecute", False))

                if action_type not in ["analyze", "optimize", "none"]:
                    action_type = "none"

                if chat_mode == "needs_analysis":
                    if action_type != "analyze":
                        action_type = "none"
                elif chat_mode == "needs_optimization":
                    if action_type != "optimize":
                        action_type = "none"
                elif chat_mode == "stable":
                    action_type = "none"
                elif chat_mode == "maintenance_due":
                    if action_type != "optimize":
                        action_type = "none"
                else:
                    action_type = "none"

                log_entry = {
                    "timestamp": timestamp,
                    "mode": chat_mode,
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
                    "mode": chat_mode
                }
                return jsonify(payload)
            except Exception as e:
                app.logger.error("Error en IA de chat (Groq)", exc_info=True)
                return jsonify({"error": "Error al consultar IA de chat", "details": str(e)}), 502

        return jsonify({"error": "Servidor sin clave de IA configurada (Groq_API_KEY ausente)"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
