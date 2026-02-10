"""
Módulo de Limpieza de Caché de Navegadores
==========================================
"""

import os
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from config import CONFIG
from logger import cleanup_logger


class BrowserCacheCleaner:
    """Clase para limpiar caché de diferentes navegadores."""
    
    def __init__(self):
        self.browser_cache = CONFIG["browser_cache"]
        self.max_age = CONFIG["max_age_days"]
        self.dry_run = CONFIG["dry_run"]
        self.cache_extensions = {".tmp", ".temp", ".log", ".cache", ".dat"}
    
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
    
    def _safe_delete(self, file_path: Path, browser_name: str) -> bool:
        """Elimina un archivo de forma segura."""
        try:
            size = self._get_file_size(file_path)
            
            if self.dry_run:
                cleanup_logger.log_operation(
                    f"CACHE_{browser_name.upper()}", file_path, size, success=True
                )
                return True
            
            if file_path.is_file():
                file_path.unlink()
            elif file_path.is_dir():
                shutil.rmtree(file_path)
            
            cleanup_logger.log_operation(
                f"CACHE_{browser_name.upper()}", file_path, size, success=True
            )
            return True
            
        except Exception as e:
            cleanup_logger.log_operation(
                f"CACHE_{browser_name.upper()}", file_path, 0, success=False, error=str(e)
            )
            return False
    
    def clean_browser_cache(self, browser_name: str, cache_path: Path) -> dict:
        """Limpia el caché de un navegador específico."""
        stats = {
            "browser": browser_name,
            "files_found": 0,
            "files_deleted": 0,
            "folders_deleted": 0,
            "total_size": 0
        }
        
        if not cache_path.exists():
            print(f"  Caché de {browser_name} no encontrado: {cache_path}")
            return stats
        
        try:
            # Limpiar archivos de caché
            for item in cache_path.rglob("*"):
                if item.is_file():
                    stats["files_found"] += 1
                    
                    # Verificar si es un archivo de caché antiguo
                    if self._is_old_enough(item):
                        if self._safe_delete(item, browser_name):
                            stats["files_deleted"] += 1
                            stats["total_size"] += self._get_file_size(item)
                
                elif item.is_dir():
                    # Eliminar carpetas de caché vacías
                    try:
                        if not any(item.iterdir()):
                            if self._safe_delete(item, browser_name):
                                stats["folders_deleted"] += 1
                    except PermissionError:
                        continue
        
        except PermissionError as e:
            cleanup_logger.log_operation(
                f"CACHE_{browser_name.upper()}", cache_path, 0, 
                success=False, error=str(e)
            )
        except Exception as e:
            cleanup_logger.log_operation(
                f"CACHE_{browser_name.upper()}", cache_path, 0, 
                success=False, error=str(e)
            )
        
        return stats
    
    def clean_all_browsers(self) -> dict:
        """Limpia el caché de todos los navegadores configurados."""
        print("\n" + "="*50)
        print("LIMPIEZA DE CACHÉ DE NAVEGADORES")
        print("="*50)
        
        total_stats = {
            "browsers_processed": 0,
            "files_found": 0,
            "files_deleted": 0,
            "folders_deleted": 0,
            "total_size": 0
        }
        
        for browser_name, cache_path in self.browser_cache.items():
            cache_path = Path(cache_path)
            print(f"\nProcesando {browser_name}: {cache_path}")
            
            if cache_path.exists():
                stats = self.clean_browser_cache(browser_name, cache_path)
                total_stats["browsers_processed"] += 1
                total_stats["files_found"] += stats["files_found"]
                total_stats["files_deleted"] += stats["files_deleted"]
                total_stats["folders_deleted"] += stats["folders_deleted"]
                total_stats["total_size"] += stats["total_size"]
                
                cleanup_logger.log_folder_cleanup(
                    cache_path,
                    stats["files_deleted"],
                    stats["total_size"],
                    success=True
                )
            else:
                print(f"  Directorio de caché no encontrado")
        
        print("\n" + "-"*50)
        print(f" Navegadores procesados: {total_stats['browsers_processed']}")
        print(f" Archivos encontrados: {total_stats['files_found']}")
        print(f" Archivos eliminados: {total_stats['files_deleted']}")
        print(f" Carpetas eliminadas: {total_stats['folders_deleted']}")
        print("-"*50)
        
        return total_stats
    
    def clean_firefox_profiles(self) -> dict:
        """Limpia específicamente los perfiles de Firefox."""
        print("\n" + "-"*30)
        print("LIMPIEZA DE FIREFOX PROFILES")
        print("-"*30)
        
        total_stats = {
            "profiles_cleaned": 0,
            "files_deleted": 0,
            "total_size": 0
        }
        
        firefox_path = self.browser_cache.get("Firefox")
        if firefox_path and Path(firefox_path).exists():
            try:
                for item in Path(firefox_path).iterdir():
                    if item.is_dir() and "-release" in str(item):
                        cache_dir = item / "cache2"
                        if cache_dir.exists():
                            stats = self.clean_browser_cache("Firefox_Profile", cache_dir)
                            total_stats["profiles_cleaned"] += 1
                            total_stats["files_deleted"] += stats["files_deleted"]
                            total_stats["total_size"] += stats["total_size"]
            except Exception as e:
                cleanup_logger.log_operation(
                    "FIREFOX_CLEANUP", Path(firefox_path), 0, 
                    success=False, error=str(e)
                )
        
        return total_stats


# Instancia del cleaner de caché
browser_cache_cleaner = BrowserCacheCleaner()
