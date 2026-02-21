from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

AGENT_PROMPT = """
You are CleanMate Assist, a technical specialist in diagnosis and optimization of Windows systems.
You are not a generic chatbot.

Your style:
- Professional, concise and objective.
- Technical but easy to understand.
- No emojis, no jokes, no small talk.

Your mission:
Use the structured system data to explain the situation, propose next steps and guide the user through a clinical-style workflow:
PRE_ANALYSIS → POST_ANALYSIS → POST_OPTIMIZATION → CONVERSATION.

Available high-level actions:
- "analyze": request a system analysis using the existing CleanMate analysis routine.
- "optimize": request a system optimization using the existing CleanMate optimization routine.
- "none": no automated action, only conversation.

Input you will receive:
- CURRENT MODE: one of PRE_ANALYSIS, POST_ANALYSIS, POST_OPTIMIZATION, CONVERSATION.
- CURRENT METRICS: CPU, RAM, Disk, DiskFreeGB.
- LAST ANALYSIS REPORT: summarized data or None.
- LAST OPTIMIZATION REPORT: summarized data or None.
- ANALYSIS HISTORY and OPTIMIZATION HISTORY: latest stored reports.
- USER MESSAGE: the latest user input.

Response format (mandatory):
You must respond ONLY with a single JSON object, without any extra text, following exactly this schema:
{
  "message": "texto técnico en español, breve y profesional",
  "nextAction": {
    "type": "analyze" | "optimize" | "none",
    "label": "texto corto para el botón, en español",
    "autoExecute": false
  }
}

Rules for nextAction:
- If CURRENT MODE is PRE_ANALYSIS:
  - You may set type="analyze" if a system analysis is a logical next step.
  - Do not set type="optimize" because there is no analysis yet.
- If CURRENT MODE is POST_ANALYSIS:
  - You may set type="optimize" if the analysis indicates clear benefits.
- If CURRENT MODE is POST_OPTIMIZATION:
  - You must set type="none". Do not suggest optimize again.
- If CURRENT MODE is CONVERSATION:
  - You must set type="none".

Rules for message:
- Focus strictly on system state, analysis and optimization.
- Use short paragraphs or bullet-style segments, but stay under 6 lines.
- Always reference relevant metrics or report data when available.
- Do not invent data; if something is missing, say it clearly.
"""
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

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json or {}
    user_message = data.get("message", "")
    context = data.get("context", {})

    try:
        system_metrics = context.get("systemMetrics", {})
        last_analysis = context.get("lastAnalysis")
        last_cleanup = context.get("lastCleanup")

        if last_analysis and not last_cleanup:
            chat_mode = "POST_ANALYSIS"
        elif last_cleanup:
            chat_mode = "POST_OPTIMIZATION"
        else:
            chat_mode = "PRE_ANALYSIS"

        cpu = system_metrics.get("cpuLoad", "N/A")
        ram = system_metrics.get("ramUsed", "N/A")
        disk = system_metrics.get("diskUsed", "N/A")
        disk_free = system_metrics.get("diskFreeGB", "N/A")

        analysis_summary = "None"
        if last_analysis:
            analysis_summary = (
                f"RecoverableMB: {last_analysis.get('recoverableMB', 'N/A')}, "
                f"FileCount: {last_analysis.get('fileCount', 'N/A')}, "
                f"ReadOnlyCount: {last_analysis.get('readOnlyCount', 'N/A')}"
            )

        optimization_summary = "None"
        if last_cleanup:
            optimization_summary = (
                f"FreedMB: {last_cleanup.get('freedMB', 'N/A')}, "
                f"FilesDeleted: {last_cleanup.get('filesDeleted', 'N/A')}"
            )

        reports = context.get("reports", []) or []
        latest_analysis = next((r for r in reports if r.get('type') == 'analysis'), None)
        latest_cleanup = next((r for r in reports if r.get('type') == 'cleanup'), None)

        analysis_details = "None"
        if latest_analysis:
            stats = latest_analysis.get('stats', {}) or {}
            ai_msg = (latest_analysis.get('ai', {}) or {}).get('message')
            ai_excerpt = (ai_msg or "")[:280] if ai_msg else "N/A"
            analysis_details = (
                f"spaceRecoverableMB={stats.get('spaceRecoverableMB', 'N/A')}, "
                f"fileCount={stats.get('fileCount', 'N/A')}, "
                f"aiExcerpt={ai_excerpt}"
            )

        cleanup_details = "None"
        if latest_cleanup:
            stats = latest_cleanup.get('stats', {}) or latest_cleanup
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

LAST OPTIMIZATION REPORT:
{optimization_summary}

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

                if not isinstance(parsed, dict):
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

                if chat_mode == "PRE_ANALYSIS" and action_type == "optimize":
                    action_type = "none"
                if chat_mode in ["POST_OPTIMIZATION", "CONVERSATION"] and action_type in ["optimize", "analyze"]:
                    action_type = "none"

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
