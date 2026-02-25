const { app, BrowserWindow, session, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const { spawn } = require('child_process');

// ─── Lecture de la version ────────────────────────────────────────────────────
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const APP_VERSION = pkg.version;
const GITHUB_REPO = pkg.repository?.url?.replace(/.*github\.com\//, '').replace(/\.git$/, '') || 'pronote-desktop/pronote-desktop';
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_REPO}`;
const UPDATE_ALLOWED_HOSTS = new Set([
  'api.github.com',
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
]);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let updateInstallInProgress = false;

// Stabilisation Linux packagé:
// - évite les écrans blancs sur machines avec stack GPU instable
// - conserve le sandbox Chromium (plus robuste que --no-sandbox)
if (!isDev && process.platform === 'linux') {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('ozone-platform', 'x11');
  app.commandLine.appendSwitch('enable-logging');
  app.commandLine.appendSwitch('log-file', '/tmp/pronote-electron.log');
}

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

// ─── Mises à jour GitHub ─────────────────────────────────────────────────────
function normalizeVersion(version) {
  const cleaned = String(version || '').trim().replace(/^v/i, '').split('-')[0];
  const parts = cleaned.split('.').map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return [0, 0, 0];
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

function compareVersions(a, b) {
  const va = normalizeVersion(a);
  const vb = normalizeVersion(b);
  for (let i = 0; i < 3; i += 1) {
    if (va[i] > vb[i]) return 1;
    if (va[i] < vb[i]) return -1;
  }
  return 0;
}

function toReleaseVersion(tagOrName) {
  return String(tagOrName || '').trim().replace(/^v/i, '');
}

function sanitizeNotes(body) {
  const text = String(body || '').trim();
  if (!text) return '';
  return text.slice(0, 10000);
}

function assertAllowedUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('URL de mise à jour invalide.');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('URL de mise à jour non sécurisée (HTTPS requis).');
  }
  if (!UPDATE_ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(`Hôte de mise à jour non autorisé: ${parsed.hostname}`);
  }
  return parsed;
}

function requestJson(urlString, redirectCount = 0) {
  assertAllowedUrl(urlString);
  if (redirectCount > 5) {
    return Promise.reject(new Error('Trop de redirections pendant la vérification des mises à jour.'));
  }

  return new Promise((resolve, reject) => {
    const request = https.get(urlString, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': `PronoteDesktop/${APP_VERSION}`,
      },
    }, (response) => {
      const location = response.headers.location;
      if (location && [301, 302, 303, 307, 308].includes(response.statusCode || 0)) {
        response.resume();
        const redirectUrl = new URL(location, urlString).toString();
        requestJson(redirectUrl, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if ((response.statusCode || 0) < 200 || (response.statusCode || 0) >= 300) {
          reject(new Error(`GitHub API a répondu ${response.statusCode}: ${body.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('Réponse GitHub invalide (JSON attendu).'));
        }
      });
    });

    request.setTimeout(20000, () => {
      request.destroy(new Error('Timeout pendant la requête GitHub.'));
    });
    request.on('error', reject);
  });
}

function selectReleaseAsset(release) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const debAssets = assets.filter((asset) =>
    typeof asset?.name === 'string' &&
    asset.name.endsWith('.deb') &&
    typeof asset.browser_download_url === 'string');

  if (process.platform !== 'linux') return null;

  const archToken = process.arch === 'x64' ? 'amd64' : process.arch;
  const exact = debAssets.find((asset) => asset.name.includes(`_${archToken}.deb`));
  if (exact) return exact;
  if (debAssets.length === 1) return debAssets[0];
  return null;
}

function buildUpdateInfo(release) {
  const latestVersion = toReleaseVersion(release?.tag_name || release?.name);
  const asset = selectReleaseAsset(release);
  const hasUpdate = compareVersions(latestVersion, APP_VERSION) > 0;

  return {
    currentVersion: APP_VERSION,
    latestVersion,
    hasUpdate,
    releaseName: String(release?.name || ''),
    releaseUrl: String(release?.html_url || ''),
    publishedAt: String(release?.published_at || ''),
    notes: sanitizeNotes(release?.body),
    asset: asset ? {
      name: String(asset.name),
      size: Number(asset.size || 0),
      downloadUrl: String(asset.browser_download_url),
      digest: typeof asset.digest === 'string' ? asset.digest : null,
    } : null,
    unsupportedReason: process.platform !== 'linux'
      ? `Mise à jour automatique non supportée sur ${process.platform}.`
      : null,
  };
}

function emitUpdateProgress(payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('updates:progress', payload);
    }
  }
}

async function checkForUpdates() {
  const release = await requestJson(`${GITHUB_API_BASE}/releases/latest`);
  return buildUpdateInfo(release);
}

function downloadFileWithProgress(urlString, filePath, onProgress, redirectCount = 0) {
  assertAllowedUrl(urlString);
  if (redirectCount > 5) {
    return Promise.reject(new Error('Trop de redirections pendant le téléchargement.'));
  }

  return new Promise((resolve, reject) => {
    const request = https.get(urlString, {
      headers: {
        'Accept': 'application/octet-stream',
        'User-Agent': `PronoteDesktop/${APP_VERSION}`,
      },
    }, (response) => {
      const location = response.headers.location;
      if (location && [301, 302, 303, 307, 308].includes(response.statusCode || 0)) {
        response.resume();
        const redirectUrl = new URL(location, urlString).toString();
        downloadFileWithProgress(redirectUrl, filePath, onProgress, redirectCount + 1)
          .then(resolve)
          .catch(reject);
        return;
      }

      if ((response.statusCode || 0) < 200 || (response.statusCode || 0) >= 300) {
        response.resume();
        reject(new Error(`Téléchargement échoué (${response.statusCode}).`));
        return;
      }

      const totalBytes = Number.parseInt(String(response.headers['content-length'] || '0'), 10) || 0;
      const hash = crypto.createHash('sha256');
      let downloadedBytes = 0;
      let lastPercent = -1;
      const fileStream = fs.createWriteStream(filePath);

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        hash.update(chunk);
        if (totalBytes > 0) {
          const percent = Math.min(100, Math.floor((downloadedBytes / totalBytes) * 100));
          if (percent !== lastPercent) {
            lastPercent = percent;
            onProgress({
              stage: 'download',
              message: `Téléchargement en cours (${percent}%)`,
              percent,
              downloadedBytes,
              totalBytes,
            });
          }
        }
      });

      response.on('error', (error) => {
        fileStream.destroy();
        fs.unlink(filePath, () => reject(error));
      });

      fileStream.on('error', (error) => {
        response.destroy(error);
        fs.unlink(filePath, () => reject(error));
      });

      fileStream.on('finish', () => {
        fileStream.close(() => {
          resolve({
            sha256: hash.digest('hex'),
            downloadedBytes,
            totalBytes,
          });
        });
      });

      response.pipe(fileStream);
    });

    request.setTimeout(60000, () => {
      request.destroy(new Error('Timeout pendant le téléchargement.'));
    });
    request.on('error', reject);
  });
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';

    const appendOutput = (chunk) => {
      output += chunk.toString('utf8');
      if (output.length > 20000) {
        output = output.slice(-20000);
      }
    };

    child.stdout.on('data', appendOutput);
    child.stderr.on('data', appendOutput);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ code, output });
      } else {
        reject(new Error(`${command} ${args.join(' ')} a échoué (code ${code}).\n${output}`));
      }
    });
  });
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

async function installDebPackage(filePath) {
  const attempts = [
    { command: 'pkexec', args: ['apt', 'install', '-y', filePath], label: 'pkexec/apt' },
    { command: 'sudo', args: ['-n', 'apt', 'install', '-y', filePath], label: 'sudo -n apt' },
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      emitUpdateProgress({
        stage: 'installing',
        message: `Installation via ${attempt.label}...`,
      });
      await runCommand(attempt.command, attempt.args);
      return { method: attempt.label };
    } catch (error) {
      lastError = error;
    }
  }

  const manualCommand = `sudo apt install -y ${shellEscape(filePath)}`;
  const error = new Error(`Installation automatique impossible.\nCommande manuelle: ${manualCommand}\n\n${String(lastError?.message || '')}`);
  error.manualCommand = manualCommand;
  throw error;
}

function registerUpdateIpcHandlers() {
  ipcMain.handle('updates:check', async () => {
    try {
      emitUpdateProgress({ stage: 'checking', message: 'Vérification des mises à jour...' });
      const info = await checkForUpdates();
      emitUpdateProgress({
        stage: 'checked',
        message: info.hasUpdate
          ? `Version ${info.latestVersion} disponible.`
          : 'Vous utilisez déjà la dernière version.',
      });
      return { ok: true, info };
    } catch (error) {
      const message = String(error?.message || error);
      emitUpdateProgress({ stage: 'error', message });
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('updates:install', async () => {
    if (updateInstallInProgress) {
      return { ok: false, error: 'Une mise à jour est déjà en cours.' };
    }

    updateInstallInProgress = true;
    try {
      const info = await checkForUpdates();
      if (!info.hasUpdate) {
        return { ok: false, error: 'Aucune mise à jour disponible.' };
      }
      if (info.unsupportedReason) {
        return { ok: false, error: info.unsupportedReason };
      }
      if (!info.asset) {
        return { ok: false, error: 'Aucun paquet compatible trouvé pour cette architecture.' };
      }

      emitUpdateProgress({ stage: 'download', message: 'Préparation du téléchargement...', percent: 0 });
      const updatesDir = path.join(app.getPath('temp'), 'pronote-desktop-updates');
      await fs.promises.mkdir(updatesDir, { recursive: true });
      const assetPath = path.join(updatesDir, info.asset.name);

      const result = await downloadFileWithProgress(info.asset.downloadUrl, assetPath, emitUpdateProgress);
      emitUpdateProgress({ stage: 'downloaded', message: 'Téléchargement terminé.', percent: 100 });

      if (info.asset.digest && info.asset.digest.startsWith('sha256:')) {
        const expectedSha = info.asset.digest.slice('sha256:'.length).toLowerCase();
        if (result.sha256.toLowerCase() !== expectedSha) {
          throw new Error('Checksum invalide: le paquet téléchargé ne correspond pas à la release GitHub.');
        }
      }

      const installResult = await installDebPackage(assetPath);
      emitUpdateProgress({
        stage: 'installed',
        message: `Mise à jour installée via ${installResult.method}. Redémarrage recommandé.`,
      });

      return {
        ok: true,
        installedVersion: info.latestVersion,
        restartRequired: true,
      };
    } catch (error) {
      const message = String(error?.message || error);
      emitUpdateProgress({ stage: 'error', message });
      return {
        ok: false,
        error: message,
        manualCommand: error?.manualCommand || null,
      };
    } finally {
      updateInstallInProgress = false;
    }
  });

  ipcMain.handle('updates:restart', async () => {
    app.relaunch();
    app.exit(0);
    return { ok: true };
  });
}

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
  registerUpdateIpcHandlers();
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
