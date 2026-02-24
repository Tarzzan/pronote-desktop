const { contextBridge, shell } = require('electron');

// Exposer le shell Electron de manière sécurisée au renderer
contextBridge.exposeInMainWorld('__ELECTRON_SHELL__', {
  openExternal: (url) => shell.openExternal(url),
});

// Exposer la version de l'application
const { app } = require('electron');
contextBridge.exposeInMainWorld('__APP_VERSION__', app.getVersion());
