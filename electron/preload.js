const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
    analyzeSystem: () => ipcRenderer.invoke('analyze-system'),
    runCleanup: () => ipcRenderer.invoke('run-cleanup'),
    onProgress: (callback) => ipcRenderer.on('cleanup-progress', (event, data) => callback(data)),
    removeProgressListeners: () => ipcRenderer.removeAllListeners('cleanup-progress'),
    askAI: (report) => ipcRenderer.invoke('ask-ai', report),
    getReports: () => ipcRenderer.invoke('get-reports'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    runSystemTool: (tool) => ipcRenderer.invoke('run-system-tool', tool),
    
    // Chat API
    chatSendMessage: (message) => ipcRenderer.invoke('chat-send-message', { message }),
    chatGetHistory: () => ipcRenderer.invoke('chat-get-history'),
    chatClearHistory: () => ipcRenderer.invoke('chat-clear-history'),
    chatExecuteAction: (action) => ipcRenderer.invoke('chat-execute-action', action),
    chatGetGreeting: () => ipcRenderer.invoke('chat-get-greeting'),
    getAIStatus: () => ipcRenderer.invoke('get-ai-status'),
    
    minimize: () => ipcRenderer.send('window-minimize'),
    close: () => ipcRenderer.send('window-close') // Hides to tray
});
