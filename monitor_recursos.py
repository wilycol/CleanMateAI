#!/usr/bin/env python3
"""
System Tray para CleanMateAI
============================
Implementa un icono en la bandeja del sistema con estado visual.
- Icono verde: Todo OK
- Icono rojo: Alarma detectada

Al hacer clic muestra ventana con:
- Reporte de recursos (CPU, RAM, disco)
- Último mensaje de Grok
- Botón para ejecutar limpieza
- Horas desde última limpieza
- GB liberados última vez
"""

import threading
import time
import tkinter as tk
from tkinter import messagebox, ttk
from PIL import Image, ImageDraw
import pystray
from pystray import MenuItem, Menu
import psutil
import os
from datetime import datetime, timedelta
from pathlib import Path

# Importar API de Grok
from grok_api import get_grok_recommendation, get_grok_status
from config import ALERT_THRESHOLDS

# Colores
GREEN = (0, 200, 0)
RED = (200, 0, 0)


def create_icon_image(color: tuple, size: int = 32) -> Image.Image:
    """Crea una imagen de icono con el color especificado."""
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    margin = 2
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=color + (255,),
        outline=(255, 255, 255, 255),
        width=2
    )
    return image


class CleanMateTray:
    """Clase principal para el system tray de CleanMateAI."""
    
    def __init__(self):
        self.icon = None
        self.icon_state = "ok"
        self.running = True
        self.root = None
        self.popup_window = None
        self.last_cleanup_time = None
        self.last_space_freed = "0 MB"
        self.grok_message = ""
        
    def create_tray_icon(self) -> pystray.Icon:
        """Crea el icono del system tray."""
        icon_image = create_icon_image(GREEN)
        
        menu = Menu(
            MenuItem('📊 Ver Estado', self.show_popup),
            MenuItem('🧹 Ejecutar limpieza', self.run_cleanup),
            MenuItem('❌ Salir', self.exit_app)
        )
        
        icon = pystray.Icon(
            "CleanMateAI",
            icon_image,
            "CleanMateAI - Sistema de Limpieza",
            menu
        )
        
        return icon
    
    def set_state(self, state: str):
        """Cambia el estado del icono."""
        self.icon_state = state
        color = GREEN if state == "ok" else RED
        if self.icon:
            self.icon.icon = create_icon_image(color)
    
    def get_system_resources(self) -> dict:
        """Obtiene el uso de recursos del sistema."""
        try:
            cpu = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('C:\\')
            
            return {
                "cpu": cpu,
                "ram_percent": memory.percent,
                "ram_used": round(memory.used / (1024**3), 2),
                "ram_total": round(memory.total / (1024**3), 2),
                "disk_percent": disk.percent,
                "disk_used": round(disk.used / (1024**3), 2),
                "disk_total": round(disk.total / (1024**3), 2)
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_last_cleanup_info(self) -> tuple:
        """Obtiene información de la última limpieza desde el log."""
        try:
            log_file = Path("cleanup_log.txt")
            if not log_file.exists():
                return None, "Sin registros"
            
            with open(log_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Buscar última sesión
            for i in range(len(lines) - 1, -1, -1):
                if "SESIÓN DE LIMPIEZA" in lines[i]:
                    timestamp_str = lines[i].split('- ')[1].strip()
                    timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
                    
                    # Buscar espacio liberado
                    for j in range(i, min(i + 10, len(lines))):
                        if "Espacio liberado:" in lines[j]:
                            space_freed = lines[j].split(': ')[1].strip()
                            return timestamp, space_freed
                    
                    return timestamp, "Sin datos"
            
            return None, "Sin registros"
        except Exception as e:
            return None, f"Error: {e}"
    
    def get_hours_since_cleanup(self, cleanup_time: datetime) -> float:
        """Calcula las horas desde la última limpieza."""
        if cleanup_time:
            delta = datetime.now() - cleanup_time
            return round(delta.total_seconds() / 3600, 1)
        return None
    
    def run_cleanup(self):
        """Ejecuta la limpieza."""
        try:
            # Importar y ejecutar limpieza
            from cleanmate import run_full_cleanup
            result = run_full_cleanup()
            
            # Actualizar última limpieza
            self.last_cleanup_time = datetime.now()
            self.last_space_freed = result.get('summary', {}).get(
                'space_freed_formatted', '0 MB'
            ) if isinstance(result, dict) else "0 MB"
            
            messagebox.showinfo("CleanMateAI", "✅ Limpieza completada exitosamente")
            self.show_popup()  # Actualizar popup si está abierto
        except Exception as e:
            messagebox.showerror("CleanMateAI", f"❌ Error al ejecutar limpieza:\n{e}")
    
    def show_popup(self):
        """Muestra la ventana emergente con estado."""
        if self.popup_window and self.popup_window.winfo_exists():
            self.popup_window.lift()
            return
        
        # Crear ventana emergente
        self.popup_window = tk.Toplevel(self.root)
        self.popup_window.title("CleanMateAI - Estado del Sistema")
        self.popup_window.geometry("400x450")
        self.popup_window.resizable(False, False)
        self.popup_window.transient(self.root)
        
        # Frame principal
        main_frame = ttk.Frame(self.popup_window, padding=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Título
        title_label = tk.Label(
            main_frame,
            text="📊 CleanMateAI",
            font=("Arial", 16, "bold"),
            fg="#2E7D32"
        )
        title_label.pack(pady=(0, 15))
        
        # Obtener datos
        resources = self.get_system_resources()
        cleanup_time, space_freed = self.get_last_cleanup_info()
        hours_since = self.get_hours_since_cleanup(cleanup_time) if cleanup_time else None
        
        # Sección de recursos
        resources_frame = ttk.LabelFrame(main_frame, text="Recursos del Sistema", padding=10)
        resources_frame.pack(fill=tk.X, pady=5)
        
        if "error" not in resources:
            resources_text = (
                f"🖥️  CPU: {resources['cpu']}%\n"
                f"💾 RAM: {resources['ram_percent']}% "
                f"({resources['ram_used']:.1f} / {resources['ram_total']:.1f} GB)\n"
                f"💿 Disco: {resources['disk_percent']}% "
                f"({resources['disk_used']:.1f} / {resources['disk_total']:.1f} GB)"
            )
        else:
            resources_text = f"Error al obtener recursos: {resources['error']}"
        
        resources_label = tk.Label(resources_frame, text=resources_text, font=("Arial", 10))
        resources_label.pack(anchor=tk.W)
        
        # Sección de última limpieza
        cleanup_frame = ttk.LabelFrame(main_frame, text="Última Limpieza", padding=10)
        cleanup_frame.pack(fill=tk.X, pady=5)
        
        if cleanup_time:
            cleanup_text = (
                f"📅 Fecha: {cleanup_time.strftime('%Y-%m-%d %H:%M')}\n"
                f"⏱️  Horas desde: {hours_since} h" if hours_since else ""
            ) + f"\n"
        else:
            cleanup_text = "📅 Sin limpiezas registradas\n"
        
        cleanup_text += f"💿 Liberado: {space_freed}"
        
        cleanup_label = tk.Label(cleanup_frame, text=cleanup_text, font=("Arial", 10))
        cleanup_label.pack(anchor=tk.W)
        
        # Sección de Grok (mensaje de análisis)
        grok_frame = ttk.LabelFrame(main_frame, text="Análisis del Sistema (Grok)", padding=10)
        grok_frame.pack(fill=tk.X, pady=5)
        
        grok_text = self.grok_message or "✅ Sistema en buen estado. No se requieren acciones."
        grok_label = tk.Label(grok_frame, text=grok_text, font=("Arial", 9), wraplength=340)
        grok_label.pack(anchor=tk.W)
        
        # Botón de limpieza
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(fill=tk.X, pady=15)
        
        clean_btn = tk.Button(
            btn_frame,
            text="🧹 EJECUTAR LIMPIEZA AHORA",
            command=self.run_cleanup,
            bg="#4CAF50",
            fg="white",
            font=("Arial", 11, "bold"),
            padx=20,
            pady=10
        )
        clean_btn.pack(fill=tk.X)
        
        # Estado del icono
        status_frame = ttk.Frame(main_frame)
        status_frame.pack(fill=tk.X, pady=5)
        
        status_text = "✅ Todo OK" if self.icon_state == "ok" else "⚠️ ALARMA"
        status_color = "#2E7D32" if self.icon_state == "ok" else "#C62828"
        status_label = tk.Label(
            status_frame,
            text=f"Estado: {status_text}",
            font=("Arial", 10, "bold"),
            fg=status_color
        )
        status_label.pack()
        
        # Centrar ventana
        self.popup_window.update_idletasks()
        x = (self.popup_window.winfo_screenwidth() // 2) - (400 // 2)
        y = (self.popup_window.winfo_screenheight() // 2) - (450 // 2)
        self.popup_window.geometry(f"400x450+{x}+{y}")
        
        # Cerrar popup al cerrar ventana
        self.popup_window.protocol("WM_DELETE_WINDOW", self.popup_window.destroy)
    
    def exit_app(self):
        """Sale de la aplicación."""
        self.running = False
        if self.icon:
            self.icon.stop()
        if self.root:
            self.root.quit()
    
    def on_close(self):
        """Maneja el evento de cerrar la ventana principal."""
        self.root.withdraw()
    
    def create_window(self):
        """Crea la ventana principal de tkinter."""
        self.root = tk.Tk()
        self.root.title("CleanMateAI")
        self.root.geometry("300x150")
        self.root.resizable(False, False)
        
        frame = tk.Frame(self.root, padx=20, pady=20)
        frame.pack(fill=tk.BOTH, expand=True)
        
        label = tk.Label(
            frame,
            text="CleanMateAI\nSystem Tray Activo",
            font=("Arial", 12, "bold"),
            fg="green"
        )
        label.pack(pady=10)
        
        desc = tk.Label(
            frame,
            text="La aplicación se ejecuta en segundo plano.\nUsa el icono de la bandeja para acceder.",
            font=("Arial", 8),
            justify=tk.CENTER
        )
        desc.pack(pady=10)
        
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
        
        # Centrar
        self.root.update_idletasks()
        x = (self.root.winfo_screenwidth() // 2) - (300 // 2)
        y = (self.root.winfo_screenheight() // 2) - (150 // 2)
        self.root.geometry(f"300x150+{x}+{y}")
    
    def run(self):
        """Inicia la aplicación."""
        self.create_window()
        self.root.withdraw()
        
        self.icon = self.create_tray_icon()
        
        tray_thread = threading.Thread(target=self.icon.run, daemon=True)
        tray_thread.start()
        
        try:
            self.root.mainloop()
        except KeyboardInterrupt:
            self.exit_app()
        
        tray_thread.join(timeout=1)


class StatusMonitor:
    """Clase para monitorear el estado del sistema."""
    
    def __init__(self, tray: CleanMateTray):
        self.tray = tray
        self.check_interval = 60
        self.last_alert_time = None
    
    def check_system_health(self) -> tuple:
        """
        Verifica la salud del sistema.
        Returns: (is_healthy: bool, message: str)
        """
        try:
            resources = self.tray.get_system_resources()
            
            if "error" in resources:
                return False, f"Error al obtener recursos: {resources['error']}"
            
            # Usar umbrales de config
            cpu_threshold = ALERT_THRESHOLDS.get("cpu_percent", 80)
            ram_threshold = ALERT_THRESHOLDS.get("ram_percent", 85)
            disk_threshold = ALERT_THRESHOLDS.get("disk_percent", 90)
            
            issues = []
            if resources['cpu'] > cpu_threshold:
                issues.append(f"CPU alto ({resources['cpu']}%)")
            if resources['ram_percent'] > ram_threshold:
                issues.append(f"RAM alta ({resources['ram_percent']}%)")
            if resources['disk_percent'] > disk_threshold:
                issues.append(f"Disco lleno ({resources['disk_percent']}%)")
            
            if issues:
                message = f"⚠️ Alertas: {'; '.join(issues)}"
                return False, message
            else:
                message = f"✅ Sistema OK - CPU: {resources['cpu']}% | RAM: {resources['ram_percent']}% | Disco: {resources['disk_percent']}%"
                return True, message
        except Exception as e:
            return False, f"Error en verificación: {e}"
    
    def get_cleanup_info(self) -> dict:
        """Obtiene información de limpieza."""
        cleanup_time, space_freed = self.tray.get_last_cleanup_info()
        hours_since = self.tray.get_hours_since_cleanup(cleanup_time) if cleanup_time else None
        
        return {
            "last_cleanup": cleanup_time,
            "hours_since": hours_since,
            "last_space_freed": space_freed
        }
    
    def call_grok_if_needed(self, is_healthy: bool, resources: dict):
        """
        Llama a Grok solo si hay problemas o cada cierto tiempo.
        """
        # Llamar si no está saludable
        if not is_healthy:
            self.call_grok(resources)
        # Llamar periódicamente cada 6 checks (1 hora)
        elif self.last_alert_time and (datetime.now() - self.last_alert_time).total_seconds() > 21600:
            self.call_grok(resources)
            self.last_alert_time = datetime.now()
    
    def call_grok(self, resources: dict):
        """Obtiene recomendaciones de Grok."""
        try:
            cleanup_info = self.get_cleanup_info()
            grok_message = get_grok_recommendation(resources, cleanup_info)
            self.tray.grok_message = grok_message
        except Exception as e:
            print(f"Error al llamar a Grok: {e}")
    
    def update_status(self):
        """Actualiza el estado del icono."""
        is_healthy, message = self.check_system_health()
        state = "ok" if is_healthy else "alarm"
        self.tray.set_state(state)
        
        # Obtener recursos para Grok
        resources = self.tray.get_system_resources()
        
        # Llamar a Grok si hay problemas
        if not is_healthy:
            self.call_grok(resources)
        else:
            self.tray.grok_message = message
        
        # Actualizar tiempo de última alerta
        if not is_healthy:
            self.last_alert_time = datetime.now()
    
    def start_monitoring(self):
        """Inicia el monitoreo en segundo plano."""
        def monitor_loop():
            while self.tray.running:
                self.update_status()
                time.sleep(self.check_interval)
        
        thread = threading.Thread(target=monitor_loop, daemon=True)
        thread.start()


def main():
    """Función principal para ejecutar el system tray."""
    print("Iniciando CleanMateAI System Tray...")
    
    tray = CleanMateTray()
    monitor = StatusMonitor(tray)
    monitor.start_monitoring()
    
    tray.run()


if __name__ == "__main__":
    main()
