const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');
const log = require('electron-log');
const { buildSystemContext } = require('./systemContextBuilder');
const { interpretAction } = require('./actionInterpreter');
const { analyzeSystem: apiAnalyze } = require('./apiClient'); 
const { getReports } = require('./reportManager');

const HISTORY_FILE = path.join(app.getPath('userData'), 'chat-history.json');
const METRICS_FILE = path.join(app.getPath('userData'), 'ai-metrics.json');
const MAX_HISTORY = 50;

// Initialize history file
if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeJsonSync(HISTORY_FILE, []);
}

async function logAIMetrics(entry) {
    try {
        let metrics = [];
        try {
            metrics = await fs.readJson(METRICS_FILE);
        } catch (e) { }
        
        metrics.push({ timestamp: new Date().toISOString(), ...entry });
        // Keep metrics file from growing too large (e.g., last 1000 entries)
        if (metrics.length > 1000) metrics.splice(0, metrics.length - 1000);
        
        await fs.writeJson(METRICS_FILE, metrics);
    } catch (e) {
        log.error('Failed to log AI metrics', e);
    }
}

async function getChatHistory() {
    try {
        return await fs.readJson(HISTORY_FILE);
    } catch (e) {
        return [];
    }
}

async function saveChatEntry(entry) {
    try {
        const history = await getChatHistory();
        history.push(entry);
        
        // Trim history
        if (history.length > MAX_HISTORY) {
            history.splice(0, history.length - MAX_HISTORY);
        }
        
        await fs.writeJson(HISTORY_FILE, history);
    } catch (e) {
        log.error('Failed to save chat history:', e);
    }
}

async function clearChatHistory() {
    await fs.writeJson(HISTORY_FILE, []);
}

async function processUserMessage(message, mode = 'analysis') {
    const startTime = Date.now();
    // 1. Build Context
    const context = await buildSystemContext(mode);
    try {
        context.reports = await getReports();
    } catch (e) {
        context.reports = [];
    }

    // 2. Save User Message
    const userEntry = {
        timestamp: new Date().toISOString(),
        role: 'user',
        message: message,
        contextSnapshot: { // Save minimal context for reference
            cpu: context.systemMetrics.cpuLoad,
            ram: context.systemMetrics.ramUsed
        }
    };
    await saveChatEntry(userEntry);

    // 3. Call AI (Mocked for now, but structured for replacement)
    // In a real scenario, we would send 'context' + 'message' + 'recent history' to OpenAI/Grok
    const aiResponse = await generateAIResponse(message, context);

    // 4. Save Assistant Message
    const assistantEntry = {
        timestamp: new Date().toISOString(),
        role: 'assistant',
        message: aiResponse.response,
        actionSuggestion: aiResponse.actionSuggestion || null
    };
    await saveChatEntry(assistantEntry);

    // Log Metrics
    const duration = Date.now() - startTime;
    logAIMetrics({
        type: 'interaction',
        mode,
        duration,
        hasAction: !!aiResponse.actionSuggestion
    });

    return assistantEntry;
}

// Mock AI Logic - Replace with real API call later
async function generateAIResponse(userMsg, context) {
    const msg = userMsg.toLowerCase();
    let response = "";
    let actionSuggestion = null;

    // Default response if no intent is matched
    response = "Entendido. ¿En qué más puedo ayudarte?";

    // 1. Analyze Intent
    if (msg.includes('hola') || msg.includes('buenos') || msg.includes('inicio')) {
        response = `¡Hola! He analizado tu sistema en modo **${context.mode}**.
        
📊 **Estado Actual:**
- CPU: ${context.systemMetrics.cpuLoad}%
- RAM: ${context.systemMetrics.ramUsed}%
- Disco: ${context.systemMetrics.diskUsed}%

¿Quieres que busquemos archivos basura o tienes alguna consulta específica?`;
        
        if (context.systemMetrics.diskUsed > 90) {
            response += "\n\n⚠️ **Alerta:** Tu disco está muy lleno. Recomiendo un análisis urgente.";
            actionSuggestion = { type: 'analyze', label: 'Iniciar Análisis Urgente', description: 'Disco Crítico (>90%)' };
        } else if (context.mode === 'optimization') {
             response += "\n\nEn modo optimización puedo sugerirte cerrar procesos o limpiar cachés profundos.";
        }

    } else if (msg.includes('analizar') || msg.includes('escanear') || msg.includes('buscar') || msg.includes('basura')) {
        response = "Puedo iniciar un análisis completo de archivos temporales, caché de navegadores (Chrome/Edge) y logs del sistema.\n\nEste proceso es seguro y no borra tus documentos personales. ¿Te gustaría proceder?";
        actionSuggestion = {
            type: 'analyze',
            label: 'Iniciar Análisis',
            description: 'Escanear sistema en busca de archivos basura'
        };

    } else if (msg.includes('limpiar') || msg.includes('borrar') || msg.includes('optimizar') || msg.includes('eliminar')) {
        if (context.lastAnalysis && context.lastAnalysis.recoverableMB > 0) {
            response = `Según el último análisis, podemos recuperar **${context.lastAnalysis.recoverableMB} MB**.
            
Esto incluye:
- Archivos Temporales
- Caché de Chrome/Edge
- Logs de Windows

¿Ejecuto la limpieza ahora?`;
            actionSuggestion = {
                type: 'clean',
                targets: ['temp', 'cache_chrome', 'cache_edge'],
                label: 'Ejecutar Limpieza',
                description: `Liberar ~${context.lastAnalysis.recoverableMB} MB`
            };
        } else {
            response = "Para limpiar de forma segura, primero necesito realizar un análisis reciente y identificar qué archivos se pueden borrar sin riesgo. ¿Quieres que lo haga?";
            actionSuggestion = { type: 'analyze', label: 'Analizar Primero', description: 'Detectar archivos basura' };
        }

    } else if (msg.includes('plan') || msg.includes('recomendacion') || msg.includes('recomendar') || msg.includes('sugerencia')) {
        if (context.mode === 'optimization') {
             response = `📋 **Plan de Optimización Sugerido:**

1. **Limpieza de Disco:** Detectar y borrar archivos temporales (se puede hacer ahora).
2. **Gestión de Inicio:** Revisa qué apps inician con Windows (puedes hacerlo desde el Administrador de Tareas).
3. **Liberar RAM:** Cierra pestañas de navegador inactivas.

¿Quieres empezar por el paso 1 (Limpieza)?`;
             actionSuggestion = { type: 'analyze', label: 'Comenzar Limpieza', description: 'Paso 1 del Plan' };
        } else {
             response = "Para darte un plan personalizado, necesito saber tu objetivo. ¿Buscas liberar espacio en disco o mejorar la velocidad (FPS/RAM)?";
        }
    } else if (msg.includes('historial') || msg.includes('ultimo reporte') || msg.includes('cuando limpie') || msg.includes('anterior')) {
        if (context.reports && context.reports.length > 0) {
            const last = context.reports[0];
            response = `📋 **Último Reporte (${new Date(last.timestamp).toLocaleDateString()}):**
            
✅ Se liberaron **${last.stats.freedMB} MB**
📂 Archivos eliminados: **${last.stats.filesDeleted}**

¿Quieres ver más detalles en la sección de historial?`;
        } else {
            response = "No tengo registros de limpiezas anteriores. ¿Te gustaría realizar el primer análisis ahora?";
            actionSuggestion = { type: 'analyze', label: 'Iniciar Análisis', description: 'Primer escaneo' };
        }

    } else if (msg.includes('lento') || msg.includes('rendimiento') || msg.includes('trabado')) {
        if (context.systemMetrics.ramUsed > 80) {
            response = `Noto que tu RAM está al **${context.systemMetrics.ramUsed}%**, lo cual es alto.
            
🔹 **Sugerencia:** Cierra aplicaciones pesadas como navegadores con muchas pestañas o editores de video.
🔹 **Acción:** Puedo limpiar la caché para intentar liberar algo de carga.`;
        } else {
            response = "Tu consumo de recursos parece normal (CPU y RAM estables). Si sientes lentitud, podría ser por fragmentación del disco o drivers desactualizados. Una limpieza de temporales suele ayudar.";
            actionSuggestion = { type: 'analyze', label: 'Limpiar Temporales', description: 'Mejorar respuesta del sistema' };
        }
    } else {
        // Fallback with context awareness
        if (context.mode === 'hardware') {
            response = `Entendido. En modo Hardware puedo darte detalles sobre tu CPU, RAM y Disco.
            
- CPU: ${context.systemMetrics.cpuLoad}%
- RAM: ${context.systemMetrics.ramUsed}%
- Disco Libre: ${context.systemMetrics.diskFreeGB} GB

¿Necesitas más detalles técnicos?`;
        } else {
            response = "Entendido. ¿Te gustaría realizar un análisis del sistema, optimizar el rendimiento o consultar el estado de tu hardware?";
             actionSuggestion = { type: 'analyze', label: 'Ver Estado del Sistema', description: 'Análisis rápido' };
        }
    }

    return { response, actionSuggestion };
}

module.exports = { 
    processUserMessage, 
    getChatHistory, 
    clearChatHistory,
    generateAIResponse, // Exported for testing/direct use
    generateGreeting
};

async function generateGreeting(mode = 'analysis') {
    const context = await buildSystemContext(mode);
    let greeting = `Hola. Estoy listo para asistirte en modo ${mode === 'optimization' ? 'Optimización' : mode === 'hardware' ? 'Hardware' : 'Análisis'}.`;

    if (context.systemMetrics.diskUsed > 90) {
        greeting += ` ⚠️ Atención: Tu disco está al ${context.systemMetrics.diskUsed}%. Te sugiero liberar espacio urgentemente.`;
    } else if (context.lastAnalysis && context.lastAnalysis.recoverableMB > 1000) {
        greeting += ` Detecté ${context.lastAnalysis.recoverableMB} MB recuperables del último análisis. ¿Procedemos?`;
    } else {
        greeting += ` Tu sistema parece estable (CPU: ${context.systemMetrics.cpuLoad}%, RAM: ${context.systemMetrics.ramUsed}%). ¿En qué puedo ayudarte hoy?`;
    }

    return greeting;
}
