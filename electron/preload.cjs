const { contextBridge, shell } = require('electron');

// Exposer le shell Electron de manière sécurisée au renderer
contextBridge.exposeInMainWorld('__ELECTRON_SHELL__', {
  openExternal: (url) => shell.openExternal(url),
});

// Exposer une version côté renderer sans dépendre de app.getVersion() (non dispo ici)
contextBridge.exposeInMainWorld('__APP_VERSION__', process.versions.electron || 'unknown');
