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
    // 1. Build Context
    const context = await buildSystemContext(mode);
    try {
        context.reports = await getReports();
    } catch (e) {
        context.reports = [];
    }

    const metrics = context && context.systemMetrics
        ? context.systemMetrics
        : { cpuLoad: 0, ramUsed: 0 };

    // 2. Save User Message
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

async function grokChatResponse(userMsg, context) {
    const msg = (userMsg || "").toLowerCase();

    const isAnalyze = /\b(analizar|analisis|análisis|escanear|escaneo|scanear|diagnostico|diagnóstico)\b/.test(msg);
    const isClean = /\b(limpiar|limpieza|borrar|eliminar|optimizar|optimizacion|optimización|basura)\b/.test(msg);

    let actionSuggestion = null;

    const lastAnalysis = context && context.lastAnalysis ? context.lastAnalysis : null;
    const lastCleanup = context && context.lastCleanup ? context.lastCleanup : null;

    if (isClean) {
        if (lastAnalysis && lastAnalysis.recoverableMB > 0) {
            actionSuggestion = {
                type: 'clean',
                targets: ['temp', 'cache_chrome', 'cache_edge'],
                label: 'Optimizar sistema',
                description: 'Ejecutar optimización basada en el último análisis'
            };
        } else {
            actionSuggestion = {
                type: 'analyze',
                label: 'Analizar antes de optimizar',
                description: 'Realizar un análisis inicial del sistema'
            };
        }
    } else if (isAnalyze) {
        actionSuggestion = {
            type: 'analyze',
            label: 'Analizar sistema',
            description: 'Ejecutar análisis desde el chat'
        };
    }

    let response = "";

    try {
        const apiResult = await chatWithAI(userMsg, context);
        const choice = apiResult && apiResult.choices && apiResult.choices[0];
        if (choice && choice.message && typeof choice.message.content === 'string' && choice.message.content.trim()) {
            response = choice.message.content;
        } else {
            response = await generateAIResponse(userMsg, context);
        }
    } catch (e) {
        log.error('Fallo en chatWithAI', e);
        response = await generateAIResponse(userMsg, context);
    }

    // Flujo médico: si no hay acción aún, decidir según etapa
    if (!actionSuggestion) {
        if (!lastAnalysis && !lastCleanup) {
            actionSuggestion = {
                type: 'analyze',
                label: 'Analizar sistema',
                description: 'Primer paso recomendado según el estado actual'
            };
        } else if (lastAnalysis && !lastCleanup) {
            actionSuggestion = {
                type: 'clean',
                targets: ['temp', 'cache_chrome', 'cache_edge'],
                label: 'Optimizar sistema',
                description: `Aplicar optimización usando el último análisis (${lastAnalysis.recoverableMB || 0} MB)`
            };
        } else if (lastCleanup) {
            actionSuggestion = {
                type: 'analyze',
                label: 'Revisar de nuevo',
                description: 'Nuevo análisis tras la última optimización'
            };
        }
    }

    return {
        response,
        actionSuggestion
    };
}

// Mock AI Logic - Enhanced with "Natural Persona" and Context Awareness
async function generateAIResponse(userMsg, context) {
    const msg = (userMsg || "").toLowerCase();
    
    // --- 1. Intent Detection Helper ---
    const isGreeting = /\b(hola|buenos|buenas|hey|que tal)\b/.test(msg);
    const isAnalyze = /\b(analizar|analisis|análisis|escanear|escaneo|scanear|verificar|diagnostico|diagnóstico)\b/.test(msg);
    const isClean = /\b(limpiar|limpieza|borrar|eliminar|optimizar|optimizacion|optimización|optimiza|optimice|liberar|liberacion|basura)\b/.test(msg);
    const isSlow = /\b(lento|trabado|pegado|lag|tarda|rapidez|velocidad)\b/.test(msg);
    const isHistory = /\b(historial|reporte|reportes|anterior|pasado|ultimo|último)\b/.test(msg);
    const isThanks = /\b(gracias|agradecido|genial|ok|listo|bueno)\b/.test(msg);
    const isHelp = /\b(ayuda|socorro|que haces|para que sirves)\b/.test(msg);
    const hasExecuteVerb = /\b(ejecuta|ejecutar|haz|haga|realiza|realizar|inicia|iniciar|comienza|comenzar|arranca|arrancar|aplica|aplicar|ya|ahora)\b/.test(msg);
    const isStrongAnalyze = isAnalyze && hasExecuteVerb;
    const isStrongClean = isClean && hasExecuteVerb;

    // --- 2. Persona & Context Variables ---
    const metrics = context && context.systemMetrics
        ? context.systemMetrics
        : { cpuLoad: 0, ramUsed: 0, diskUsed: 0 };
    const { cpuLoad, ramUsed, diskUsed } = metrics;
    const cpuHigh = cpuLoad > 80;
    const ramHigh = ramUsed > 80;
    const diskFull = diskUsed > 90;

    const lastAnalysis = context && context.lastAnalysis ? context.lastAnalysis : null;
    const reports = context && Array.isArray(context.reports) ? context.reports : [];
    
    // Natural conversation starters
    const openers = [
        "¡Hola! Soy tu asistente CleanMate.",
        "Aquí estoy para ayudarte con tu PC.",
        "¡Qué bueno verte por aquí!"
    ];

    let response = "";
    let actionSuggestion = null;

    // --- 3. Logic Engine ---
    // 3.1 Intentos fuertes: el usuario pide ejecutar directamente
    if (isStrongClean) {
        if (lastAnalysis && lastAnalysis.recoverableMB > 0) {
            response = `Perfecto, voy a ejecutar la optimización ahora mismo sobre lo que ya analizamos. 🧹\n\nSi notas algo raro, siempre puedes volver a escribirme.`;
            actionSuggestion = {
                type: 'clean',
                targets: ['temp', 'cache_chrome', 'cache_edge'],
                label: 'Optimizar sistema',
                description: `Optimización solicitada por el usuario`,
                autoExecute: true
            };
        } else {
            response = `Puedo optimizar tu sistema, pero antes necesito hacer un análisis rápido para no tocar nada sensible. Empezaré con un escaneo y luego continúo con la limpieza.`;
            actionSuggestion = {
                type: 'analyze',
                label: 'Analizar y optimizar',
                description: 'Escaneo previo antes de limpiar',
                autoExecute: true
            };
        }
    } else if (isStrongAnalyze) {
        response = `Entendido, iniciaré un análisis completo de tu sistema ahora mismo para ver qué podemos mejorar.`;
        actionSuggestion = {
            type: 'analyze',
            label: 'Iniciar análisis',
            description: 'Análisis solicitado por el usuario',
            autoExecute: true
        };
    } else if (isGreeting) {
        const status = (cpuHigh || ramHigh || diskFull) 
            ? "Veo que tu sistema está trabajando duro hoy." 
            : "Tu sistema se ve bastante tranquilo por ahora.";
        
        response = `${openers[Math.floor(Math.random() * openers.length)]} ${status}
        
📊 **Vistazo Rápido:**
• CPU: ${cpuLoad}% ${cpuHigh ? '🔥' : '✅'}
• RAM: ${ramUsed}% ${ramHigh ? '⚠️' : '✅'}
• Disco: ${diskUsed}% ${diskFull ? '⛔' : '✅'}

¿Te gustaría que hagamos un chequeo más profundo?`;

        actionSuggestion = { type: 'analyze', label: 'Hacer Chequeo', description: 'Revisión rápida' };

    } else if (isAnalyze) {
        response = "¡Entendido! Me pondré mi gorra de detective 🕵️‍♂️. \n\nVoy a buscar archivos temporales, cachés olvidados y cosas que están ocupando espacio sin pagar renta. ¿Me das luz verde para escanear?";
        actionSuggestion = {
            type: 'analyze',
            label: 'Iniciar Escaneo',
            description: 'Buscar archivos basura'
        };

    } else if (isClean) {
        if (lastAnalysis && lastAnalysis.recoverableMB > 0) {
            response = `¡Manos a la obra! 🧹\n\nSegún lo que vi, podemos recuperar unos **${lastAnalysis.recoverableMB} MB**. Eso le dará un respiro a tu disco. ¿Procedemos con la limpieza?`;
            actionSuggestion = {
                type: 'clean',
                targets: ['temp', 'cache_chrome', 'cache_edge'],
                label: 'Ejecutar Limpieza',
                description: `Liberar ~${context.lastAnalysis.recoverableMB} MB`
            };
        } else {
            response = "¡Claro! Pero para no borrar nada importante a ciegas, primero necesito echar un vistazo rápido. ¿Hacemos un escaneo primero?";
            actionSuggestion = { type: 'analyze', label: 'Escanear Primero', description: 'Por seguridad' };
        }

    } else if (isSlow || isHelp) {
        if (ramHigh) {
            response = "Uff, sí... noto que tu memoria RAM está sudando (está al " + ramUsed + "%). 😰\n\n**Mi consejo:**\n1. Cierra las pestañas del navegador que no uses.\n2. Déjame limpiar los archivos temporales para aligerar la carga.\n\n¿Te ayudo con la limpieza?";
            actionSuggestion = { type: 'analyze', label: 'Analizar para Optimizar', description: 'Aligerar sistema' };
        } else if (diskFull) {
            response = "El problema podría ser tu disco duro. Está casi lleno (" + diskUsed + "%). Cuando el disco se llena, todo se mueve en cámara lenta. 🐢\n\n¡Necesitamos liberar espacio urgente!";
            actionSuggestion = { type: 'analyze', label: 'Liberar Espacio', description: 'Urgente: Disco Lleno' };
        } else {
            response = "Tu hardware parece estar bien en los números (CPU y RAM normales), pero a veces la 'basura digital' oculta ralentiza todo. \n\nPropongo hacer una limpieza de mantenimiento. ¿Qué dices?";
            actionSuggestion = { type: 'analyze', label: 'Mantenimiento Preventivo', description: 'Optimizar flujo' };
        }

    } else if (isHistory) {
        if (reports && reports.length > 0) {
            const last = reports[0];
            if (last.type === 'cleanup' && last.stats) {
                response = `Haciendo memoria... 🤔\n\nLa última vez (el ${new Date(last.timestamp).toLocaleDateString()}) eliminamos **${last.stats.filesDeleted} archivos** y recuperamos **${last.stats.freedMB} MB**. ¡Fue un buen trabajo!`;
            } else {
                const detectedMB = last.stats?.spaceRecoverableMB ?? 0;
                const detectedFiles = last.stats?.fileCount ?? 0;
                response = `Revisando registros... 📚\n\nEn el último análisis (el ${new Date(last.timestamp).toLocaleDateString()}) detectamos aproximadamente **${detectedMB} MB** potencialmente recuperables en **${detectedFiles} archivos**.`;
            }
        } else {
            response = "Aún no tenemos historias de batallas pasadas. ¡Esta podría ser nuestra primera victoria contra los archivos basura! ¿Empezamos?";
            actionSuggestion = { type: 'analyze', label: 'Iniciar Misión', description: 'Primer análisis' };
        }

    } else if (isThanks) {
        response = "¡De nada! Es un placer mantener tu PC en forma. Si notas cualquier otra cosa rara, aquí estaré. 👋";

    } else {
        // --- 4. Off-Topic / Fallback Handler (The "Affectionate Guide") ---
        const offTopicResponses = [
            "Me encanta tu curiosidad, pero mi cerebro digital está diseñado específicamente para cuidar de tu PC. 🖥️ ¿Volvemos a revisar por qué tu sistema podría ir más rápido?",
            "¡Qué tema tan interesante! Aunque confieso que me pierdo un poco si no hablamos de Gigabytes y procesadores. 😅 ¿Te parece si nos enfocamos en optimizar tu equipo?",
            "Aprecio la charla, de verdad. Pero soy un especialista en rendimiento y limpieza, y no quisiera darte consejos equivocados sobre otros temas. ¿Cómo sientes la velocidad de tu PC hoy?",
            "Ay, me encantaría saber de eso, pero mis circuitos solo entienden de optimización y limpieza. 🧹 Regresemos a lo nuestro: ¿Te gustaría hacer un análisis rápido?"
        ];
        
        response = offTopicResponses[Math.floor(Math.random() * offTopicResponses.length)];
        
        // Always offer a way back to the main path
        if (!actionSuggestion) {
             actionSuggestion = { type: 'analyze', label: 'Ver Estado del PC', description: 'Volver al tema' };
        }
    }

    return {
        response,
        actionSuggestion
    };
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
    const metrics = context.systemMetrics || { cpuLoad: 0, ramUsed: 0, diskUsed: 0 };
    const lastAnalysis = context.lastAnalysis || null;
    const lastCleanup = context.lastCleanup || null;
    let greeting = `Hola. Estoy listo para asistirte en modo ${mode === 'optimization' ? 'Optimización' : mode === 'hardware' ? 'Hardware' : 'Análisis'}.`;

    if (!lastAnalysis && !lastCleanup) {
        if (metrics.diskUsed > 90 || metrics.cpuLoad > 80 || metrics.ramUsed > 80) {
            greeting += ` Veo que tu sistema está muy exigido (CPU ${metrics.cpuLoad}%, RAM ${metrics.ramUsed}%, disco ${metrics.diskUsed}%). El primer paso recomendado es ejecutar un ANÁLISIS completo usando el botón "Análisis".`;
        } else {
            greeting += ` Tu sistema parece estable (CPU: ${metrics.cpuLoad}%, RAM: ${metrics.ramUsed}%). Aun así, el primer paso es un análisis rápido con el botón "Análisis" para ver oportunidades de mejora.`;
        }
    } else if (lastAnalysis && !lastCleanup) {
        greeting += ` Ya tengo un análisis reciente con aproximadamente ${lastAnalysis.recoverableMB || 0} MB recuperables. El siguiente paso recomendado es OPTIMIZAR con el botón "Optimización".`;
    } else if (lastCleanup) {
        greeting += ` Tu última optimización liberó ${lastCleanup.freedMB || 0} MB y eliminó ${lastCleanup.filesDeleted || 0} archivos. Desde aquí podemos revisar dudas o hacer un nuevo análisis cuando quieras.`;
    }

    return greeting;
}
