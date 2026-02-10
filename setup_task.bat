@echo off
REM CleanMateAI - Script de Configuración para Windows Task Scheduler
REM ================================================================

echo ============================================
echo CleanMateAI - Configuración de Tarea Programada
echo ============================================
echo.

REM Obtener la ruta del directorio actual
set "SCRIPT_DIR=%~dp0"
set "PYTHON_SCRIPT=%SCRIPT_DIR%cleanmate.py"

echo Directorio del script: %SCRIPT_DIR%
echo Script principal: %PYTHON_SCRIPT%
echo.

REM Verificar si Python está disponible
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python no está instalado o no está en el PATH.
    echo Por favor, instala Python desde https://python.org
    pause
    exit /b 1
)

echo Python encontrado correctamente.
echo.

REM Verificar si el script existe
if not exist "%PYTHON_SCRIPT%" (
    echo ERROR: No se encontró cleanmate.py en %SCRIPT_DIR%
    pause
    exit /b 1
)

echo Script encontrado correctamente.
echo.

REM Crear la tarea programada
echo Creando tarea programada en Windows Task Scheduler...
echo.
echo La tarea se ejecutará cada Domingo a las 3:00 AM
echo.

schtasks /create ^
    /tn "CleanMateAI - Limpieza Semanal" ^
    /tr "pythonw.exe \"%PYTHON_SCRIPT%\" --schedule" ^
    /sc weekly ^
    /d SUN ^
    /st 03:00 ^
    /ru "SYSTEM" ^
    /f

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo Tarea programada creada exitosamente.
    echo ============================================
    echo.
    echo Detalles de la tarea:
    echo   - Nombre: CleanMateAI - Limpieza Semanal
    echo   - Frecuencia: Semanal (Domingos)
    echo   - Hora: 3:00 AM
    echo   - Usuario: SYSTEM
    echo.
    echo Para ver o modificar la tarea:
    echo   - Panel de Control > Herramientas Administrativas > Programador de Tareas
    echo   - Busca "CleanMateAI" en la lista de tareas
    echo.
    echo Para ejecutar la limpieza manualmente:
    echo   pythonw.exe "%PYTHON_SCRIPT%" --once
    echo.
    echo Para modo simulación (prueba sin eliminar):
    echo   pythonw.exe "%PYTHON_SCRIPT%" --dry-run --once
    echo.
) else (
    echo ERROR al crear la tarea programada.
    echo Códgo de error: %errorlevel%
)

pause
