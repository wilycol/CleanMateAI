"""
Módulo de Programación Semanal (Scheduler)
==========================================
"""

import sched
import time
import threading
from datetime import datetime, timedelta
from typing import Callable, Optional

from config import CONFIG


class CleanupScheduler:
    """Clase para programar limpiezas automáticas semanales."""
    
    def __init__(self, cleanup_function: Callable):
        self.scheduler = sched.scheduler(time.time, time.sleep)
        self.cleanup_function = cleanup_function
        self.schedule_day = CONFIG["schedule_day"]  # 0=Lunes, 6=Domingo
        self.schedule_hour = CONFIG["schedule_hour"]  # 3:00 AM
        self.schedule_minute = CONFIG["schedule_minute"]
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._next_run: Optional[datetime] = None
    
    def _calculate_next_run(self) -> datetime:
        """Calcula la próxima fecha de ejecución."""
        now = datetime.now()
        
        # Crear la próxima fecha programada
        next_run = now.replace(
            hour=self.schedule_hour,
            minute=self.schedule_minute,
            second=0,
            microsecond=0
        )
        
        # Calcular días hasta el día programado
        current_day = now.weekday()  # 0=Lunes, 6=Domingo
        days_until = (self.schedule_day - current_day) % 7
        
        if days_until == 0:
            # Mismo día, verificar si ya pasó la hora
            if now >= next_run:
                days_until = 7
            next_run = next_run + timedelta(days=days_until)
        else:
            next_run = next_run + timedelta(days=days_until)
        
        return next_run
    
    def _run_cleanup(self):
        """Ejecuta la limpieza y programa la siguiente."""
        print(f"\n{'='*60}")
        print(f"EJECUCIÓN PROGRAMADA - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}\n")
        
        try:
            self.cleanup_function()
        except Exception as e:
            print(f"Error en limpieza programada: {e}")
        
        # Programar siguiente ejecución
        self.schedule_next()
    
    def schedule_next(self):
        """Programa la próxima ejecución."""
        next_run = self._calculate_next_run()
        self._next_run = next_run
        
        # Calcular segundos hasta la próxima ejecución
        now = time.time()
        run_time = next_run.timestamp()
        delay = run_time - now
        
        print(f"\nPróxima limpieza programada: {next_run.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Cancelar eventos anteriores
        for event in self.scheduler.queue:
            try:
                self.scheduler.cancel(event)
            except ValueError:
                pass
        
        # Programar nuevo evento
        self.scheduler.enter(delay, 1, self._run_cleanup)
    
    def start(self, run_immediately: bool = False):
        """Inicia el scheduler."""
        if self._running:
            print("El scheduler ya está ejecutándose")
            return
        
        self._running = True
        
        if run_immediately:
            print("Ejecutando limpieza inmediatamente...")
            threading.Thread(target=self._run_cleanup, daemon=True).start()
        
        # Programa la primera ejecución
        self.schedule_next()
        
        # Inicia el loop del scheduler en un hilo separado
        self._thread = threading.Thread(target=self.scheduler.run, daemon=True)
        self._thread.start()
        
        print("Scheduler iniciado correctamente")
    
    def stop(self):
        """Detiene el scheduler."""
        self._running = False
        
        # Cancelar eventos pendientes
        for event in self.scheduler.queue:
            try:
                self.scheduler.cancel(event)
            except ValueError:
                pass
        
        print("Scheduler detenido")
    
    def get_status(self) -> dict:
        """Obtiene el estado actual del scheduler."""
        return {
            "running": self._running,
            "next_run": self._next_run.isoformat() if self._next_run else None,
            "schedule": {
                "day": self.schedule_day,
                "hour": self.schedule_hour,
                "minute": self.schedule_minute
            },
            "pending_events": len(self.scheduler.queue)
        }
    
    def run_once(self):
        """Ejecuta una limpieza inmediata (una sola vez)."""
        if self._running:
            print("Scheduler activo - ejecutando en hilo separado...")
            threading.Thread(target=self._run_cleanup, daemon=True).start()
        else:
            self._run_cleanup()


# Función para convertir día numérico a nombre
DAYS_OF_WEEK = {
    0: "Lunes",
    1: "Martes",
    2: "Miércoles",
    3: "Jueves",
    4: "Viernes",
    5: "Sábado",
    6: "Domingo"
}
