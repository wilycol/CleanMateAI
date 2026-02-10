# CleanMateAI - Sistema de Limpieza Automática

Sistema de limpieza automática para Windows que elimina archivos temporales, cachés de navegador y logs antiguos de forma programada.

## Características

- 🧹 **Limpieza de archivos temporales** del sistema y usuario
- 🌐 **Limpieza de caché** de múltiples navegadores (Chrome, Firefox, Edge, Brave)
- 📋 **Limpieza de logs** antiguos y archivos de caché de Internet
- ⏰ **Programación semanal** configurable (por defecto: Domingos a las 3:00 AM)
- 📊 **Registro detallado** de todas las operaciones realizadas
- 🔒 **Modo simulación** para probar sin eliminar archivos
- 🚫 **Exclusión de carpetas** del sistema críticas

## Requisitos

- Python 3.7 o superior
- Windows 10/11
- Permisos de administrador (recomendado para limpieza completa)

## Instalación

1. Clona o descarga este repositorio:
   ```
   git clone https://github.com/tuusuario/CleanMateAI.git
   cd CleanMateAI
   ```

2. (Opcional) Crea un entorno virtual:
   ```
   python -m venv venv
   venv\Scripts\activate
   ```

3. No se requieren dependencias adicionales (solo Python estándar).

## Uso

### Ejecución básica

```bash
# Ejecutar limpieza inmediatamente
python cleanmate.py

# Modo simulación (muestra qué se eliminaría sin borrar)
python cleanmate.py --dry-run

# Ejecutar una sola limpieza y salir
python cleanmate.py --once

# Iniciar programador semanal (se ejecuta en segundo plano)
python cleanmate.py --schedule

# Ver estado del scheduler
python cleanmate.py --status
```

### Programar en Windows Task Scheduler

Para programar la limpieza automáticamente cada semana:

1. Ejecuta el script de configuración como administrador:
   ```
   setup_task.bat
   ```

2. O manualmente, crea una tarea programada:
   ```
   schtasks /create /tn "CleanMateAI" /tr "python cleanmate.py --schedule" /sc weekly /d SUN /st 03:00
   ```

## Configuración

Edita el archivo `config.py` para personalizar:

```python
# Días de antigüedad para eliminar archivos
"max_age_days": 7,

# Programación semanal (0=Lunes, 6=Domingo)
"schedule_day": 6,  # Domingo
"schedule_hour": 3,  # 3:00 AM

# Modo simulación
"dry_run": False,
```

## Estructura del Proyecto

```
CleanMateAI/
├── cleanmate.py           # Script principal
├── config.py              # Configuración
├── logger.py              # Sistema de registro
├── temp_cleaner.py        # Limpieza de archivos temporales
├── browser_cache_cleaner.py  # Limpieza de caché de navegadores
├── log_cleaner.py         # Limpieza de logs
├── scheduler.py           # Programador semanal
├── setup_task.bat         # Script para Windows Task Scheduler
├── cleanup_log.txt        # Registro de limpiezas
├── logs/                  # Directorio de logs de la app
└── README.md              # Este archivo
```

## Funcionalidades Detalladas

### Archivos Temporales
- Limpia `%TEMP%` y `AppData\Local\Temp`
- Elimina archivos con extensiones: `.tmp`, `.temp`, `.log`, `.old`, `.bak`, etc.
- Considera la antigüedad configurada

### Caché de Navegadores
- **Chrome**: `AppData\Local\Google\Chrome\...\Cache`
- **Firefox**: `AppData\Local\Mozilla\Firefox\Profiles\...\cache2`
- **Edge**: `AppData\Local\Microsoft\Edge\...\Cache`
- **Brave**: `AppData\Local\BraveSoftware\...\Cache`

### Logs
- Directorio de logs de la aplicación
- Caché de Internet Explorer/Edge
- Archivos `.log`, `.txt`, `.old` antiguos

## Registro (Logging)

Todas las limpiezas se registran en `cleanup_log.txt` con:
- Fecha y hora de la operación
- Tipo de archivo eliminado
- Ruta completa
- Tamaño del archivo
- Espacio total liberado

## Seguridad

- ✅ Excluye carpetas del sistema críticas
- ✅ Modo simulación para pruebas
- ✅ Confirmación antes de eliminar
- ✅ Registro de todas las operaciones
- ⚠️ Requiere permisos de administrador para limpiar directorios del sistema

## Licencia

MIT License - Libre para usar y modificar.

## Contribuciones

¡Las contribuciones son bienvenidas! Por favor, abre un issue o pull request.
