const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const log = require('electron-log');
const { getSystemStats } = require('../services/monitor');
const { cleanSystem } = require('../services/cleaner');
const { analyzeSystem } = require('../services/apiClient');
const { processUserMessage, getChatHistory, clearChatHistory } = require('../services/aiService');
const { updateLastAnalysis, updateLastCleanup } = require('../services/systemContextBuilder');
const { interpretAction } = require('../services/actionInterpreter');

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
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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
    createWindow();
    createTray();

    // IPC Handlers
    ipcMain.handle('get-system-stats', async () => {
        // log.info('IPC: get-system-stats called'); // Commented to avoid spamming logs
        return await getSystemStats();
    });

    ipcMain.handle('run-cleanup', async (event) => {
        log.info('IPC: run-cleanup called');
        // Define progress callback
        const onProgress = (data) => {
            if (!mainWindow.isDestroyed()) {
                mainWindow.webContents.send('cleanup-progress', data);
            }
        };
        const result = await cleanSystem(onProgress);
        updateLastCleanup(result); // Update context
        return result;
    });

    ipcMain.handle('analyze-system', async () => {
        log.info('IPC: analyze-system called');
        const result = await analyzeSystem();
        updateLastAnalysis(result); // Update context
        return result;
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
        
        // Execute logic based on action type
        if (action.type === 'analyze') {
            // Trigger analysis via existing handler logic
            const result = await analyzeSystem();
            updateLastAnalysis(result);
            return { success: true, result };
        } else if (action.type === 'clean') {
            // Trigger cleanup
            const onProgress = (data) => {
                if (!mainWindow.isDestroyed()) {
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
        return await analyzeSystem(report.systemStats, report.cleanupStats);
    });

    ipcMain.on('window-minimize', () => {
        mainWindow.minimize();
    });

    ipcMain.on('window-close', () => {
        mainWindow.hide();
    });

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
