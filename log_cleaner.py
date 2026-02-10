"""
Módulo de Limpieza de Logs Antiguos
====================================
"""

import os
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Optional

from config import CONFIG
from logger import cleanup_logger


class LogCleaner:
    """Clase para limpiar logs antiguos del sistema."""
    
    def __init__(self):
        self.log_dirs = CONFIG["log_directories"]
        self.max_age = CONFIG["max_age_days"]
        self.log_extensions = {".log", ".txt", ".old", ".bak", ".err"}
        self.dry_run = CONFIG["dry_run"]
    
    def _is_old_enough(self, file_path: Path) -> bool:
        """Verifica si el archivo es más antiguo que max_age."""
        try:
            file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
            cutoff_date = datetime.now() - timedelta(days=self.max_age)
            return file_mtime < cutoff_date
        except (OSError, FileNotFoundError):
            return False
    
    def _get_file_size(self, file_path: Path) -> int:
        """Obtiene el tamaño de un archivo en bytes."""
        try:
            return file_path.stat().st_size
        except (OSError, FileNotFoundError):
            return 0
    
    def _should_clean_log(self, file_path: Path) -> bool:
        """Determina si un archivo de log debe ser limpiado."""
        # Verificar extensión
        if file_path.suffix.lower() not in self.log_extensions:
            return False
        
        # Verificar antigüedad
        if not self._is_old_enough(file_path):
            return False
        
        return True
    
    def _safe_delete(self, file_path: Path, log_type: str) -> bool:
        """Elimina un archivo de forma segura."""
        try:
            size = self._get_file_size(file_path)
            
            if self.dry_run:
                cleanup_logger.log_operation(
                    f"LOG_{log_type.upper()}", file_path, size, success=True
                )
                return True
            
            if file_path.is_file():
                file_path.unlink()
            elif file_path.is_dir():
                shutil.rmtree(file_path)
            
            cleanup_logger.log_operation(
                f"LOG_{log_type.upper()}", file_path, size, success=True
            )
            return True
            
        except Exception as e:
            cleanup_logger.log_operation(
                f"LOG_{log_type.upper()}", file_path, 0, success=False, error=str(e)
            )
            return False
    
    def clean_log_directory(self, directory: Path, log_type: str = "GENERAL") -> dict:
        """Limpia todos los logs en un directorio."""
        stats = {
            "directory": str(directory),
            "files_found": 0,
            "files_deleted": 0,
            "folders_deleted": 0,
            "total_size": 0
        }
        
        if not directory.exists() or not directory.is_dir():
            return stats
        
        try:
            for item in directory.rglob("*"):
                if cleanup_logger._should_exclude(item):
                    continue
                
                if item.is_file():
                    stats["files_found"] += 1
                    if self._should_clean_log(item):
                        if self._safe_delete(item, log_type):
                            stats["files_deleted"] += 1
                            stats["total_size"] += self._get_file_size(item)
                
                elif item.is_dir():
                    # Eliminar carpetas de logs vacías o completamente antiguas
                    try:
                        age_threshold = datetime.now() - timedelta(days=self.max_age)
                        dir_mtime = datetime.fromtimestamp(item.stat().st_mtime)
                        
                        if dir_mtime < age_threshold and not any(item.iterdir()):
                            if self._safe_delete(item, f"{log_type}_FOLDER"):
                                stats["folders_deleted"] += 1
                    except PermissionError:
                        continue
        
        except PermissionError as e:
            cleanup_logger.log_operation(
                f"LOG_{log_type.upper()}", directory, 0, 
                success=False, error=str(e)
            )
        except Exception as e:
            cleanup_logger.log_operation(
                f"LOG_{log_type.upper()}", directory, 0, 
                success=False, error=str(e)
            )
        
        return stats
    
    def clean_all_logs(self) -> dict:
        """Limpia todos los directorios de logs configurados."""
        print("\n" + "="*50)
        print("LIMPIEZA DE LOGS ANTIGUOS")
        print("="*50)
        
        total_stats = {
            "directories_processed": 0,
            "files_found": 0,
            "files_deleted": 0,
            "folders_deleted": 0,
            "total_size": 0
        }
        
        for log_dir in self.log_dirs:
            dir_path = Path(log_dir)
            log_type = dir_path.name.upper() if dir_path.name else "GENERAL"
            print(f"\nProcesando: {dir_path}")
            
            if dir_path.exists():
                stats = self.clean_log_directory(dir_path, log_type)
                total_stats["directories_processed"] += 1
                total_stats["files_found"] += stats["files_found"]
                total_stats["files_deleted"] += stats["files_deleted"]
                total_stats["folders_deleted"] += stats["folders_deleted"]
                total_stats["total_size"] += stats["total_size"]
                
                cleanup_logger.log_folder_cleanup(
                    dir_path,
                    stats["files_deleted"],
                    stats["total_size"],
                    success=True
                )
            else:
                print(f"  Directorio no encontrado")
        
        print("\n" + "-"*50)
        print(f" Directorios procesados: {total_stats['directories_processed']}")
        print(f" Archivos encontrados: {total_stats['files_found']}")
        print(f" Archivos eliminados: {total_stats['files_deleted']}")
        print(f" Carpetas eliminadas: {total_stats['folders_deleted']}")
        print("-"*50)
        
        return total_stats
    
    def clean_internet_logs(self) -> dict:
        """Limpia logs específicos de Internet y caché de IE/Edge."""
        print("\n" + "-"*30)
        print("LIMPIEZA DE LOGS DE INTERNET")
        print("-"*30)
        
        total_stats = {
            "files_deleted": 0,
            "total_size": 0
        }
        
        # Rutas típicas de caché de Internet
        internet_cache_paths = [
            Path.home() / "AppData\\Local\\Microsoft\\Windows\\INetCache\\IE",
            Path.home() / "AppData\\Local\\Microsoft\\Windows\\INetCache\\Low\\IE",
        ]
        
        for cache_path in internet_cache_paths:
            if cache_path.exists():
                stats = self.clean_log_directory(cache_path, "INET")
                total_stats["files_deleted"] += stats["files_deleted"]
                total_stats["total_size"] += stats["total_size"]
        
        return total_stats


# Instancia del cleaner de logs
log_cleaner = LogCleaner()
