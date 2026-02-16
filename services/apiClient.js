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

        const response = await axios.post(API_ANALYZE_URL, payload);
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

        const response = await axios.post(API_CHAT_URL, payload);
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

module.exports = { analyzeSystem, chatWithAI };
