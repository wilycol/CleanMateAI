#!/usr/bin/env python3
"""
Módulo de conexión con la API de Grok (xAI)
=============================================
Envía el estado del sistema y recibe recomendaciones.
"""

import json
import requests
import threading
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from config import GROK_CONFIG
from subscription_manager import can_make_api_call, record_api_call, get_subscription_status


class GrokAPI:
    """Cliente para interactuar con la API de Grok (xAI)."""
    
    def __init__(self):
        self.api_key = GROK_CONFIG["api_key"]
        self.api_url = GROK_CONFIG["api_url"]
        self.model = GROK_CONFIG["model"]
        self.timeout = GROK_CONFIG["timeout"]
        self.max_tokens = GROK_CONFIG["max_tokens"]
        self.last_response = ""
        self.last_error = ""
        self._lock = threading.Lock()
    
    def is_configured(self) -> bool:
        """Verifica si la API está configurada."""
        return bool(self.api_key)
    
    def build_system_prompt(self) -> str:
        """Construye el prompt del sistema."""
        return """Eres un asistente de mantenimiento de sistemas llamado CleanMateAI.
Tu tarea es analizar el estado del sistema y proporcionar recomendaciones breves y prácticas.
Responde en español con formato claro y conciso.
Si el sistema está bien, confirma que todo está OK.
Si hay problemas, sugiere acciones específicas."""
    
    def build_user_prompt(self, system_info: Dict[str, Any], cleanup_info: Dict[str, Any]) -> str:
        """Construye el prompt con la información del sistema."""
        prompt = "Analiza el siguiente estado del sistema y proporciona recomendaciones:\n\n"
        
        # Información de recursos
        prompt += "RECURSOS DEL SISTEMA:\n"
        prompt += f"- CPU: {system_info.get('cpu', 'N/A')}%\n"
        prompt += f"- RAM: {system_info.get('ram_percent', 'N/A')}% ({system_info.get('ram_used', 'N/A')}GB de {system_info.get('ram_total', 'N/A')}GB)\n"
        prompt += f"- Disco: {system_info.get('disk_percent', 'N/A')}% ({system_info.get('disk_used', 'N/A')}GB de {system_info.get('disk_total', 'N/A')}GB)\n"
        
        # Información de limpieza
        prompt += "\nHISTORIAL DE LIMPIEZA:\n"
        if cleanup_info.get('last_cleanup'):
            last_time = cleanup_info['last_cleanup']
            hours_since = cleanup_info.get('hours_since', 'N/A')
            prompt += f"- Última limpieza: {last_time.strftime('%Y-%m-%d %H:%M')}\n"
            prompt += f"- Horas desde entonces: {hours_since}\n"
        else:
            prompt += "- Sin limpiezas registradas\n"
        
        if cleanup_info.get('last_space_freed'):
            prompt += f"- Último espacio liberado: {cleanup_info['last_space_freed']}\n"
        
        prompt += "\nProporciona:\n"
        prompt += "1. Estado general (OK/ADVERTENCIA/CRÍTICO)\n"
        prompt += "2. Recomendaciones breves (máx 3)\n"
        prompt += "3. Sugerencia de si ejecutar limpieza ahora (SÍ/NO)\n"
        
        return prompt
    
    def analyze_system(self, system_info: Dict[str, Any], cleanup_info: Dict[str, Any]) -> str:
        """
        Envía el estado del sistema a Grok y obtiene recomendaciones.
        
        Args:
            system_info: Información de recursos del sistema
            cleanup_info: Información del historial de limpieza
            
        Returns:
            Respuesta de Grok o mensaje de error
        """
        # Verificar suscripción antes de hacer la llamada
        can_call, message = can_make_api_call()
        
        if not can_call:
            self.last_error = "Límite de llamadas alcanzado"
            return f"⚠️ CleanMateAI (Free): {message}\n\nUpgrade a Premium para llamadas ilimitadas."
        
        with self._lock:
            if not self.is_configured():
                self.last_error = "API key no configurada"
                return "⚠️ CleanMateAI: API de Grok no configurada. Establece la variable de entorno XAI_API_KEY."
            
            # Verificar nuevamente bajo el lock
            can_call_inner, message_inner = can_make_api_call()
            if not can_call_inner:
                self.last_error = "Límite de llamadas alcanzado"
                return f"⚠️ CleanMateAI (Free): {message_inner}\n\nUpgrade a Premium para llamadas ilimitadas."
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            messages = [
                {"role": "system", "content": self.build_system_prompt()},
                {"role": "user", "content": self.build_user_prompt(system_info, cleanup_info)}
            ]
            
            payload = {
                "messages": messages,
                "model": self.model,
                "max_tokens": self.max_tokens,
                "temperature": 0.7
            }
            
            try:
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=self.timeout
                )
                response.raise_for_status()
                
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                self.last_response = content
                self.last_error = ""
                
                # Registrar la llamada exitosa
                record_api_call()
                
                return f"🤖 CleanMateAI:\n\n{content}"
                
            except requests.exceptions.Timeout:
                self.last_error = "Timeout al conectar con la API"
                return "⚠️ CleanMateAI: Timeout al conectar con Grok. Intentaré más tarde."
                
            except requests.exceptions.RequestException as e:
                self.last_error = f"Error de conexión: {str(e)}"
                return f"⚠️ CleanMateAI: Error de conexión con Grok: {str(e)}"
                
            except (KeyError, json.JSONDecodeError) as e:
                self.last_error = f"Error al procesar respuesta: {str(e)}"
                return "⚠️ CleanMateAI: Error al procesar respuesta de Grok."
    
    def analyze_async(self, system_info: Dict[str, Any], cleanup_info: Dict[str, Any], 
                      callback=None) -> threading.Thread:
        """
        Analiza el sistema de forma asíncrona.
        
        Args:
            system_info: Información de recursos
            cleanup_info: Información de limpieza
            callback: Función a llamar con el resultado
            
        Returns:
            Hilo de la operación
        """
        def run():
            result = self.analyze_system(system_info, cleanup_info)
            if callback:
                callback(result)
        
        thread = threading.Thread(target=run, daemon=True)
        thread.start()
        return thread
    
    def get_status(self) -> Dict[str, Any]:
        """Obtiene el estado de la conexión."""
        return {
            "configured": self.is_configured(),
            "last_response": self.last_response,
            "last_error": self.last_error,
            "model": self.model
        }


# Instancia global
grok_client = GrokAPI()


def get_grok_recommendation(system_info: Dict[str, Any], cleanup_info: Dict[str, Any]) -> str:
    """
    Función conveniencia para obtener recomendaciones de Grok.
    
    Args:
        system_info: Información de recursos del sistema
        cleanup_info: Información del historial de limpieza
        
    Returns:
        Recomendación de Grok
    """
    return grok_client.analyze_system(system_info, cleanup_info)


def get_grok_status() -> Dict[str, Any]:
    """Obtiene el estado del cliente Grok."""
    return grok_client.get_status()


def main():
    """Prueba de la API de Grok."""
    print("=" * 50)
    print("Prueba de conexión con Grok API")
    print("=" * 50)
    
    status = get_grok_status()
    print(f"Configurada: {'Sí' if status['configured'] else 'No'}")
    print(f"Modelo: {status['model']}")
    
    if not status['configured']:
        print("\n⚠️ API key no configurada.")
        print("Establece la variable de entorno XAI_API_KEY:")
        print("  Windows: setx XAI_API_KEY \"tu-key-aqui\"")
        print("  O añade esta línea al inicio:")
        print("  import os; os.environ['XAI_API_KEY'] = 'tu-key-aqui'")
        return
    
    # Datos de prueba
    test_system = {
        "cpu": 45,
        "ram_percent": 62,
        "ram_used": 8,
        "ram_total": 16,
        "disk_percent": 75,
        "disk_used": 150,
        "disk_total": 200
    }
    
    test_cleanup = {
        "last_cleanup": datetime.now() - timedelta(hours=24),
        "hours_since": 24,
        "last_space_freed": "500 MB"
    }
    
    print("\nEnviando análisis a Grok...")
    result = get_grok_recommendation(test_system, test_cleanup)
    print(f"\nRespuesta:\n{result}")


if __name__ == "__main__":
    main()
