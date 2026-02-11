const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');
const log = require('electron-log');
const { buildSystemContext } = require('./systemContextBuilder');
const { interpretAction } = require('./actionInterpreter');
const { analyzeSystem: apiAnalyze } = require('./apiClient'); // Reuse existing API client logic if possible or mock

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
    let response = "Entendido. ¿En qué más puedo ayudarte?";
    let actionSuggestion = null;

    if (msg.includes('hola') || msg.includes('inicio')) {
        response = `¡Hola! He analizado tu sistema. Tu CPU está al ${context.systemMetrics.cpuLoad}% y el disco al ${context.systemMetrics.diskUsed}%. ¿Quieres que busquemos archivos basura?`;
        if (context.systemMetrics.diskUsed > 90) {
            response += " ⚠️ Tu disco está muy lleno.";
        }
    } else if (msg.includes('analizar') || msg.includes('escanear')) {
        response = "Puedo iniciar un análisis completo de archivos temporales, caché y logs. ¿Te gustaría proceder?";
        actionSuggestion = {
            type: 'analyze',
            label: 'Iniciar Análisis',
            description: 'Escanear sistema en busca de archivos basura'
        };
    } else if (msg.includes('limpiar') || msg.includes('borrar')) {
        if (context.lastAnalysis && context.lastAnalysis.recoverableMB > 0) {
            response = `Según el último análisis, podemos recuperar ${context.lastAnalysis.recoverableMB} MB. Esto incluye caché de navegadores y temporales. ¿Ejecuto la limpieza?`;
            actionSuggestion = {
                type: 'clean',
                targets: ['temp', 'cache_chrome', 'cache_edge'],
                label: 'Ejecutar Limpieza',
                description: `Liberar ~${context.lastAnalysis.recoverableMB} MB`
            };
        } else {
            response = "Primero deberíamos hacer un análisis para ver qué se puede borrar. ¿Quieres que lo haga?";
            actionSuggestion = { type: 'analyze', label: 'Analizar Primero', description: 'Detectar archivos basura' };
        }
    } else if (msg.includes('lento') || msg.includes('rendimiento')) {
        if (context.systemMetrics.ramUsed > 80) {
            response = `Noto que tu RAM está al ${context.systemMetrics.ramUsed}%. Cerrar aplicaciones en segundo plano ayudaría. También puedo limpiar la caché para liberar carga.`;
        } else {
            response = "Tu consumo de recursos parece normal. Si sientes lentitud, podría ser por archivos temporales acumulados o fragmentación.";
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
