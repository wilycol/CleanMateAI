#!/usr/bin/env python3
"""
Gestor de Suscripciones Freemium para CleanMateAI
==================================================
Maneja el acceso a la API de Grok según el plan del usuario:
- Gratis: 1 llamada por semana
- Trial: 7 días de llamadas ilimitadas desde la primera ejecución
- Premium: llamadas ilimitadas (PREMIUM_ACTIVE = True)
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional
from enum import Enum

from config import PREMIUM_ACTIVE, TRIAL_DAYS, FREE_WEEKLY_INTERVAL_DAYS, get_base_dir


class SubscriptionPlan(Enum):
    """Planes de suscripción disponibles."""
    FREE = "free"
    TRIAL = "trial"
    PREMIUM = "premium"


class SubscriptionManager:
    """Gestiona el estado de suscripción del usuario."""
    
    def __init__(self):
        # Usar el directorio del ejecutable para status.json
        base_dir = get_base_dir()
        self.status_file = base_dir / "status.json"
        self.status = self._load_status()
    
    def _load_status(self) -> Dict[str, Any]:
        """Carga el estado desde el archivo JSON."""
        if self.status_file.exists():
            try:
                with open(self.status_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        
        # Crear archivo con valores por defecto
        default_status = self._get_default_status()
        self._save_status()
        return default_status
    
    def _get_default_status(self) -> Dict[str, Any]:
        """Retorna el estado por defecto."""
        return {
            "first_run": None,
            "trial_start": None,
            "trial_end": None,
            "last_api_call": None,
            "api_calls_count": 0,
            "plan": "free",
            "premium_active": False
        }
    
    def _save_status(self) -> None:
        """Guarda el estado en el archivo JSON."""
        with open(self.status_file, 'w', encoding='utf-8') as f:
            json.dump(self.status, f, indent=2, default=str)
    
    def _ensure_first_run_recorded(self) -> None:
        """Registra la primera ejecución si no existe."""
        if not self.status["first_run"]:
            now = datetime.now().isoformat()
            self.status["first_run"] = now
            self.status["trial_start"] = now
            self.status["trial_end"] = (datetime.now() + timedelta(days=TRIAL_DAYS)).isoformat()
            self._save_status()
    
    def get_current_plan(self) -> SubscriptionPlan:
        """Determina el plan actual del usuario."""
        # Verificar si es premium (configuración o suscripción activa)
        if PREMIUM_ACTIVE or self.status.get("premium_active", False):
            return SubscriptionPlan.PREMIUM
        
        # Verificar si está en periodo de trial
        if self.status["trial_start"] and self.status["trial_end"]:
            trial_end = datetime.fromisoformat(self.status["trial_end"])
            if datetime.now() <= trial_end:
                return SubscriptionPlan.TRIAL
        
        return SubscriptionPlan.FREE
    
    def can_make_api_call(self) -> tuple[bool, str]:
        """
        Verifica si el usuario puede realizar una llamada a la API.
        
        Returns:
            (puede_llamar, mensaje)
        """
        self._ensure_first_run_recorded()
        plan = self.get_current_plan()
        now = datetime.now()
        
        if plan == SubscriptionPlan.PREMIUM:
            return True, "Plan Premium: llamadas ilimitadas activas"
        
        if plan == SubscriptionPlan.TRIAL:
            trial_end = datetime.fromisoformat(self.status["trial_end"])
            days_remaining = (trial_end - now).days
            if days_remaining > 0:
                return True, f"Trial: {days_remaining} días restantes de uso ilimitado"
            else:
                # Trial expirado, cambia a free
                self.status["plan"] = "free"
                self._save_status()
                return self._can_free_user_call(now)
        
        return self._can_free_user_call(now)
    
    def _can_free_user_call(self, now: datetime) -> tuple[bool, str]:
        """Verifica si un usuario gratuito puede llamar."""
        last_call = self.status.get("last_api_call")
        
        if not last_call:
            return True, "Primera llamada gratuita de la semana"
        
        last_call_date = datetime.fromisoformat(last_call)
        days_since_last = (now - last_call_date).days
        
        if days_since_last >= FREE_WEEKLY_INTERVAL_DAYS:
            return True, f"Nueva semana: llamada gratuita disponible (han pasado {days_since_last} días)"
        else:
            days_wait = FREE_WEEKLY_INTERVAL_DAYS - days_since_last
            return False, f"Gratis: Espera {days_wait} días para tu próxima llamada gratuita"
    
    def record_api_call(self) -> None:
        """Registra una llamada a la API."""
        self.status["last_api_call"] = datetime.now().isoformat()
        self.status["api_calls_count"] += 1
        self._save_status()
    
    def get_subscription_status(self) -> Dict[str, Any]:
        """Retorna el estado completo de la suscripción."""
        self._ensure_first_run_recorded()
        plan = self.get_current_plan()
        now = datetime.now()
        
        status = {
            "plan": plan.value,
            "api_calls_made": self.status["api_calls_count"],
            "first_run": self.status["first_run"],
            "can_make_call": False,
            "message": "",
            "premium_active": PREMIUM_ACTIVE or self.status.get("premium_active", False)
        }
        
        can_call, message = self.can_make_api_call()
        status["can_make_call"] = can_call
        status["message"] = message
        
        if plan == SubscriptionPlan.TRIAL and self.status["trial_end"]:
            trial_end = datetime.fromisoformat(self.status["trial_end"])
            status["trial_days_remaining"] = max(0, (trial_end - now).days)
            status["trial_end"] = self.status["trial_end"]
        elif plan == SubscriptionPlan.FREE and self.status.get("last_api_call"):
            last_call = datetime.fromisoformat(self.status["last_api_call"])
            status["days_until_next_free_call"] = max(0, FREE_WEEKLY_INTERVAL_DAYS - (now - last_call).days)
        
        return status
    
    def activate_premium(self) -> None:
        """Activa el modo premium manualmente."""
        self.status["premium_active"] = True
        self.status["plan"] = "premium"
        self._save_status()
    
    def deactivate_premium(self) -> None:
        """Desactiva el modo premium."""
        self.status["premium_active"] = False
        self.status["plan"] = "free"
        self._save_status()
    
    def reset_trial(self) -> None:
        """Reinicia el periodo de trial."""
        now = datetime.now()
        self.status["trial_start"] = now.isoformat()
        self.status["trial_end"] = (now + timedelta(days=TRIAL_DAYS)).isoformat()
        self.status["plan"] = "trial"
        self._save_status()
    
    def get_next_free_call_time(self) -> Optional[datetime]:
        """Retorna la fecha y hora de la próxima llamada gratuita."""
        plan = self.get_current_plan()
        
        if plan != SubscriptionPlan.FREE:
            return None
        
        last_call = self.status.get("last_api_call")
        if not last_call:
            return datetime.now()  # Puede llamar ahora
        
        last_call_date = datetime.fromisoformat(last_call)
        return last_call_date + timedelta(days=FREE_WEEKLY_INTERVAL_DAYS)


# Instancia global del gestor de suscripciones
subscription_manager = SubscriptionManager()


def get_subscription_status() -> Dict[str, Any]:
    """Función conveniencia para obtener el estado de suscripción."""
    return subscription_manager.get_subscription_status()


def can_make_api_call() -> tuple[bool, str]:
    """Función conveniencia para verificar si se puede hacer una llamada API."""
    return subscription_manager.can_make_api_call()


def record_api_call() -> None:
    """Función conveniencia para registrar una llamada API."""
    subscription_manager.record_api_call()


def activate_premium() -> None:
    """Activa el modo premium."""
    subscription_manager.activate_premium()


def deactivate_premium() -> None:
    """Desactiva el modo premium."""
    subscription_manager.deactivate_premium()


if __name__ == "__main__":
    print("=" * 60)
    print("Estado de Suscripción - CleanMateAI")
    print("=" * 60)
    
    status = get_subscription_status()
    
    print(f"\nPlan actual: {status['plan'].upper()}")
    print(f"Llamadas realizadas: {status['api_calls_made']}")
    print(f"Premium activo: {'Sí' if status['premium_active'] else 'No'}")
    print(f"Puede llamar: {'Sí' if status['can_make_call'] else 'No'}")
    print(f"Mensaje: {status['message']}")
    
    if status['plan'] == 'trial':
        print(f"Días restantes de trial: {status.get('trial_days_remaining', 0)}")
    elif status['plan'] == 'free':
        print(f"Días hasta siguiente llamada gratuita: {status.get('days_until_next_free_call', 0)}")
    
    print("\n" + "=" * 60)
