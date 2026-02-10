"""
Módulo de Limpieza de Archivos Temporales
==========================================
"""

import os
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Optional

from config import CONFIG
from logger import cleanup_logger


class TempCleaner:
    """Clase para limpiar archivos temporales del sistema."""
    
    def __init__(self):
        self.temp_dirs = CONFIG["temp_directories"]
        self.max_age = CONFIG["max_age_days"]
        self.extensions = CONFIG["temp_extensions"]
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
    
    def _should_clean_file(self, file_path: Path) -> bool:
        """Determina si un archivo debe ser limpiado."""
        # Verificar extensión
        if self.extensions and file_path.suffix.lower() not in self.extensions:
            return False
        
        # Verificar antigüedad
        if not self._is_old_enough(file_path):
            return False
        
        return True
    
    def _safe_delete(self, file_path: Path, operation_type: str) -> bool:
        """Elimina un archivo de forma segura."""
        try:
            size = self._get_file_size(file_path)
            
            if self.dry_run:
                cleanup_logger.log_operation(
                    operation_type, file_path, size, success=True
                )
                return True
            
            if file_path.is_file():
                file_path.unlink()
            elif file_path.is_dir():
                shutil.rmtree(file_path)
            
            cleanup_logger.log_operation(
                operation_type, file_path, size, success=True
            )
            return True
            
        except Exception as e:
            cleanup_logger.log_operation(
                operation_type, file_path, 0, success=False, error=str(e)
            )
            return False
    
    def clean_directory(self, directory: Path, recursive: bool = True) -> dict:
        """Limpia todos los archivos temporales en un directorio."""
        stats = {
            "files_found": 0,
            "files_deleted": 0,
            "folders_deleted": 0,
            "total_size": 0
        }
        
        if not directory.exists() or not directory.is_dir():
            return stats
        
        try:
            if recursive:
                # Iterar sobre todos los elementos
                for item in directory.rglob("*"):
                    if cleanup_logger._should_exclude(item):
                        continue
                    
                    if item.is_file():
                        stats["files_found"] += 1
                        if self._should_clean_file(item):
                            if self._safe_delete(item, "TEMP_FILE"):
                                stats["files_deleted"] += 1
                    
                    elif item.is_dir():
                        # Solo eliminar carpetas vacías o completamente temporales
                        try:
                            if not any(item.iterdir()):
                                if self._safe_delete(item, "TEMP_FOLDER"):
                                    stats["folders_deleted"] += 1
                        except PermissionError:
                            continue
            else:
                # Solo el directorio actual
                for item in directory.iterdir():
                    if cleanup_logger._should_exclude(item):
                        continue
                    
                    if item.is_file():
                        stats["files_found"] += 1
                        if self._should_clean_file(item):
                            if self._safe_delete(item, "TEMP_FILE"):
                                stats["files_deleted"] += 1
                    
                    elif item.is_dir():
                        try:
                            if not any(item.iterdir()):
                                if self._safe_delete(item, "TEMP_FOLDER"):
                                    stats["folders_deleted"] += 1
                        except PermissionError:
                            continue
        
        except PermissionError as e:
            cleanup_logger.log_operation(
                "TEMP_CLEANUP", directory, 0, success=False, error=str(e)
            )
        except Exception as e:
            cleanup_logger.log_operation(
                "TEMP_CLEANUP", directory, 0, success=False, error=str(e)
            )
        
        return stats
    
    def clean_all(self) -> dict:
        """Limpia todos los directorios temporales configurados."""
        print("\n" + "="*50)
        print("LIMPIEZA DE ARCHIVOS TEMPORALES")
        print("="*50)
        
        total_stats = {
            "directories_processed": 0,
            "files_found": 0,
            "files_deleted": 0,
            "folders_deleted": 0,
            "total_size": 0
        }
        
        for temp_dir in self.temp_dirs:
            dir_path = Path(temp_dir)
            print(f"\nProcesando: {dir_path}")
            
            if dir_path.exists():
                stats = self.clean_directory(dir_path)
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
                print(f"  Directorio no encontrado: {dir_path}")
        
        print("\n" + "-"*50)
        print(f"Directorios procesados: {total_stats['directories_processed']}")
        print(f"Archivos encontrados: {total_stats['files_found']}")
        print(f"Archivos eliminados: {total_stats['files_deleted']}")
        print(f"Carpetas eliminadas: {total_stats['folders_deleted']}")
        print("-"*50)
        
        return total_stats


# Instancia del cleaner temporal
temp_cleaner = TempCleaner()
