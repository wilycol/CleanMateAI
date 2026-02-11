const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const log = require('electron-log');
const { execSync } = require('child_process');

function isAdmin() {
    try {
        execSync('net session', { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
}

async function cleanSystem() {
    log.info('Starting system cleanup...');
    const isElevated = isAdmin();
    log.info(`Process elevated (Admin): ${isElevated}`);

    let freedBytes = 0;
    let filesDeleted = 0;
    const errors = [];

    const pathsToClean = [
        path.join(os.tmpdir()), // %TEMP%
        path.join(os.homedir(), 'AppData', 'Local', 'Temp'),
        // Chrome Cache
        path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
        // Edge Cache
        path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache')
    ];

    // Windows Logs - Only if Admin
    const winLogsPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'Logs');
    if (isElevated) {
        pathsToClean.push(winLogsPath);
        log.info('Admin privileges detected. Including Windows Logs in cleanup.');
    } else {
        log.warn('No Admin privileges. Skipping Windows Logs cleanup.');
    }

    for (const p of pathsToClean) {
        if (fs.existsSync(p)) {
            try {
                const files = await fs.readdir(p);
                for (const file of files) {
                    const curPath = path.join(p, file);
                    try {
                        const stat = await fs.stat(curPath);
                        if (stat.isFile()) {
                            await fs.unlink(curPath);
                            freedBytes += stat.size;
                            filesDeleted++;
                        } else if (stat.isDirectory()) {
                            await fs.remove(curPath);
                            filesDeleted++;
                        }
                    } catch (e) {
                        // Ignore individual permission errors
                    }
                }
            } catch (e) {
                const msg = `Error accessing ${p}: ${e.message}`;
                errors.push(msg);
                log.warn(msg);
            }
        }
    }

    const freedMB = parseFloat((freedBytes / (1024 * 1024)).toFixed(2));
    log.info(`Cleanup finished. Freed: ${freedMB} MB, Files: ${filesDeleted}`);
    
    // Warning for UI if not admin
    const warnings = !isElevated ? ['Nota: Ejecuta como Administrador para una limpieza más profunda (Logs de Windows).'] : [];

    return {
        freedMB: freedMB,
        filesDeleted: filesDeleted,
        warnings: warnings
    };
}

module.exports = { cleanSystem };
