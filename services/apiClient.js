const axios = require('axios');
const log = require('electron-log');

const API_ANALYZE_URL = 'https://cleanmateai-backend.onrender.com/api/analyze';
const API_CHAT_URL = 'https://cleanmateai-backend.onrender.com/api/chat';

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

    const isReachable = (err) => {
        return !!(err && err.response && typeof err.response.status === 'number');
    };

    try {
        const res = await axios.post(API_CHAT_URL, { message: '__health_check__', context: { ping: true } }, { timeout: 5000 });
        const content = res && res.data && res.data.choices && res.data.choices[0] && res.data.choices[0].message && res.data.choices[0].message.content;
        if (typeof content === 'string' && content.trim().length > 0 && content.indexOf('No se pudo conectar con la IA') === -1) {
            result.chat = true;
        } else {
            result.chat = false;
            result.lastChatError = 'Respuesta vacía o fallback';
        }
    } catch (e) {
        result.chat = false;
        result.lastChatError = e && e.response && e.response.data ? JSON.stringify(e.response.data) : (e && e.message ? e.message : 'unknown');
        log.warn('Connectivity check (chat) failed:', e.message);
    }

    try {
        const res = await axios.post(API_ANALYZE_URL, { system_info: {}, cleanup_info: {} }, { timeout: 4000 });
        if (res && typeof res.status === 'number') {
            result.analyze = res.status >= 200 && res.status < 500;
        } else {
            result.analyze = false;
        }
    } catch (e) {
        if (isReachable(e)) {
            result.analyze = true;
        }
        result.lastAnalyzeError = e && e.response && e.response.data ? JSON.stringify(e.response.data) : (e && e.message ? e.message : 'unknown');
        log.warn('Connectivity check (analyze) failed:', e.message);
    }

    result.backend = result.chat || result.analyze;
    return result;
}

module.exports = { analyzeSystem, chatWithAI, checkAIConnectivity };
