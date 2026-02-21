# Informe técnico del backend – CleanMate Assist

## 1. Estructura actual del backend

Raíz del backend de la API HTTP que expone los endpoints de IA:

```text
backend/
├─ server.py
└─ requirements.txt
```

- `backend/server.py`: servidor Flask principal, expone `/api/analyze`, `/api/chat`, `/api/report`, `/api/ai-health` y la raíz `/`.
- `backend/requirements.txt`: dependencias Python necesarias para el backend (Flask, requests, python-dotenv, etc.).

El resto de la lógica de negocio relacionada con análisis, limpieza y chat vive en la capa Electron/Node:

- `electron/main.js`: proceso principal de Electron, orquesta análisis/limpieza locales y comunica con el backend.
- `services/*.js`: servicios auxiliares (contexto del sistema, cliente HTTP, IA de chat, etc.).

## 2. Archivo donde estaba `generateAIResponse()`

### Ubicación histórica

La función `generateAIResponse()` vivía en:

- `services/aiService.js`

Rol que cumplía:

- Actuaba como un “segundo cerebro” en el frontend/Electron.
- Simulaba una personalidad propia, con detección de intención basada en regex y respuestas generadas enteramente en el proceso Electron, sin pasar por el modelo Groq.
- Proponía acciones (`analyze`, `clean`) y decoraba mensajes con emojis y tono más informal.

### Estado actual

Para eliminar la doble personalidad y unificar la lógica conversacional:

- `generateAIResponse()` ha sido eliminada de `services/aiService.js`.
- El flujo actual usa exclusivamente el backend:
  - `grokChatResponse(userMsg, context)` llama a `chatWithAI(userMsg, context)`.
  - `chatWithAI` llama al endpoint `/api/chat` del backend y obtiene un JSON estructurado con:
    - `message`: texto técnico a mostrar al usuario.
    - `nextAction`: `{ type, label, autoExecute }` validado en backend.

Archivo actual relevante:

- `services/aiService.js`  
  - Expo­ne: `processUserMessage`, `getChatHistory`, `clearChatHistory`, `generateGreeting`.
  - Consume: `chatWithAI` (cliente HTTP hacia el backend).

## 3. Archivo donde se construye el prompt para Groq

Archivo principal:

- `backend/server.py`

Elementos clave:

1. **Prompt del agente (rol `system`)**  
   Definido en la constante `AGENT_PROMPT` al inicio del archivo:

   - Describe a “CleanMate Assist” como especialista técnico en diagnóstico y optimización de Windows.
   - Impone restricciones de tono:
     - Profesional, conciso, sin emojis, sin chistes.
   - Especifica el flujo clínico:
     - `PRE_ANALYSIS → POST_ANALYSIS → POST_OPTIMIZATION → CONVERSATION`.
   - Define el formato de respuesta obligatorio:
     - Un único objeto JSON con:
       - `message`: texto técnico en español, breve y profesional.
       - `nextAction`: `{ type: "analyze"|"optimize"|"none", label, autoExecute: false }`.
   - Define reglas de negocio para `nextAction`:
     - En `PRE_ANALYSIS` no se permite `optimize`.
     - En `POST_ANALYSIS` se puede permitir `optimize`.
     - En `POST_OPTIMIZATION` y `CONVERSATION` se fuerza `type = "none"`.

2. **Construcción del contexto para el mensaje `user`**  
   Dentro de la función `chat()` (endpoint `/api/chat`) se construye `context_text`:

   - Incluye:
     - `CURRENT MODE`: valor calculado (`PRE_ANALYSIS`, `POST_ANALYSIS`, `POST_OPTIMIZATION`).
     - `CURRENT METRICS`: CPU, RAM, disco y espacio libre.
     - `LAST ANALYSIS REPORT`: resumen numérico del último análisis (MB recuperables, número de archivos, etc.).
     - `LAST OPTIMIZATION REPORT`: resumen numérico de la última optimización (MB liberados, archivos eliminados).
     - `ANALYSIS HISTORY (latest)`: datos del último reporte de análisis persistido (historial).
     - `OPTIMIZATION HISTORY (latest)`: datos del último reporte de optimización persistido (historial).
   - Después se construye `full_prompt` concatenando:
     - `context_text`
     - `USER MESSAGE: {user_message}`

3. **Llamada a Groq**  
   A través de `_call_groq(messages, ...)`:

   - `messages` tiene dos entradas:
     - `{"role": "system", "content": AGENT_PROMPT}`
     - `{"role": "user", "content": full_prompt}`
   - El backend espera que Groq responda con un contenido que sea un JSON válido según el esquema indicado en el prompt.

En resumen: el **prompt completo** se construye en `backend/server.py`, combinando `AGENT_PROMPT` + contexto estructurado + mensaje de usuario, y se envía a Groq vía `_call_groq`.

## 4. Endpoint actual del chat

Endpoint HTTP:

- Método: `POST`
- Ruta: `/api/chat`
- Archivo: `backend/server.py`

Responsabilidades:

1. Recibir:
   - `message`: texto del usuario.
   - `context`: objeto con:
     - `systemMetrics`
     - `lastAnalysis`
     - `lastCleanup`
     - `reports` (historial de reportes)
2. Calcular el modo clínico (`chat_mode`) a partir de `lastAnalysis` y `lastCleanup`.
3. Construir `context_text` con métricas y resúmenes de análisis/optimización.
4. Montar el prompt completo (`AGENT_PROMPT` + `full_prompt`) y llamar a Groq.
5. Parsear y validar el JSON devuelto por el modelo:
   - Garantizar tipos permitidos para `nextAction.type`.
   - Ajustar la acción según el modo (`PRE_ANALYSIS`, `POST_ANALYSIS`, `POST_OPTIMIZATION`).
6. Devolver al cliente (Electron/servicio `apiClient.js`) un JSON normalizado:

```json
{
  "message": "texto técnico en español",
  "nextAction": {
    "type": "analyze|optimize|none",
    "label": "texto botón",
    "autoExecute": false
  },
  "mode": "PRE_ANALYSIS|POST_ANALYSIS|POST_OPTIMIZATION"
}
```

Además, el endpoint realiza logging estructurado (`AI_CHAT_LOG`) incluyendo:

- `timestamp`
- `mode`
- `input` (mensaje de usuario)
- `llm_output` (contenido bruto del modelo)
- `validated_action` (acción tras las reglas del backend)
- `executed_action` (actualmente `None`, la ejecución se realiza en otra capa).

## 5. Lógica donde se cambia el `mode`

El `mode` clínico que gobierna el flujo no lo define el frontend, sino el backend en `backend/server.py`, función `chat()`:

```python
last_analysis = context.get("lastAnalysis")
last_cleanup = context.get("lastCleanup")

if last_analysis and not last_cleanup:
    chat_mode = "POST_ANALYSIS"
elif last_cleanup:
    chat_mode = "POST_OPTIMIZATION"
else:
    chat_mode = "PRE_ANALYSIS"
```

Reglas actuales:

- Sin análisis ni optimización previa en contexto → `PRE_ANALYSIS`.
- Con análisis pero sin optimización → `POST_ANALYSIS`.
- Con optimización registrada → `POST_OPTIMIZATION`.

El valor `chat_mode` se:

- Inserta en el contexto (`CURRENT MODE`) que ve el modelo.
- Devuelve al cliente dentro de la respuesta JSON (`mode`).
- Se usa para validar `nextAction`:
  - Si `chat_mode == "PRE_ANALYSIS"` y `action_type == "optimize"` → se fuerza a `"none"`.
  - Si `chat_mode in ["POST_OPTIMIZATION", "CONVERSATION"]` y `action_type in ["optimize", "analyze"]` → se fuerza a `"none"`.

En la capa Electron, el modo de la UI (`analysis`, `optimization`, `hardware`) es más una etiqueta de interfaz, mientras que el **modo clínico real** del asistente viene calculado exclusivamente en backend.

## 6. Archivo principal del backend (equivalente a server.js/app.js)

El backend HTTP está implementado en Python usando Flask. El archivo principal equivalente a un `server.js`/`app.js` en Node es:

- `backend/server.py`

Responsabilidades de `server.py`:

- Inicializar Flask y CORS.
- Cargar configuración de modelo y API key de Groq desde entorno.
- Definir el `AGENT_PROMPT` y `_call_groq`.
- Exponer los endpoints:
  - `/api/analyze`: análisis puntual de estado (usado por el servicio de análisis).
  - `/api/chat`: chat clínico estructurado con el modelo Groq.
  - `/api/report`: recepción de reportes (simulación de persistencia).
  - `/api/ai-health`: healthcheck específico de IA.
  - `/`: healthcheck general.
- Ejecutar la aplicación si se lanza directamente (`if __name__ == '__main__':`).

Desde el punto de vista de refactorización:

- `backend/server.py` actúa como **único punto de entrada** del backend HTTP.
- Toda la lógica de orquestación conversacional con Groq se concentra aquí:
  - Prompt del sistema.
  - Construcción del contexto.
  - Validación de la respuesta del modelo.
  - Logging estructurado de decisiones.

