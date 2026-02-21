# Informe técnico del frontend/Electron – CleanMate Assist

## 1. Visión general de la arquitectura cliente

La parte cliente de CleanMate Assist está formada por tres capas principales:

- **React (renderer):**
  - Carpeta: `src/`
  - Componentes clave:
    - `src/AIChat.jsx`: interfaz del chat/copilot.
    - `src/App.jsx`: aplicación principal de escritorio.
- **Electron (main + preload):**
  - Carpeta: `electron/`
  - Archivos:
    - `electron/main.js`: proceso principal de Electron, orquesta análisis, limpieza, IPC y llamadas a servicios.
    - `electron/preload.js`: define `window.electronAPI` para el renderer (canal seguro de IPC).
- **Servicios Node en la capa Electron:**
  - Carpeta: `services/`
  - Archivos relevantes para el asistente:
    - `services/aiService.js`: orquesta el chat (historial, llamadas al backend, métricas).
    - `services/apiClient.js`: cliente HTTP hacia el backend Flask.
    - `services/systemContextBuilder.js`: construye el contexto del sistema (métricas, último análisis, última limpieza).
    - `services/reportManager.js`: persiste y recupera reportes de análisis/optimización.
    - `services/cleaner.js`: lógica de análisis de archivos basura y limpieza en disco local.
    - `services/actionInterpreter.js`: controla y valida acciones ejecutables desde el chat.

El objetivo de la refactorización ya iniciada es que el “cerebro” conversacional viva solo en el backend, mientras que el frontend/Electron esté limitado a:

- Mostrar mensajes y botones.
- Enviar input del usuario al backend.
- Ejecutar acciones autorizadas (análisis/optimización) de forma segura y controlada.

## 2. `AIChat.jsx` – Interfaz de chat en React

Archivo:

- `src/AIChat.jsx`

Responsabilidades principales:

- Mantener el estado de la conversación en UI:
  - `messages`: lista de mensajes `{ role, message, timestamp, actionSuggestion? }`.
  - `input`: texto actual del usuario.
  - `status`: `"idle" | "thinking" | "recording"`.
  - `mode`: `"analysis" | "optimization" | "hardware"` (modo visual, no el modo clínico del backend).
- Cargar historial cuando se abre el chat:
  - Llama a `window.electronAPI.chatGetHistory()`.
  - Si el historial está vacío:
    - Llama a `window.electronAPI.chatGetGreeting(mode)`.
    - Inserta un mensaje de rol `assistant` con el saludo generado por el backend.
- Enviar mensajes de usuario:
  - `handleSendMessage(text, isAuto = false)`:
    - Añade un mensaje de rol `user` (salvo en envíos automáticos).
    - Cambia `status` a `"thinking"`.
    - Llama a `window.electronAPI.chatSendMessage(text, mode)`.
    - Añade a `messages` el objeto devuelto por Electron, que ya incluye:
      - `role: 'assistant'`
      - `message`: texto de la IA
      - `actionSuggestion`: si el backend propuso una acción (`analyze/clean`).
- Ejecutar acciones desde el chat:
  - `handleExecuteAction(action)`:
    - Notifica a la app (`onActionTrigger`).
    - Llama a `window.electronAPI.chatExecuteAction(action)` para ejecutar la acción en la capa Electron (análisis/optimización).
    - Si la acción tiene éxito:
      - Añade un mensaje de confirmación (“Acción completada”).
      - Dispara un mensaje automático para que la IA resuma el último análisis o la última optimización:
        - Para `action.type === 'analyze'`: pide resumen del último análisis.
        - Para `action.type === 'clean'`: pide resumen de la última optimización.

Puntos clave para la cirugía:

- `AIChat.jsx` ya no contiene lógica conversacional ni reglas de negocio:
  - No decide qué hacer según el texto del usuario.
  - Solo muestra lo que le llega desde `aiService` por IPC, y envía mensajes/acciones.

## 3. `electron/main.js` – Orquestador principal de escritorio

Archivo:

- `electron/main.js`

Responsabilidades:

- Crear y gestionar la ventana principal de la app.
- Configurar IPC (`ipcMain.handle`) para:
  - Análisis del sistema: `analyze-system`.
  - Limpieza: `run-cleanup`.
  - Chat:
    - `chat-get-greeting`: obtiene saludo inicial llamando a `generateGreeting` de `aiService`.
    - `chat-send-message`: envía mensaje del usuario a `aiService.processUserMessage`.
    - `chat-get-history`: pide historial a `aiService.getChatHistory`.
    - `chat-clear-history`: resetea historial con `aiService.clearChatHistory`.
    - `chat-execute-action`: ejecuta acciones recomendadas por la IA (análisis/optimización) tras validarlas con `actionInterpreter`.

Relación con servicios:

- Importa desde `services/aiService.js`:
  - `processUserMessage`
  - `getChatHistory`
  - `clearChatHistory`
  - `generateGreeting`
- Importa desde `services/cleaner.js` funciones para análisis y limpieza.
- Importa desde `services/systemContextBuilder.js` funciones para mantener `lastAnalysis` y `lastCleanup`.
- Importa desde `services/reportManager.js` para guardar reportes tras operaciones de análisis/limpieza.

En el flujo actual, `main.js` es el “coordinador”:

- Recibe eventos de la UI.
- Llama a los servicios (incluyendo el backend Flask).
- Emite actualizaciones de progreso (por ejemplo, durante el análisis).

## 4. `aiService.js` – Lógica de chat en la capa Electron

Archivo:

- `services/aiService.js`

Responsabilidades principales:

- Historial de chat:
  - Archivo JSON en `app.getPath('userData')/chat-history.json`.
  - Funciones:
    - `getChatHistory()`
    - `saveChatEntry(entry)`
    - `clearChatHistory()`
- Métricas de uso de la IA:
  - Archivo `ai-metrics.json` para registrar duración de interacciones y presencia de acciones.
  - Función `logAIMetrics(entry)`.
- Orquestación de mensajes:
  - `processUserMessage(message, mode = 'analysis')`:
    - Construye el contexto con `buildSystemContext(mode)`.
    - Enri­quece el contexto con `reports` desde `reportManager`.
    - Registra el mensaje del usuario en el historial.
    - Llama a `grokChatResponse(message, context)`.
    - Guarda el mensaje de la IA y su acción sugerida en el historial.
    - Registra métricas (tiempo, si hubo acción sugerida).
- Integración con backend IA:
  - `grokChatResponse(userMsg, context)`:
    - Llama a `chatWithAI(userMsg, context)` (cliente HTTP a `/api/chat`).
    - Interpreta la respuesta JSON devuelta por el backend:
      - `message`: texto a mostrar al usuario.
      - `nextAction`: decide si propone un botón “Analizar sistema” o “Optimizar sistema”.
    - No contiene ya lógica de intención ni reglas clínicas: simplemente traduce `nextAction` a:
      - `type: 'analyze'` → botón de análisis.
      - `type: 'optimize'` → botón de limpieza (`type: 'clean'` hacia la capa de acciones).
  - En caso de fallo de red/servidor:
    - Devuelve un mensaje neutro informando que el servicio avanzado de IA no está disponible.
- Saludo inicial:
  - `generateGreeting(mode = 'analysis')`:
    - Construye contexto como en `processUserMessage`.
    - Llama a `chatWithAI('__GREETING__', context)`.
    - Devuelve el `message` proporcionado por el backend.

Punto crítico para la refactorización:

- `aiService.js` se ha convertido en una capa **thin**:
  - No decide el flujo clínico.
  - No define personalidad ni prompt.
  - Solo pasa contexto al backend y transforma la respuesta JSON en objetos que la UI puede usar (`assistantEntry` con `message` y `actionSuggestion`).

## 5. `apiClient.js` – Cliente HTTP hacia el backend

Archivo:

- `services/apiClient.js`

Responsabilidades:

- Definir URLs base:
  - `CLEANMATE_BACKEND_URL` desde entorno o valor por defecto de Render.
  - `API_ANALYZE_URL`, `API_CHAT_URL`, `API_HEALTH_URL`.
- Enviar reportes de análisis al backend:
  - `analyzeSystem(systemStats, cleanupStats)`:
    - Llama a `/api/analyze` con métricas básicas.
- Chat con backend:
  - `chatWithAI(message, context)`:
    - Llama a `/api/chat` con `{ message, context }`.
    - Devuelve el cuerpo de respuesta tal cual:
      - `{ message, nextAction, mode }` en el flujo normal.
    - En errores:
      - Devuelve un objeto por defecto:

        ```json
        {
          "message": "No se pudo conectar con la IA de chat. Verifique su conexión a internet.",
          "nextAction": { "type": "none", "label": "", "autoExecute": false },
          "mode": "CONVERSATION"
        }
        ```
- Healthcheck:
  - `checkAIConnectivity()`:
    - Llama a `/api/ai-health`.
    - Indica si el backend está configurado y accesible.

Este archivo es el único punto de entrada HTTP hacia el backend desde Electron, lo que facilita futuras refactorizaciones y pruebas aisladas.

## 6. `systemContextBuilder.js` – Contexto del sistema

Archivo:

- `services/systemContextBuilder.js`

Responsabilidades:

- Obtener métricas del sistema:
  - CPU, RAM, disco, espacio libre, etc.
- Mantener en memoria el último análisis y la última optimización:
  - `lastAnalysis`
  - `lastCleanup`
- Exponer funciones:
  - `buildSystemContext(mode)`:
    - Devuelve:
      - `systemMetrics`
      - `lastAnalysis` (resumen numérico con MB recuperables, cantidad de archivos, etc.).
      - `lastCleanup` (MB liberados, archivos eliminados, warnings).
  - `updateLastAnalysis(analysis)`
  - `updateLastCleanup(cleanup)`

Relación con la IA:

- Este módulo alimenta tanto:
  - El contexto del chat (`aiService` → backend).
  - El análisis y limpieza locales (usados por `cleaner.js` y `main.js`).

## 7. `reportManager.js` – Historial de reportes

Archivo:

- `services/reportManager.js`

Responsabilidades:

- Guardar reportes de análisis y optimización en un archivo JSON:
  - Ruta en `app.getPath('userData')`.
  - Mantiene solo los N últimos reportes (rotación).
- Leer reportes para:
  - Mostrar historial.
  - Enriquecer el contexto de la IA:
    - `aiService` incorpora `reports` al contexto que se envía a `/api/chat`.

Este módulo permite que la IA tenga memoria histórica de análisis y limpiezas previas, más allá del contexto vivo de `systemContextBuilder`.

## 8. `cleaner.js` – Análisis y limpieza local

Archivo:

- `services/cleaner.js`

Responsabilidades:

- Escanear el sistema:
  - Buscar archivos temporales, cachés, restos de instalaciones, etc.
  - Devolver:
    - `spaceRecoverableMB`
    - `fileCount`
    - `readOnlyFiles`
    - `estimatedPerformanceGain`
- Ejecutar limpieza:
  - Eliminar archivos detectados como basura.
  - Devolver:
    - `freedMB`
    - `filesDeleted`
    - Errores de archivo si los hubiera.

Relación con el chat:

- Cuando la IA sugiere una acción (`analyze` o `optimize`), y el usuario la acepta:
  - `main.js` ejecuta las funciones de `cleaner.js` a través de `chat-execute-action`.
  - Después de la acción, se guarda un reporte con `reportManager`.
  - Se actualiza el contexto con `systemContextBuilder`.
  - La UI dispara mensajes automáticos para que la IA resuma el resultado.

## 9. `actionInterpreter.js` – Seguridad en ejecución de acciones

Archivo:

- `services/actionInterpreter.js`

Responsabilidades:

- Validar las acciones provenientes del chat antes de ejecutarlas:
  - Asegurar que `type` es uno de los conocidos (`analyze`, `clean`, etc.).
  - Ignorar o bloquear acciones no whitelisteadas.
- Evitar que el modelo pueda forzar ejecución de comandos arbitrarios:
  - Aunque el backend sugiera `nextAction`, la capa de Electron es la que decide si se ejecuta y cómo se traduce a llamados concretos a `cleaner.js`.

En combinación con el backend, este módulo implementa un enfoque de “whitelist cerrada”: la IA sugiere tipos de acción de alto nivel, y la implementación ejecuta llamadas predefinidas, nunca comandos generados por texto.

## 10. Resumen para la cirugía de refactorización

Con este mapa, la foto completa del frontend/Electron es:

- `AIChat.jsx`:
  - Solo interfaz y wiring de eventos de usuario / botones.
- `electron/main.js`:
  - Orquestador entre UI, servicios locales y backend.
- `aiService.js`:
  - Capa de chat que persiste historial, construye contexto y delega la conversación al backend.
- `apiClient.js`:
  - Punto único de comunicación HTTP con el backend.
- `systemContextBuilder.js`:
  - Módulo de métricas y contexto vivo (último análisis/optimización).
- `reportManager.js`:
  - Historial persistente de reportes para enriquecer contexto.
- `cleaner.js`:
  - Motor real de análisis/limpieza.
- `actionInterpreter.js`:
  - Guardia de seguridad para ejecución de acciones.

Esto complementa el informe del backend y deja listo el terreno para una refactorización donde:

- El backend siga siendo el único cerebro conversacional.
- Electron/React se limiten a UI + ejecución segura de acciones whitelisteadas.

