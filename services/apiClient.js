const axios = require('axios');
const log = require('electron-log');

const BASE = process.env.CLEANMATE_BACKEND_URL || 'https://cleanmateai-backend.onrender.com';
const API_ANALYZE_URL = `${BASE}/api/analyze`;
const API_CHAT_URL = `${BASE}/api/chat`;
const API_CHAT_START_URL = `${BASE}/api/chat/start`;
const API_CHAT_MESSAGE_URL = `${BASE}/api/chat/message`;
const API_SYSTEM_EXECUTED_URL = `${BASE}/api/system/executed`;
const API_HEALTH_URL = `${BASE}/api/ai-health`;

let chatSessionId = null;

async function analyzeSystem(systemStats, cleanupStats) {
    try {
        log.info('Sending report to AI backend...');
        const startedAt = Date.now();
        const payload = {
            system_info: {
                cpu: systemStats.cpu,
                ram_percent: systemStats.ram,
                disk_percent: systemStats.disk
            },
            cleanup_info: {
                last_cleanup: new Date().toISOString(),
                freed_mb: cleanupStats.freedMB,
                files_deleted: cleanupStats.filesDeleted
            }
        };

        const response = await axios.post(API_ANALYZE_URL, payload, { timeout: 30000 });
        const responseTimeMs = Date.now() - startedAt;
        log.info(`AI analyze response received successfully in ${responseTimeMs}ms`);
        return response.data;
    } catch (error) {
        log.error('API Error:', error.message);
        if (error.response) {
            log.error('API Response Data:', error.response.data);
            log.error('API Status:', error.response.status);
        }
        return {
            choices: [
                {
                    message: {
                        content: "No se pudo conectar con la IA. Verifique su conexión a internet."
                    }
                }
            ]
        };
    }
}

async function chatWithAI(message, context) {
    try {
        log.info('Sending chat to AI backend...');
        if (!chatSessionId) {
            const chatStartStartedAt = Date.now();
            const startRes = await axios.post(API_CHAT_START_URL, {}, { timeout: 30000 });
            if (startRes && startRes.data && startRes.data.sessionId) {
                chatSessionId = startRes.data.sessionId;
            }
            const chatStartResponseTimeMs = Date.now() - chatStartStartedAt;
            log.info(`Chat session start response received in ${chatStartResponseTimeMs}ms`);
        }

        const payload = {
            sessionId: chatSessionId,
            userMessage: message,
            context
        };

        const chatMessageStartedAt = Date.now();
        const response = await axios.post(API_CHAT_MESSAGE_URL, payload, { timeout: 30000 });
        const chatMessageResponseTimeMs = Date.now() - chatMessageStartedAt;
        log.info(`Chat AI response received successfully in ${chatMessageResponseTimeMs}ms`);
        return response.data;
    } catch (error) {
        log.error('Chat API Error:', error.message);
        if (error.response) {
            log.error('Chat API Response Data:', error.response.data);
            log.error('Chat API Status:', error.response.status);
        }
        chatSessionId = null;
        return {
            message: "No se pudo conectar con la IA de chat. Verifique su conexión a internet.",
            nextAction: {
                type: "none",
                label: "",
                autoExecute: false
            },
            mode: "CONVERSATION"
        };
    }
}

async function notifySystemExecuted(type, report) {
    try {
        const payload = { type, report };
        await axios.post(API_SYSTEM_EXECUTED_URL, payload, { timeout: 5000 });
    } catch (error) {
        log.error('System executed notify error:', error.message);
        if (error.response) {
            log.error('System executed response data:', error.response.data);
            log.error('System executed status:', error.response.status);
        }
    }
}

async function checkAIConnectivity() {
    const result = {
        backend: false,
        analyze: false,
        chat: false,
        lastChecked: new Date().toISOString(),
        lastChatError: null,
        lastAnalyzeError: null
    };
    try {
        const res = await axios.get(API_HEALTH_URL, { timeout: 4000 });
        const data = res && res.data ? res.data : {};
        const configured = !!data.gemini_configured;
        result.chat = configured;
        result.analyze = configured;
        result.backend = configured;
    } catch (e) {
        result.backend = false;
        result.chat = false;
        result.analyze = false;
        result.lastChatError = e && e.message ? e.message : 'unknown';
        result.lastAnalyzeError = e && e.message ? e.message : 'unknown';
        log.warn('Connectivity check (health) failed:', e.message);
    }
    return result;
}

module.exports = { analyzeSystem, chatWithAI, checkAIConnectivity, notifySystemExecuted };
