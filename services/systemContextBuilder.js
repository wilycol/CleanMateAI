const system = require('systeminformation');
const os = require('os');
const { app } = require('electron');
const fs = require('fs-extra');
const path = require('path');

// Cache last analysis/cleanup results
let lastAnalysis = null;
let lastCleanup = null;

function updateLastAnalysis(analysis) {
    lastAnalysis = analysis;
}

function updateLastCleanup(cleanup) {
    lastCleanup = cleanup;
}

async function buildSystemContext(mode = 'analysis') {
    try {
        const [cpu, mem, disk] = await Promise.all([
            system.currentLoad(),
            system.mem(),
            system.fsSize()
        ]);

        const mainDisk = disk[0] || {};
        const isAdmin = process.platform === 'win32' ? require('child_process').execSync('net session', { stdio: 'ignore' }) : false;

        return {
            mode: mode,
            timestamp: new Date().toISOString(),
            appVersion: app.getVersion(),
            os: {
                platform: os.platform(),
                release: os.release(),
                arch: os.arch()
            },
            admin: !!isAdmin,
            systemMetrics: {
                cpuLoad: Math.round(cpu.currentLoad),
                ramUsed: Math.round((mem.active / mem.total) * 100),
                diskUsed: Math.round(mainDisk.use || 0),
                diskFreeGB: Math.round((mainDisk.available || 0) / (1024 * 1024 * 1024))
            },
            lastAnalysis: lastAnalysis ? {
                recoverableMB: lastAnalysis.spaceRecoverableMB,
                fileCount: lastAnalysis.fileCount,
                readOnlyCount: lastAnalysis.readOnlyFiles?.length || 0
            } : null,
            lastCleanup: lastCleanup ? {
                freedMB: lastCleanup.freedMB,
                filesDeleted: lastCleanup.filesDeleted,
                warnings: lastCleanup.warnings || []
            } : null
        };
    } catch (error) {
        console.error('Error building system context:', error);
        return {
            mode: mode,
            error: "Could not retrieve full system context"
        };
    }
}

module.exports = { buildSystemContext, updateLastAnalysis, updateLastCleanup };
