const axios = require('axios');
const log = require('electron-log');

// Production URL for Render Backend
const API_URL = 'https://cleanmateai-backend.onrender.com/api/analyze';

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

        const response = await axios.post(API_URL, payload);
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

module.exports = { analyzeSystem };
