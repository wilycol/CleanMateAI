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

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "CleanMate AI Backend is running", "version": "1.0.0"})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
