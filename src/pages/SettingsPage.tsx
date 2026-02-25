import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Save, RefreshCw, Loader2, CheckCircle,
  Server, Bell, Palette, Info, ExternalLink, ArrowUpCircle, Download, ShieldCheck, AlertTriangle
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AppConfig {
  api_port: number;
  check_updates: boolean;
  theme: 'light' | 'dark' | 'system';
  notifications_enabled: boolean;
  pronote_url?: string;
  language: string;
}

const DEFAULT_CONFIG: AppConfig = {
  api_port: 5174,
  check_updates: true,
  theme: 'light',
  notifications_enabled: true,
  pronote_url: '',
  language: 'fr',
};

const formatReleaseDate = (isoDate: string): string => {
  if (!isoDate) return 'Inconnue';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Inconnue';
  return date.toLocaleString('fr-FR');
};

const formatBytes = (value: number): string => {
  if (!value || value <= 0) return '0 B';
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
};

// ─── Composant principal ──────────────────────────────────────────────────────
const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [original, setOriginal] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<DesktopUpdateInfo | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<DesktopUpdateProgressEvent | null>(null);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [manualInstallCommand, setManualInstallCommand] = useState<string | null>(null);
  const [restartAvailable, setRestartAvailable] = useState(false);
  const autoCheckDoneRef = useRef(false);

  const API_BASE = 'http://127.0.0.1:5174/api';

  // Charger la configuration au montage
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const resp = await fetch(`${API_BASE}/config`);
        if (resp.ok) {
          const data = await resp.json();
          const merged = { ...DEFAULT_CONFIG, ...data };
          setConfig(merged);
          setOriginal(merged);
        }
      } catch {
        // Utiliser les valeurs par défaut si l'API n'est pas disponible
        setConfig(DEFAULT_CONFIG);
        setOriginal(DEFAULT_CONFIG);
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    const updatesApi = window.pronoteDesktopUpdates;
    if (!updatesApi) return undefined;
    return updatesApi.onProgress((event) => {
      setUpdateProgress(event);
      if (event.stage === 'error') {
        setUpdateError(event.message);
      } else {
        setUpdateStatus(event.message);
      }
    });
  }, []);

  const handleCheckUpdates = async (silent = false) => {
    const updatesApi = window.pronoteDesktopUpdates;
    if (!updatesApi) {
      if (!silent) {
        setUpdateError('Fonction de mise à jour disponible uniquement dans l’application desktop packagée.');
      }
      return;
    }

    setIsCheckingUpdates(true);
    setUpdateError(null);
    setManualInstallCommand(null);
    if (!silent) {
      setUpdateStatus(null);
    }

    try {
      const response = await updatesApi.checkForUpdates();
      if (!response.ok || !response.info) {
        throw new Error(response.error || 'Vérification impossible pour le moment.');
      }
      setUpdateInfo(response.info);
      if (!response.info.hasUpdate) {
        setUpdateStatus('Vous utilisez déjà la dernière version.');
      } else {
        setUpdateStatus(`Nouvelle version détectée: v${response.info.latestVersion}`);
      }
    } catch (e) {
      if (!silent) {
        setUpdateError(e instanceof Error ? e.message : 'Erreur lors de la vérification des mises à jour.');
      }
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  useEffect(() => {
    if (isLoading || autoCheckDoneRef.current || !config.check_updates) return;
    autoCheckDoneRef.current = true;
    void handleCheckUpdates(true);
  }, [isLoading, config.check_updates]);

  const handleInstallUpdate = async () => {
    const updatesApi = window.pronoteDesktopUpdates;
    if (!updatesApi) {
      setUpdateError('Fonction de mise à jour disponible uniquement dans l’application desktop packagée.');
      return;
    }

    setIsInstallingUpdate(true);
    setUpdateError(null);
    setManualInstallCommand(null);
    setRestartAvailable(false);

    try {
      const response = await updatesApi.installUpdate();
      if (!response.ok) {
        setUpdateError(response.error || 'Échec de la mise à jour.');
        if (response.manualCommand) {
          setManualInstallCommand(response.manualCommand);
        }
        return;
      }
      setRestartAvailable(Boolean(response.restartRequired));
      setUpdateStatus(`Mise à jour installée${response.installedVersion ? ` vers v${response.installedVersion}` : ''}.`);
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : 'Échec de la mise à jour.');
    } finally {
      setIsInstallingUpdate(false);
    }
  };

  const handleRestartApp = async () => {
    const updatesApi = window.pronoteDesktopUpdates;
    if (!updatesApi) return;
    await updatesApi.restartApp();
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(original);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (resp.ok) {
        setOriginal(config);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        // Appliquer le thème immédiatement
        if (config.theme === 'dark') {
          document.documentElement.classList.add('dark');
          localStorage.setItem('pronote-theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('pronote-theme', 'light');
        }
      } else {
        setError('Impossible de sauvegarder la configuration.');
      }
    } catch {
      setError('Erreur de connexion au serveur local.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(original);
    setSaved(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Paramètres
        </h1>
        <p className="text-sm text-gray-500">Configuration de Pronote Desktop v{__APP_VERSION__}</p>
      </div>

      <div className="space-y-6">
        {/* Section Connexion */}
        <Section icon={<Server className="w-5 h-5 text-blue-600" />} title="Connexion">
          <div className="space-y-4">
            <FormField
              label="URL du serveur Pronote"
              description="L'adresse complète de votre espace Pronote (ex. : https://monecole.index-education.net/pronote/)"
            >
              <input
                type="url"
                value={config.pronote_url || ''}
                onChange={e => setConfig(c => ({ ...c, pronote_url: e.target.value }))}
                placeholder="https://monecole.index-education.net/pronote/"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              />
            </FormField>
            <FormField
              label="Port de l'API locale"
              description="Port sur lequel tourne le serveur Flask local (défaut : 5174). Nécessite un redémarrage."
            >
              <input
                type="number"
                min={1024}
                max={65535}
                value={config.api_port}
                onChange={e => setConfig(c => ({ ...c, api_port: parseInt(e.target.value) || 5174 }))}
                className="w-32 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              />
            </FormField>
          </div>
        </Section>

        {/* Section Apparence */}
        <Section icon={<Palette className="w-5 h-5 text-purple-600" />} title="Apparence">
          <FormField label="Thème" description="Choisissez l'apparence de l'application.">
            <div className="flex gap-3">
              {(['light', 'dark', 'system'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setConfig(c => ({ ...c, theme: t }))}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    config.theme === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {t === 'light' ? '☀️ Clair' : t === 'dark' ? '🌙 Sombre' : '🖥️ Système'}
                </button>
              ))}
            </div>
          </FormField>
        </Section>

        {/* Section Notifications */}
        <Section icon={<Bell className="w-5 h-5 text-yellow-600" />} title="Notifications">
          <div className="space-y-3">
            <Toggle
              label="Notifications desktop"
              description="Afficher des notifications système pour les nouveaux messages et devoirs."
              checked={config.notifications_enabled}
              onChange={v => setConfig(c => ({ ...c, notifications_enabled: v }))}
            />
            <Toggle
              label="Vérifier les mises à jour"
              description="Vérifier automatiquement si une nouvelle version est disponible au démarrage."
              checked={config.check_updates}
              onChange={v => setConfig(c => ({ ...c, check_updates: v }))}
            />
          </div>
        </Section>

        {/* Section Mises à jour */}
        <Section icon={<ArrowUpCircle className="w-5 h-5 text-emerald-600" />} title="Mises à jour">
          <div className="space-y-4">
            {window.pronoteDesktopUpdates ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-gray-200 px-3 py-2">
                    <div className="text-gray-500">Version actuelle</div>
                    <div className="font-semibold text-gray-900">v{__APP_VERSION__}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 px-3 py-2">
                    <div className="text-gray-500">Dernière version GitHub</div>
                    <div className="font-semibold text-gray-900">
                      {updateInfo ? `v${updateInfo.latestVersion}` : 'Non vérifiée'}
                    </div>
                  </div>
                </div>

                {updateInfo && (
                  <div className="rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-700 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Publication</span>
                      <span>{formatReleaseDate(updateInfo.publishedAt)}</span>
                    </div>
                    {updateInfo.asset && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Paquet</span>
                        <span>{updateInfo.asset.name} ({formatBytes(updateInfo.asset.size)})</span>
                      </div>
                    )}
                    {updateInfo.releaseUrl && (
                      <div className="pt-1">
                        <a
                          href={updateInfo.releaseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                        >
                          Voir la release GitHub <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {updateInfo?.notes && (
                  <details className="rounded-lg border border-gray-200 p-3 text-xs text-gray-600">
                    <summary className="cursor-pointer font-medium text-gray-700">Notes de version</summary>
                    <pre className="mt-2 whitespace-pre-wrap font-sans leading-relaxed text-gray-600">
                      {updateInfo.notes.split('\n').slice(0, 12).join('\n')}
                    </pre>
                  </details>
                )}

                {updateProgress?.stage === 'download' && typeof updateProgress.percent === 'number' && (
                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, updateProgress.percent))}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {updateProgress.message}
                    </div>
                  </div>
                )}

                {updateStatus && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-0.5" />
                    <span>{updateStatus}</span>
                  </div>
                )}

                {updateError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <span>{updateError}</span>
                  </div>
                )}

                {manualInstallCommand && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <div className="text-xs text-amber-800 font-medium mb-1">Commande manuelle</div>
                    <code className="text-xs text-amber-900 break-all">{manualInstallCommand}</code>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCheckUpdates(false)}
                    disabled={isCheckingUpdates || isInstallingUpdate}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isCheckingUpdates ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Vérifier les mises à jour
                  </button>

                  {updateInfo?.hasUpdate && !updateInfo.unsupportedReason && (
                    <button
                      onClick={handleInstallUpdate}
                      disabled={isInstallingUpdate || isCheckingUpdates}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
                    >
                      {isInstallingUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Mettre à jour maintenant
                    </button>
                  )}

                  {restartAvailable && (
                    <button
                      onClick={handleRestartApp}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Redémarrer l'application
                    </button>
                  )}
                </div>

                {updateInfo?.unsupportedReason && (
                  <p className="text-xs text-amber-700">{updateInfo.unsupportedReason}</p>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Fonction de mise à jour disponible uniquement dans l’application desktop packagée.
              </div>
            )}
          </div>
        </Section>

        {/* Section À propos */}
        <Section icon={<Info className="w-5 h-5 text-gray-500" />} title="À propos">
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span className="text-gray-500">Version</span>
              <span className="font-medium">{__APP_VERSION__}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Licence</span>
              <span className="font-medium">MIT</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Dépôt GitHub</span>
              <a
                href="https://github.com/Tarzzan/pronote-desktop"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
              >
                Tarzzan/pronote-desktop <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Application non officielle</span>
              <span className="text-gray-400">Index Éducation</span>
            </div>
          </div>
        </Section>
      </div>

      {/* Erreur */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
        <button
          onClick={handleReset}
          disabled={!hasChanges || isSaving}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          <RefreshCw className="w-4 h-4" /> Annuler les modifications
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${
            saved
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-blue-700 hover:bg-blue-800 text-white'
          } disabled:opacity-50`}
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
          ) : saved ? (
            <><CheckCircle className="w-4 h-4" /> Enregistré</>
          ) : (
            <><Save className="w-4 h-4" /> Enregistrer</>
          )}
        </button>
      </div>
    </div>
  );
};

// ─── Sous-composants ──────────────────────────────────────────────────────────
const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
  >
    <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
      {icon}
      <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
    </div>
    <div className="p-5">{children}</div>
  </motion.div>
);

const FormField: React.FC<{ label: string; description?: string; children: React.ReactNode }> = ({ label, description, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {description && <p className="text-xs text-gray-400 mb-2">{description}</p>}
    {children}
  </div>
);

const Toggle: React.FC<{ label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <div className="text-sm font-medium text-gray-700">{label}</div>
      {description && <div className="text-xs text-gray-400">{description}</div>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  </div>
);

export default SettingsPage;
