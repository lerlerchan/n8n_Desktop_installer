const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods to renderer
contextBridge.exposeInMainWorld('n8nDesktop', {
  getStatus: () => ipcRenderer.invoke('get-status'),
  startServer: () => ipcRenderer.invoke('start-server'),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  restartServer: () => ipcRenderer.invoke('restart-server'),
  onStatusChange: (callback) => {
    ipcRenderer.on('status-changed', (event, status) => callback(status));
  },
  removeStatusListener: () => {
    ipcRenderer.removeAllListeners('status-changed');
  }
});
