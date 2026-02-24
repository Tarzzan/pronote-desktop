const { app, BrowserWindow, session, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ─── Lecture de la version ────────────────────────────────────────────────────
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const APP_VERSION = pkg.version;
const GITHUB_REPO = pkg.repository?.url?.replace(/.*github\.com\//, '').replace(/\.git$/, '') || 'pronote-desktop/pronote-desktop';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ─── Remontée d'erreurs vers GitHub ──────────────────────────────────────────
function buildGitHubIssueUrl(error) {
  const title = `[Bug v${APP_VERSION}] ${String(error?.message || error).substring(0, 80)}`;
  const body = [
    '## Description du bug',
    '',
    'Une erreur non capturée s\'est produite dans le processus principal Electron.',
    '',
    '## Informations système',
    '',
    '| Champ | Valeur |',
    '|---|---|',
    `| Version | ${APP_VERSION} |`,
    `| Electron | ${process.versions.electron} |`,
    `| Node.js | ${process.versions.node} |`,
    `| Plateforme | ${process.platform} ${process.arch} |`,
    `| Date | ${new Date().toISOString()} |`,
    '',
    '## Message d\'erreur',
    '',
    '```',
    String(error?.message || error),
    '```',
    '',
    '## Stack trace',
    '',
    '```',
    String(error?.stack || 'Non disponible'),
    '```',
  ].join('\n');

  return `https://github.com/${GITHUB_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=bug,electron`;
}

function handleUncaughtError(error, type) {
  console.error(`[Electron Main] ${type}:`, error);

  // Ne pas afficher de dialogue en dev pour ne pas bloquer le workflow
  if (isDev) return;

  const errorMessage = String(error?.message || error);
  const response = dialog.showMessageBoxSync({
    type: 'error',
    title: `Erreur — PRONOTE Desktop v${APP_VERSION}`,
    message: 'Une erreur inattendue s\'est produite',
    detail: `${errorMessage}\n\nVoulez-vous signaler ce bug sur GitHub ?`,
    buttons: ['Signaler sur GitHub', 'Ignorer'],
    defaultId: 0,
    cancelId: 1,
  });

  if (response === 0) {
    shell.openExternal(buildGitHubIssueUrl(error));
  }
}

// Intercepter les erreurs non capturées du processus principal
process.on('uncaughtException', (error) => handleUncaughtError(error, 'uncaughtException'));
process.on('unhandledRejection', (reason) => handleUncaughtError(reason, 'unhandledRejection'));

// ─── Création de la fenêtre ───────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: `PRONOTE Desktop v${APP_VERSION}`,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Nécessaire pour les requêtes cross-origin vers Pronote
      preload: path.join(__dirname, 'preload.cjs'),
    },
    backgroundColor: '#1e3a8a',
    show: false,
    autoHideMenuBar: true,
  });

  // ─── Gestion CORS pour Pronote ──────────────────────────────────────────────
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
    try {
      details.requestHeaders['Origin'] = new URL(details.url).origin;
    } catch { /* ignorer les URLs invalides */ }
    callback({ requestHeaders: details.requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Headers': ['*'],
        'Access-Control-Allow-Methods': ['GET, POST, PUT, DELETE, OPTIONS'],
      },
    });
  });

  // ─── Intercepter les erreurs du renderer ───────────────────────────────────
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Renderer] Processus de rendu terminé:', details);
    if (!isDev && details.reason !== 'clean-exit') {
      const response = dialog.showMessageBoxSync({
        type: 'error',
        title: `Crash — PRONOTE Desktop v${APP_VERSION}`,
        message: 'L\'interface a planté',
        detail: `Raison : ${details.reason}\n\nVoulez-vous signaler ce bug ?`,
        buttons: ['Signaler sur GitHub', 'Redémarrer', 'Fermer'],
        defaultId: 1,
        cancelId: 2,
      });
      if (response === 0) {
        shell.openExternal(buildGitHubIssueUrl(new Error(`Renderer crash: ${details.reason}`)));
      } else if (response === 1) {
        win.reload();
      }
    }
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Renderer] Échec de chargement:', errorCode, errorDescription);
  });

  // ─── Chargement de l'application ───────────────────────────────────────────
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  return win;
}

// ─── Cycle de vie de l'application ───────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
