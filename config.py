"""
Configuración del Sistema de Limpieza Automática CleanMateAI
=============================================================
"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Determinar el directorio base del ejecutable o script
# Esto permite que el .exe encuentre .env y status.json donde sea que esté
def get_base_dir():
    """Obtiene el directorio donde está el ejecutable o script."""
    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        return Path(sys.executable).parent
    else:
        # Running as Python script
        return Path(__file__).parent

BASE_DIR = get_base_dir()

# Cargar .env desde el directorio del ejecutable
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(env_path)

# Rutas de directorios a limpiar
CONFIG = {
    # Archivos temporales del sistema
    "temp_directories": [
        Path(os.environ.get("TEMP", "C:\\Windows\\Temp")),
        Path.home() / "AppData\\Local\\Temp",
        "C:\\Users\\Usuario\\AppData\\Local\\Temp",
    ],
    
    # Cachés de navegadores
    "browser_cache": {
        "Chrome": Path.home() / "AppData\\Local\\Google\\Chrome\\User Data\\Default\\Cache",
        "Firefox": Path.home() / "AppData\\Local\\Mozilla\\Firefox\\Profiles",
        "Edge": Path.home() / "AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Cache",
        "Brave": Path.home() / "AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache",
    },
    
    # Directorios de logs
    "log_directories": [
        Path.home() / "AppData\\Local\\Microsoft\\Windows\\INetCache\\IE",
        Path.home() / "AppData\\Local\\Microsoft\\Windows\\INetCache\\Low\\IE",
        BASE_DIR / "logs",
    ],
    
    # Edad máxima de archivos a eliminar (en días)
    "max_age_days": 7,
    
    # Extensiones de archivos a eliminar
    "temp_extensions": [
        ".tmp", ".temp", ".log", ".old", ".bak", 
        ".chk", ".dmp", ".err", ".cache"
    ],
    
    # Excluir estas carpetas
    "exclude_patterns": [
        "System Volume Information",
        "$RECYCLE.BIN",
        "Boot",
        "Windows",
    ],
    
    # Programación (semanal - día de la semana: 0=Lunes, 6=Domingo)
    "schedule_day": 6,  # Domingo
    "schedule_hour": 3,  # 3:00 AM
    "schedule_minute": 0,
    
    # Archivo de registro
    "log_file": BASE_DIR / "cleanup_log.txt",
    
    # Modo simulación (True = solo muestra qué se eliminaría)
    "dry_run": False,
}

# Configuración de logging
LOGGING_CONFIG = {
    "level": "INFO",
    "format": "%Y-%m-%d %H:%M:%S - %(levelname)s - %(message)s",
    "file_max_size_mb": 10,
    "backup_count": 5,
}

# Configuración de API de Grok (xAI)
# Obtén tu API key en: https://console.x.ai/
# Se puede configurar mediante variable de entorno XAI_API_KEY
GROK_CONFIG = {
    "api_key": os.environ.get("XAI_API_KEY", "proxy-mode"), # Valor dummy para modo proxy
    "model": "grok-beta",
    # "api_url": "https://api.x.ai/v1/chat/completions", # URL Directa (Desarrollo)
    "api_url": "https://cleanmateai-backend.onrender.com/api/analyze", # URL Proxy (Producción)
    "use_proxy": True, # Activar modo proxy para seguridad
    "timeout": 30,
    "max_tokens": 500,
}

# Umbrales para alertas
ALERT_THRESHOLDS = {
    "cpu_percent": 80,
    "ram_percent": 85,
    "disk_percent": 90,
}

# Configuración de Suscripción Freemium
# =====================================
# PREMIUM_ACTIVE: Activa el modo premium con llamadas ilimitadas
# (Cuando se implemente el sistema de suscripción, esto se controlará automáticamente)
PREMIUM_ACTIVE = False

# Días de trial gratuito
TRIAL_DAYS = 7

# Intervalo entre llamadas para usuarios gratuitos (en días)
FREE_WEEKLY_INTERVAL_DAYS = 7
