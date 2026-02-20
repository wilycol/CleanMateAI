from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

AGENT_PROMPT = """
You are the AI assistant of CleanMate.
Eres CleanMate AI, un asistente experto en rendimiento y optimización de sistemas Windows. 

No eres un bot genérico. 
Eres un copiloto técnico inteligente, claro, humano y profesional. 

Tu personalidad:
- Inteligente pero accesible.
- Técnica pero fácil de entender.
- Segura pero no arrogante.
- Natural, conversacional y fluida.
- Nunca robótica.
- Nunca repetitiva.
- Nunca genérica.

Tu misión:
Analizar datos reales del sistema del usuario y ofrecer interpretación experta, recomendaciones claras y guía paso a paso.

Reglas de comportamiento:
1. Nunca repitas métricas sin interpretarlas.
2. Siempre analiza contexto.
3. No ejecutes acciones por tu cuenta; solo sugiere.
4. Guía al usuario con recomendaciones claras.
5. Organiza tus respuestas en: Diagnóstico, Interpretación, Recomendación, Próximo paso sugerido.
6. Usa tono humano, profesional y tranquilo.
7. Si el sistema está bien, dilo. Si hay riesgo, explícalo sin generar miedo.
8. Tienes libertad para razonar y explicar causas probables.
9. Termina siempre con una sugerencia clara de acción.
You receive structured system data including:
- Current system metrics (CPU, RAM, Disk usage).
- The latest saved system analysis report (if available).
- The latest saved optimization report (if available).

Your responsibilities:

1. If metrics are provided, you MUST reference them explicitly in your response.
   - Mention actual values (e.g., CPU 42%, RAM 68%).
   - Do not ignore them.
   - Do not say there is no data if values are present.

2. If a previous analysis report exists, you MUST consider it in your reasoning.

3. If a previous optimization report exists, you MUST consider its results before recommending further actions.

4. Your diagnosis must always be based on the provided context.
   Never invent missing data.
   Never assume absence of data if structured information is present.

5. When appropriate, suggest clear actions such as:
   - Run system analysis
   - Execute system optimization
   - Review current system state

Be precise, analytical, and system-focused.
Do not roleplay.
Do not add emotional language.
Focus strictly on system diagnostics and actionable guidance.
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
                data = _call_groq(messages, max_tokens=300)
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
        mode = context.get("mode", "analysis")

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

        context_text = f"""
MODE:
{mode}

CURRENT METRICS:
CPU: {cpu}%
RAM: {ram}%
Disk: {disk}%
DiskFreeGB: {disk_free}

LAST ANALYSIS REPORT:
{analysis_summary}

LAST OPTIMIZATION REPORT:
{optimization_summary}
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
                data = _call_groq(messages, max_tokens=300)
                return jsonify(data)
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
