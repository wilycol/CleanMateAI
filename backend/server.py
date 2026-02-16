from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # Permitir peticiones desde cualquier origen (ajustar en producción)

# Configuración de Grok
GROK_API_KEY = os.getenv("GROK_API_KEY")
GROK_API_URL = "https://api.x.ai/v1/chat/completions"

AGENT_PROMPT = """
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
"""

@app.route('/api/analyze', methods=['POST'])
def analyze_system():
    if not GROK_API_KEY:
        return jsonify({"error": "Servidor no configurado correctamente (Falta API Key)"}), 500

    data = request.json
    
    # Validar estructura básica de entrada
    if not data or 'system_info' not in data:
        return jsonify({"error": "Datos inválidos"}), 400

    # Construir el payload para Grok
    # Aquí actuamos como proxy: recibimos los datos del cliente,
    # construimos el prompt seguro y consultamos a Grok.
    
    try:
        # Reconstruir el prompt aquí para no confiar en el cliente
        system_info = data.get('system_info', {})
        cleanup_info = data.get('cleanup_info', {})
        
        prompt_content = f"""
        Analiza el siguiente estado del sistema y proporciona recomendaciones breves:
        
        CPU: {system_info.get('cpu', 'N/A')}%
        RAM: {system_info.get('ram_percent', 'N/A')}%
        Disco: {system_info.get('disk_percent', 'N/A')}%
        
        Última limpieza: {cleanup_info.get('last_cleanup', 'Nunca')}
        """

        payload = {
            "model": "grok-beta",
            "messages": [
                {
                    "role": "system",
                    "content": "Eres CleanMateAI, un experto en mantenimiento de Windows. Responde en español, breve y conciso."
                },
                {
                    "role": "user",
                    "content": prompt_content
                }
            ],
            "max_tokens": 300
        }

        headers = {
            "Authorization": f"Bearer {GROK_API_KEY}",
            "Content-Type": "application/json"
        }

        response = requests.post(GROK_API_URL, json=payload, headers=headers)
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({"error": "Error al consultar IA", "details": response.text}), response.status_code

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
    if not GROK_API_KEY:
        return jsonify({"error": "Servidor no configurado correctamente (Falta API Key)"}), 500

    data = request.json or {}
    user_message = data.get("message", "")
    context = data.get("context", {})

    try:
        system_metrics = context.get("systemMetrics", {})
        last_analysis = context.get("lastAnalysis")
        last_cleanup = context.get("lastCleanup")
        mode = context.get("mode", "analysis")

        context_text = f"""
Modo actual: {mode}

Métricas del sistema:
- CPU: {system_metrics.get('cpuLoad', 'N/A')}%
- RAM: {system_metrics.get('ramUsed', 'N/A')}%
- Disco usado: {system_metrics.get('diskUsed', 'N/A')}%
- Espacio libre en disco (GB): {system_metrics.get('diskFreeGB', 'N/A')}
"""
        if last_analysis:
            context_text += f"""
Último análisis:
- Espacio recuperable estimado (MB): {last_analysis.get('recoverableMB', 'N/A')}
- Archivos detectados: {last_analysis.get('fileCount', 'N/A')}
- Archivos solo lectura: {last_analysis.get('readOnlyCount', 'N/A')}
"""
        if last_cleanup:
            context_text += f"""
Última limpieza:
- Espacio liberado (MB): {last_cleanup.get('freedMB', 'N/A')}
- Archivos eliminados: {last_cleanup.get('filesDeleted', 'N/A')}
"""

        full_prompt = f"""
Mensaje del usuario:
{user_message}

Contexto técnico actual:
{context_text}

Responde siguiendo estrictamente el rol y reglas del agente CleanMate AI.
"""

        payload = {
            "model": "grok-beta",
            "messages": [
                {"role": "system", "content": AGENT_PROMPT.strip()},
                {"role": "user", "content": full_prompt}
            ],
            "max_tokens": 500
        }

        headers = {
            "Authorization": f"Bearer {GROK_API_KEY}",
            "Content-Type": "application/json"
        }

        response = requests.post(GROK_API_URL, json=payload, headers=headers)

        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({"error": "Error al consultar IA", "details": response.text}), response.status_code

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "CleanMate AI Backend is running", "version": "1.0.0"})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
