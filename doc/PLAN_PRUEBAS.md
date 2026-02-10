# Plan de Prueba - CleanMateAI
## Verificación Manual del Sistema Freemium

---

## 1. Preparación del Entorno

### 1.1 Instalar Archivos Necesarios
```cmd
# Copiar estos archivos a la carpeta de instalación:
# - dist/CleanMateAI.exe
# - .env (si se incluye la API key)
# - status.json
```

### 1.2 Verificar API Key (Opcional)
Si el .exe no incluye la API key:
```cmd
setx GROK_API_KEY "xai-tu-api-key-aqui"
```
O reiniciar con `.env` en la misma carpeta del `.exe`.

---

## 2. Prueba 1: Verificar Trial de 7 Días

### Pasos:
1. **Ejecutar primera vez:**
   ```cmd
   CleanMateAI.exe --once
   ```

2. **Verificar estado del trial:**
   ```cmd
   python subscription_manager.py
   ```

3. **Esperar resultado esperado:**
   - Plan: `TRIAL`
   - Días restantes: `6` (o el número correcto)
   - Premium activo: `No`

### Verificación de Logs:
- Verificar que `status.json` muestre:
  ```json
  {
    "first_run": "2026-02-09...",
    "trial_start": "2026-02-09...",
    "trial_end": "2026-02-16...",
    "plan": "trial"
  }
  ```

---

## 3. Prueba 2: Verificar Llamadas Ilimitadas en Trial

### Pasos:
1. **Ejecutar varias limpiezas:**
   ```cmd
   CleanMateAI.exe --once
   CleanMateAI.exe --once
   CleanMateAI.exe --once
   ```

2. **Verificar llamadas registradas:**
   ```cmd
   python subscription_manager.py
   ```

3. **Esperar resultado esperado:**
   - `api_calls_count` aumenta cada vez
   - `can_make_call` siempre debe ser `Sí`

---

## 4. Prueba 3: Verificar Modo Premium

### Pasos:
1. **Activar Premium temporalmente:**
   ```python
   python -c "from subscription_manager import activate_premium; activate_premium(); print('Premium activado')"
   ```

2. **Verificar estado:**
   ```cmd
   python subscription_manager.py
   ```

3. **Esperar resultado esperado:**
   - Plan: `PREMIUM`
   - Premium activo: `Sí`
   - Llamadas: Ilimitadas

4. **Desactivar Premium:**
   ```python
   python -c "from subscription_manager import deactivate_premium; deactivate_premium(); print('Premium desactivado')"
   ```

---

## 5. Prueba 4: Simular Usuario Gratuito

### Pasos:
1. **Resetear a modo gratuito:**
   ```python
   python -c "from subscription_manager import subscription_manager; subscription_manager.status['plan']='free'; subscription_manager.status['trial_start']=None; subscription_manager.status['trial_end']=None; subscription_manager._save_status()"
   ```

2. **Primera llamada gratuita:**
   ```cmd
   CleanMateAI.exe --once
   ```

3. **Verificar:**
   ```cmd
   python subscription_manager.py
   ```
   - Plan: `FREE`
   - `last_api_call` debe tener timestamp actual
   - `api_calls_count` = 1

4. **Segunda llamada (debe ser bloqueada):**
   ```cmd
   CleanMateAI.exe --once
   ```
   - **Esperar:** Mensaje de error "Gratis: Espera X días"

---

## 6. Acceso a Logs y Errores

### 6.1 Log de Limpieza
- **Archivo:** `cleanup_log.txt`
- **Contenido:** Historial de limpiezas realizadas

### 6.2 Log de Errors del Sistema
- Verificar en consola durante ejecución

### 6.3 Estado de Suscripción
- **Archivo:** `status.json`
- **Comando:** `python subscription_manager.py`

---

## 7. Comandos de Prueba Resumidos

| Prueba | Comando |
|--------|---------|
| Limpieza única | `CleanMateAI.exe --once` |
| Modo simulación | `CleanMateAI.exe --dry-run` |
| Verificar scheduler | `CleanMateAI.exe --status` |
| Estado suscripción | `python subscription_manager.py` |
| Verificar API | `python grok_api.py` |

---

## 8. Checklist de Verificación

- [ ] Primera ejecución registra trial de 7 días
- [ ] Llamadas ilimitadas durante trial
- [ ] Premium activo cuando `PREMIUM_ACTIVE=True`
- [ ] Usuario gratuito bloqueado tras 1 llamada/semana
- [ ] `status.json` se actualiza correctamente
- [ ] `cleanup_log.txt` registra limpiezas
- [ ] No hay errores en consola

---

## 9. Notas

- El `.exe` standalone incluye todas las dependencias
- El archivo `.env` debe estar en la misma carpeta para carga automática de API key
- Para producción, configurar API key como variable de entorno o archivo seguro
