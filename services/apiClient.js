const axios = require('axios');
const log = require('electron-log');

const API_ANALYZE_URL = 'https://cleanmateai-backend.onrender.com/api/analyze';
const API_CHAT_URL = 'https://cleanmateai-backend.onrender.com/api/chat';
const API_HEALTH_URL = 'https://cleanmateai-backend.onrender.com/api/ai-health';

async function analyzeSystem(systemStats, cleanupStats) {
    try {
        log.info('Sending report to AI backend...');
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

        const response = await axios.post(API_ANALYZE_URL, payload, { timeout: 8000 });
        log.info('AI Response received successfully');
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
        const payload = {
            message,
            context
        };

        const response = await axios.post(API_CHAT_URL, payload, { timeout: 8000 });
        log.info('Chat AI response received successfully');
        return response.data;
    } catch (error) {
        log.error('Chat API Error:', error.message);
        if (error.response) {
            log.error('Chat API Response Data:', error.response.data);
            log.error('Chat API Status:', error.response.status);
        }
        return {
            choices: [
                {
                    message: {
                        content: "No se pudo conectar con la IA de chat. Verifique su conexión a internet."
                    }
                }
            ]
        };
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

module.exports = { analyzeSystem, chatWithAI, checkAIConnectivity };
