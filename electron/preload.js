const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
    runCleanup: () => ipcRenderer.invoke('run-cleanup'),
    askAI: (report) => ipcRenderer.invoke('ask-ai', report),
    minimize: () => ipcRenderer.send('window-minimize'),
    close: () => ipcRenderer.send('window-close') // Hides to tray
});
