"""
Módulo de registro (logging) del Sistema de Limpieza Automática
================================================================
"""

import os
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
import threading

from config import CONFIG, LOGGING_CONFIG


class CleanupLogger:
    """Clase para manejar el registro de operaciones de limpieza."""
    
    def __init__(self):
        self.log_file = CONFIG["log_file"]
        self.dry_run = CONFIG["dry_run"]
        self._lock = threading.Lock()
        self._session_start = datetime.now()
        self._cleanup_stats = {
            "files_deleted": 0,
            "folders_deleted": 0,
            "space_freed_bytes": 0,
            "deleted_items": []
        }
    
    def set_dry_run(self, value: bool) -> None:
        """Actualiza el estado del modo simulación."""
        with self._lock:
            self.dry_run = value
    
    def _format_size(self, bytes_size: int) -> str:
        """Formatea el tamaño en bytes a formato legible."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if bytes_size < 1024.0:
                return f"{bytes_size:.2f} {unit}"
            bytes_size /= 1024.0
        return f"{bytes_size:.2f} PB"
    
    def _get_timestamp(self) -> str:
        """Obtiene la marca de tiempo actual."""
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    def _should_exclude(self, path: Path) -> bool:
        """Verifica si la ruta debe ser excluida."""
        path_str = str(path)
        for pattern in CONFIG["exclude_patterns"]:
            if pattern.lower() in path_str.lower():
                return True
        return False
    
    def log_operation(self, operation_type: str, file_path: Path, 
                      size_bytes: int = 0, success: bool = True, 
                      error: str = None) -> None:
        """Registra una operación de limpieza."""
        with self._lock:
            timestamp = self._get_timestamp()
            mode = "[SIMULACIÓN]" if self.dry_run else ""
            
            if success:
                self._cleanup_stats["files_deleted"] += 1
                self._cleanup_stats["space_freed_bytes"] += size_bytes
                
                if file_path:
                    self._cleanup_stats["deleted_items"].append({
                        "timestamp": timestamp,
                        "type": operation_type,
                        "path": str(file_path),
                        "size": size_bytes
                    })
            
            log_entry = f"{timestamp} | {mode} {operation_type.upper()} | {file_path}"
            if size_bytes > 0:
                log_entry += f" | Tamaño: {self._format_size(size_bytes)}"
            if error:
                log_entry += f" | ERROR: {error}"
            
            print(log_entry)
    
    def log_folder_cleanup(self, folder_path: Path, files_count: int, 
                           total_size: int, success: bool = True, 
                           error: str = None) -> None:
        """Registra la limpieza de una carpeta completa."""
        with self._lock:
            timestamp = self._get_timestamp()
            mode = "[SIMULACIÓN]" if self.dry_run else ""
            
            self._cleanup_stats["folders_deleted"] += 1
            
            log_entry = f"{timestamp} | {mode} FOLDER_CLEANUP | {folder_path}"
            log_entry += f" | Archivos: {files_count}"
            log_entry += f" | Total: {self._format_size(total_size)}"
            if error:
                log_entry += f" | ERROR: {error}"
            
            print(log_entry)
    
    def log_summary(self) -> Dict:
        """Genera y muestra el resumen de la sesión de limpieza."""
        timestamp = self._get_timestamp()
        
        summary = {
            "session_start": self._session_start.isoformat(),
            "session_end": timestamp,
            "mode": "SIMULACIÓN" if self.dry_run else "EJECUCIÓN REAL",
            "files_deleted": self._cleanup_stats["files_deleted"],
            "folders_deleted": self._cleanup_stats["folders_deleted"],
            "space_freed": self._cleanup_stats["space_freed_bytes"],
            "space_freed_formatted": self._format_size(
                self._cleanup_stats["space_freed_bytes"]
            ),
            "deleted_items": self._cleanup_stats["deleted_items"]
        }
        
        print("\n" + "="*60)
        print("RESUMEN DE LIMPIEZA - CleanMateAI")
        print("="*60)
        print(f"Modo: {summary['mode']}")
        print(f"Inicio: {summary['session_start']}")
        print(f"Fin: {summary['session_end']}")
        print(f"Archivos eliminados: {summary['files_deleted']}")
        print(f"Carpetas procesadas: {summary['folders_deleted']}")
        print(f"Espacio liberado: {summary['space_freed_formatted']}")
        print("="*60 + "\n")
        
        return summary
    
    def save_session_log(self, summary: Dict) -> None:
        """Guarda el resumen de la sesión en el archivo de log."""
        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write("="*60 + "\n")
                f.write(f"SESIÓN DE LIMPIEZA - {summary['session_end']}\n")
                f.write("="*60 + "\n")
                f.write(f"Modo: {summary['mode']}\n")
                f.write(f"Archivos eliminados: {summary['files_deleted']}\n")
                f.write(f"Espacio liberado: {summary['space_freed_formatted']}\n")
                
                if summary['deleted_items']:
                    f.write("\nDETALLE DE ARCHIVOS ELIMINADOS:\n")
                    for item in summary['deleted_items']:
                        f.write(f"  - [{item['timestamp']}] {item['type']}: {item['path']}\n")
                
                f.write("\n")
        except Exception as e:
            print(f"Error al guardar log: {e}")
    
    def get_stats(self) -> Dict:
        """Obtiene las estadísticas actuales."""
        with self._lock:
            return {
                "files_deleted": self._cleanup_stats["files_deleted"],
                "folders_deleted": self._cleanup_stats["folders_deleted"],
                "space_freed_bytes": self._cleanup_stats["space_freed_bytes"],
                "space_freed_formatted": self._format_size(
                    self._cleanup_stats["space_freed_bytes"]
                )
            }


# Instancia global del logger
cleanup_logger = CleanupLogger()
