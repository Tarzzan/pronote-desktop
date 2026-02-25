const { contextBridge, shell, ipcRenderer } = require('electron');

// Exposer le shell Electron de manière sécurisée au renderer
contextBridge.exposeInMainWorld('__ELECTRON_SHELL__', {
  openExternal: (url) => shell.openExternal(url),
});

// Exposer une version côté renderer sans dépendre de app.getVersion() (non dispo ici)
contextBridge.exposeInMainWorld('__APP_VERSION__', process.versions.electron || 'unknown');

contextBridge.exposeInMainWorld('pronoteDesktopUpdates', {
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  restartApp: () => ipcRenderer.invoke('updates:restart'),
  onProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('updates:progress', listener);
    return () => {
      ipcRenderer.removeListener('updates:progress', listener);
    };
  },
});
