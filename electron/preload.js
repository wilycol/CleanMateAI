const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
    analyzeSystem: () => ipcRenderer.invoke('analyze-system'),
    runCleanup: () => ipcRenderer.invoke('run-cleanup'),
    onProgress: (callback) => ipcRenderer.on('cleanup-progress', (event, data) => callback(data)),
    removeProgressListeners: () => ipcRenderer.removeAllListeners('cleanup-progress'),
    askAI: (report) => ipcRenderer.invoke('ask-ai', report),
    getReports: () => ipcRenderer.invoke('get-reports'),
    
    // Chat API
    chatSendMessage: (message, mode) => ipcRenderer.invoke('chat-send-message', { message, mode }),
    chatGetHistory: () => ipcRenderer.invoke('chat-get-history'),
    chatClearHistory: () => ipcRenderer.invoke('chat-clear-history'),
    chatExecuteAction: (action) => ipcRenderer.invoke('chat-execute-action', action),
    chatGetGreeting: (mode) => ipcRenderer.invoke('chat-get-greeting', mode),
    
    minimize: () => ipcRenderer.send('window-minimize'),
    close: () => ipcRenderer.send('window-close') // Hides to tray
});
