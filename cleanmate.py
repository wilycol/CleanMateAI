#!/usr/bin/env python3
"""
CleanMateAI - Sistema de Limpieza Automática
=============================================
Sistema para limpiar archivos temporales, cachés de navegador y logs antiguos.

Uso:
    python cleanmate.py [--dry-run] [--schedule] [--once]
    
Opciones:
    --dry-run    : Simula la limpieza sin eliminar archivos
    --schedule   : Inicia el programador semanal
    --once       : Ejecuta una limpieza inmediata
    --status     : Muestra el estado del scheduler
    --help       : Muestra esta ayuda
"""

import sys
import os
import argparse
from pathlib import Path

# Agregar el directorio actual al path
sys.path.insert(0, str(Path(__file__).parent))

from config import CONFIG
from logger import cleanup_logger
from temp_cleaner import temp_cleaner
from browser_cache_cleaner import browser_cache_cleaner
from log_cleaner import log_cleaner
from scheduler import CleanupScheduler, DAYS_OF_WEEK


def run_full_cleanup() -> dict:
    """
    Ejecuta una limpieza completa del sistema.
    
    Returns:
        dict: Resumen de la limpieza
    """
    print("\n" + "#"*60)
    print("#  CLEANMATEAI - SISTEMA DE LIMPIEZA AUTOMÁTICA")
    print("#"*60)
    
    if CONFIG["dry_run"]:
        print("\n[ MODO SIMULACIÓN - NO SE ELIMINARÁ NINGÚN ARCHIVO ]\n")
    
    # Iniciar contador de tiempo
    from datetime import datetime
    start_time = datetime.now()
    
    total_stats = {
        "temp_cleaner": {},
        "browser_cache": {},
        "log_cleaner": {},
        "start_time": start_time.isoformat(),
    }
    
    try:
        # 1. Limpiar archivos temporales
        total_stats["temp_cleaner"] = temp_cleaner.clean_all()
        
        # 2. Limpiar caché de navegadores
        total_stats["browser_cache"] = browser_cache_cleaner.clean_all_browsers()
        
        # 3. Limpiar logs antiguos
        total_stats["log_cleaner"] = log_cleaner.clean_all_logs()
        
    except KeyboardInterrupt:
        print("\n\nLimpieza cancelada por el usuario")
        return total_stats
    
    # Calcular tiempo total
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    # Generar resumen final
    stats = cleanup_logger.get_stats()
    summary = cleanup_logger.log_summary()
    summary["duration_seconds"] = duration
    
    # Guardar log de la sesión
    cleanup_logger.save_session_log(summary)
    
    print(f"\nLimpieza completada en {duration:.2f} segundos")
    print(f"Archivos eliminados: {stats['files_deleted']}")
    print(f"Espacio liberado: {stats['space_freed_formatted']}")
    
    return total_stats


def main():
    """Función principal."""
    parser = argparse.ArgumentParser(
        description="CleanMateAI - Sistema de Limpieza Automática",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  python cleanmate.py              # Ejecutar limpieza inmediata
  python cleanmate.py --once       # Ejecutar limpieza una vez
  python cleanmate.py --schedule   # Iniciar programador semanal
  python cleanmate.py --dry-run    # Simular limpieza
  python cleanmate.py --status     # Ver estado del scheduler
        """
    )
    
    parser.add_argument(
        "--dry-run", 
        action="store_true",
        help="Simula la limpieza sin eliminar archivos"
    )
    parser.add_argument(
        "--schedule",
        action="store_true",
        help="Inicia el programador semanal"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Ejecuta una limpieza inmediata"
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Muestra el estado del scheduler"
    )
    
    args = parser.parse_args()
    
    # Aplicar modo dry-run si se especifica
    if args.dry_run:
        CONFIG["dry_run"] = True
        cleanup_logger.set_dry_run(True)
        print("Modo SIMULACIÓN activado")
    
    # Mostrar estado del scheduler
    if args.status:
        scheduler = CleanupScheduler(run_full_cleanup)
        status = scheduler.get_status()
        print("\nEstado del Scheduler:")
        print(f"  Ejecutándose: {'Sí' if status['running'] else 'No'}")
        print(f"  Próxima ejecución: {status['next_run']}")
        print(f"  Programado: {DAYS_OF_WEEK[status['schedule']['day']]} "
              f"a las {status['schedule']['hour']:02d}:"
              f"{status['schedule']['minute']:02d}")
        return
    
    # Iniciar scheduler semanal
    if args.schedule:
        print("\n" + "="*50)
        print("INICIANDO CLEANMATEAI - MODO PROGRAMADO")
        print("="*50)
        print(f"\nProgramación: {DAYS_OF_WEEK[CONFIG['schedule_day']]} "
              f"a las {CONFIG['schedule_hour']:02d}:"
              f"{CONFIG['schedule_minute']:02d}")
        print("Presiona Ctrl+C para detener\n")
        
        scheduler = CleanupScheduler(run_full_cleanup)
        scheduler.start(run_immediately=False)
        
        try:
            # Mantener el hilo principal activo
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            scheduler.stop()
            print("\nPrograma detenido")
    
    # Ejecutar limpieza inmediata (por defecto o con --once)
    elif args.once or not args.schedule:
        run_full_cleanup()


if __name__ == "__main__":
    try:
        import time
        main()
    except KeyboardInterrupt:
        print("\nPrograma detenido por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"\nError inesperado: {e}")
        sys.exit(1)
