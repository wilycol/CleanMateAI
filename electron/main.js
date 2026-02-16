const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const log = require('electron-log');
const { getSystemStats } = require('../services/monitor');
const { cleanSystem, analyzeSystem: scanJunk } = require('../services/cleaner');
const { analyzeSystem: askAI, checkAIConnectivity } = require('../services/apiClient');
const { saveReport, getReports } = require('../services/reportManager');
const { processUserMessage, getChatHistory, clearChatHistory } = require('../services/aiService');
const { updateLastAnalysis, updateLastCleanup } = require('../services/systemContextBuilder');
const { interpretAction } = require('../services/actionInterpreter');

console.log("🔥 MAIN PROCESS ACTIVO - main.js ejecutándose");

// Configure Logging
log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = 'info';
console.log = log.log;
console.error = log.error;

log.info('==========================================');
log.info(`CleanMate AI Started v${app.getVersion()}`);
log.info(`Log File: ${log.transports.file.getFile().path}`);
log.info('==========================================');

// Global Error Handling
process.on('uncaughtException', (error) => {
    log.error('UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (reason) => {
    log.error('UNHANDLED REJECTION:', reason);
});

let mainWindow;
let tray;

function getAssetPath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'web/assets');
    }
    return path.join(__dirname, '../web/assets');
}

function createWindow() {
    log.info('Creating main window...');
    const iconPath = path.join(getAssetPath(), 'logo.ico');
    
    mainWindow = new BrowserWindow({
        width: 420,
        height: 600,
        resizable: false,
        frame: false, // Custom UI
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: iconPath
    });

    const isDev = process.env.NODE_ENV !== 'production';
    if (process.argv.includes('--dev')) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        // Updated path to match new 'build_output_clean' build output directory
        const indexPath = path.join(__dirname, '../build_output_clean/index.html');
        log.info(`Loading production file from: ${indexPath}`);
        
        mainWindow.loadFile(indexPath).catch(e => log.error('Failed to load index.html', e));
        
        // Open DevTools even in production to debug the black screen
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            log.info('Window minimized to tray');
        } else {
            log.info('App closing...');
        }
        return false;
    });
}

function createTray() {
    const iconPath = path.join(getAssetPath(), 'logo.ico');
    log.info(`Creating tray with icon: ${iconPath}`);
    
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
        { 
            label: 'Abrir CleanMate', 
            click: () => mainWindow.show() 
        },
        { 
            label: 'Optimizar ahora', 
            click: async () => {
                log.info('Tray action: Optimizar ahora');
                const stats = await getSystemStats();
                const clean = await cleanSystem();
                // Notify user (notification API could be used here)
            } 
        },
        { type: 'separator' },
        { 
            label: 'Salir', 
            click: () => {
                log.info('User requested exit from tray');
                app.isQuitting = true;
                app.quit();
            } 
        }
    ]);

    tray.setToolTip('CleanMate AI');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        mainWindow.show();
    });
}

app.whenReady().then(() => {
    // Register IPC Handlers BEFORE creating window to avoid race conditions
    ipcMain.handle('get-system-stats', async () => {
        // log.info('IPC: get-system-stats called');
        return await getSystemStats();
    });

    ipcMain.handle('get-app-version', async () => {
        return app.getVersion();
    });

    ipcMain.handle('run-cleanup', async (event) => {
        log.info('IPC: run-cleanup called', { timestamp: new Date().toISOString() });
        const onProgress = (data) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('cleanup-progress', data);
            }
        };
        const result = await cleanSystem(onProgress);
        
        // Save report automatically
        try {
            await saveReport({
                type: 'cleanup',
                stats: result
            });
        } catch (e) {
            log.error('Failed to auto-save report:', e);
        }

        updateLastCleanup(result);
        return result;
    });

    ipcMain.handle('get-reports', async () => {
        return await getReports();
    });

    ipcMain.handle('get-ai-status', async () => {
        try {
            const status = await checkAIConnectivity();
            return status;
        } catch (e) {
            log.error('AI status check failed:', e);
            return { backend: false, analyze: false, chat: false, lastChecked: new Date().toISOString() };
        }
    });

    ipcMain.handle('analyze-system', async () => {
        log.info('IPC: analyze-system called');
        
        // 1. Gather basic system stats
        const stats = await getSystemStats();
        
        // 2. Perform local scan for junk files with progress
        // We define a callback to bridge between cleaner.js progress and UI
        const onProgress = (data) => {
             if (mainWindow && !mainWindow.isDestroyed()) {
                 // The cleaner.js emits { status: 'scanning', currentFile: ..., percent: 0 }
                 // The UI expects { percent: ..., currentFile: ... }
                 // We send this to 'cleanup-progress' channel which the UI listens to during 'cleaning' phase
                 // BUT for 'analyzing' phase, the UI (App.jsx) does NOT listen to 'cleanup-progress' by default in handleAnalyze()
                 // We need to fix App.jsx to listen during analysis OR just log it for now.
                 // Let's send it anyway, maybe we update App.jsx next.
                 mainWindow.webContents.send('cleanup-progress', {
                     percent: 0, 
                     currentFile: `Analizando: ${data.currentFile}`
                 });
             }
        };
        
        log.info('Starting local file scan...');
        // We use the alias 'scanJunk' which maps to 'analyzeSystem' from cleaner.js
        // cleaner.js analyzeSystem signature is (onProgress)
        const junkResults = await scanJunk(onProgress);
        log.info('Scan complete', { 
            fileCount: junkResults.fileCount, 
            spaceRecoverableMB: junkResults.spaceRecoverableMB 
        });
        
        // 3. Ask AI for analysis
        const cleanupStats = { 
            freedMB: junkResults.spaceRecoverableMB, 
            filesDeleted: junkResults.fileCount 
        }; 
        
        // Notify UI that we are contacting AI
        if (mainWindow && !mainWindow.isDestroyed()) {
             mainWindow.webContents.send('cleanup-progress', {
                 percent: 100,
                 currentFile: "Consultando Inteligencia Artificial..."
             });
        }

        const aiResult = await askAI(stats, cleanupStats);
        
        // Merge results: AI result + Local Scan stats
        const finalResult = {
            ...aiResult,
            spaceRecoverableMB: junkResults.spaceRecoverableMB,
            estimatedPerformanceGain: junkResults.estimatedPerformanceGain,
            fileCount: junkResults.fileCount,
            readOnlyFiles: junkResults.readOnlyFiles,
            // Keep AI message
        };

        updateLastAnalysis(finalResult);
        try {
            await saveReport({
                type: 'analysis',
                stats: {
                    spaceRecoverableMB: junkResults.spaceRecoverableMB,
                    fileCount: junkResults.fileCount
                },
                ai: {
                    message: finalResult.choices && finalResult.choices[0] && finalResult.choices[0].message
                        ? finalResult.choices[0].message.content
                        : null
                }
            });
        } catch (e) {
            log.error('Failed to auto-save analysis report:', e);
        }
        return finalResult;
    });

    // Chat IPC Handlers
    ipcMain.handle('chat-get-greeting', async (event, mode) => {
        const { generateGreeting } = require('../services/aiService');
        return await generateGreeting(mode);
    });

    ipcMain.handle('chat-send-message', async (event, { message, mode }) => {
        return await processUserMessage(message, mode);
    });

    ipcMain.handle('chat-get-history', async () => {
        return await getChatHistory();
    });

    ipcMain.handle('chat-clear-history', async () => {
        return await clearChatHistory();
    });

    ipcMain.handle('chat-execute-action', async (event, action) => {
        log.info('IPC: chat-execute-action', action);
        const validAction = interpretAction(action);
        if (!validAction) {
            throw new Error("Action blocked by security policy");
        }
        
        if (action.type === 'analyze') {
            // Fix: Use the correct alias 'scanJunk' and 'askAI' logic
            // But wait, analyzeSystem handler does both. 
            // We should reuse the existing handler logic or call the functions directly.
            // Since we need to send progress, it's better to call the logic that sends progress.
            // But we can't easily invoke another IPC handler from main.
            // Let's copy the logic or refactor. Refactoring is safer.
            
            // We'll call the same logic as 'analyze-system' handler
            log.info('Chat triggering analysis...');
            
            // 1. Stats
            const stats = await getSystemStats();
            
            // 2. Scan
            const onProgress = (data) => {
                 if (mainWindow && !mainWindow.isDestroyed()) {
                     mainWindow.webContents.send('cleanup-progress', {
                         percent: 0, 
                         currentFile: `Analizando: ${data.currentFile}`
                     });
                 }
            };
            const junkResults = await scanJunk(onProgress);
            
            // 3. AI
            if (mainWindow && !mainWindow.isDestroyed()) {
                 mainWindow.webContents.send('cleanup-progress', {
                     percent: 100,
                     currentFile: "Consultando Inteligencia Artificial..."
                 });
            }
            const cleanupStats = { freedMB: junkResults.spaceRecoverableMB, filesDeleted: junkResults.fileCount };
            const aiResult = await askAI(stats, cleanupStats);
            
            const finalResult = {
                ...aiResult,
                spaceRecoverableMB: junkResults.spaceRecoverableMB,
                estimatedPerformanceGain: junkResults.estimatedPerformanceGain,
                fileCount: junkResults.fileCount,
                readOnlyFiles: junkResults.readOnlyFiles,
            };

            updateLastAnalysis(finalResult);
            return { success: true, result: finalResult };

        } else if (action.type === 'clean') {
            const onProgress = (data) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('cleanup-progress', data);
                }
            };
            const result = await cleanSystem(onProgress);
            updateLastCleanup(result);
            return { success: true, result };
        }
        
        return { success: false, message: "Action type not implemented yet" };
    });

    ipcMain.handle('ask-ai', async (event, report) => {
        log.info('IPC: ask-ai called');
        // Fix: Use 'askAI' instead of 'analyzeSystem'
        return await askAI(report.systemStats, report.cleanupStats);
    });

    ipcMain.on('window-minimize', () => {
        if (mainWindow) mainWindow.minimize();
    });

    ipcMain.on('window-close', () => {
        if (mainWindow) mainWindow.hide();
    });

    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    log.info('All windows closed (hidden)');
    if (process.platform !== 'darwin') {
        // Do not quit, keep tray active
    }
});
