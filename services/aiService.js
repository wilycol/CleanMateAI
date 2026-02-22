const fs = require('fs-extra');
const path = require('path');
const { app } = require('electron');
const log = require('electron-log');
const { buildSystemContext } = require('./systemContextBuilder');
const { interpretAction } = require('./actionInterpreter');
const { chatWithAI } = require('./apiClient'); 
const { getReports } = require('./reportManager');

const HISTORY_FILE = path.join(app.getPath('userData'), 'chat-history.json');
const METRICS_FILE = path.join(app.getPath('userData'), 'ai-metrics.json');
const MAX_HISTORY = 50;

try {
    if (!fs.existsSync(HISTORY_FILE)) {
        fs.writeJsonSync(HISTORY_FILE, []);
    }
} catch (e) {
    log.error('Failed to initialize chat history file', e);
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
    try {
        await fs.ensureDir(path.dirname(HISTORY_FILE));
        await fs.writeJson(HISTORY_FILE, []);
        return true;
    } catch (e) {
        log.error('Failed to clear chat history (writeJson)', e);
        try {
            await fs.remove(HISTORY_FILE);
            await fs.writeJson(HISTORY_FILE, []);
            return true;
        } catch (e2) {
            log.error('Failed to clear chat history (remove+recreate)', e2);
            return false;
        }
    }
}

async function processUserMessage(message, mode = 'analysis') {
    const startTime = Date.now();
    const context = await buildSystemContext('analysis');
    try {
        context.reports = await getReports();
    } catch (e) {
        context.reports = [];
    }

    const metrics = context && context.systemMetrics
        ? context.systemMetrics
        : { cpuLoad: 0, ramUsed: 0 };

    const userEntry = {
        timestamp: new Date().toISOString(),
        role: 'user',
        message: message,
        contextSnapshot: { // Save minimal context for reference
            cpu: metrics.cpuLoad,
            ram: metrics.ramUsed
        }
    };
    await saveChatEntry(userEntry);

    const aiResponse = await grokChatResponse(message, context);

    const assistantEntry = {
        timestamp: new Date().toISOString(),
        role: 'assistant',
        message: aiResponse.response,
        actionSuggestion: aiResponse.actionSuggestion || null,
        mode: aiResponse.mode || null,
        sessionState: aiResponse.sessionState || null
    };
    await saveChatEntry(assistantEntry);

    const duration = Date.now() - startTime;
    logAIMetrics({
        type: 'interaction',
        mode: 'analysis',
        duration,
        hasAction: !!aiResponse.actionSuggestion
    });

    return assistantEntry;
}

async function grokChatResponse(userMsg, context) {
    let actionSuggestion = null;
    let response = "";
    let mode = null;
    let sessionState = null;

    try {
        const apiResult = await chatWithAI(userMsg, context);
        const message = apiResult && typeof apiResult.message === 'string'
            ? apiResult.message
            : "";
        const nextAction = apiResult && apiResult.nextAction ? apiResult.nextAction : null;
        mode = apiResult && apiResult.mode ? apiResult.mode : null;
        sessionState = apiResult && apiResult.sessionState ? apiResult.sessionState : null;

        response = message || "No se recibió una respuesta válida del asistente remoto.";

        if (nextAction && nextAction.type && nextAction.type !== 'none') {
            if (nextAction.type === 'analyze') {
                actionSuggestion = {
                    type: 'analyze',
                    label: nextAction.label || 'Analizar sistema',
                    description: 'Ejecutar análisis recomendado por el asistente'
                };
            } else if (nextAction.type === 'optimize') {
                actionSuggestion = {
                    type: 'clean',
                    targets: ['temp', 'cache_chrome', 'cache_edge'],
                    label: nextAction.label || 'Optimizar sistema',
                    description: 'Ejecutar optimización recomendada por el asistente'
                };
            }
        }
    } catch (e) {
        log.error('Fallo en chatWithAI', e);
        response = "En este momento no puedo conectar con el servicio avanzado de IA. Puedes seguir usando los botones principales de análisis y optimización de la aplicación.";
        actionSuggestion = null;
    }

    return {
        response,
        actionSuggestion,
        mode,
        sessionState
    };
}

module.exports = { 
    processUserMessage, 
    getChatHistory, 
    clearChatHistory,
    generateGreeting
};

async function generateGreeting(mode = 'analysis') {
    const context = await buildSystemContext(mode);
    try {
        context.reports = await getReports();
    } catch (e) {
        context.reports = [];
    }
    try {
        const apiResult = await chatWithAI('__GREETING__', context);
        if (apiResult && typeof apiResult.message === 'string' && apiResult.message.trim()) {
            return apiResult.message;
        }
    } catch (e) {
        log.error('Fallo en chatWithAI (greeting)', e);
    }
    return 'Hola. ¿En qué puedo ayudarte hoy?';
}
