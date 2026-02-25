/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface DesktopUpdateAsset {
  name: string;
  size: number;
  downloadUrl: string;
  digest: string | null;
}

interface DesktopUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName: string;
  releaseUrl: string;
  publishedAt: string;
  notes: string;
  asset: DesktopUpdateAsset | null;
  unsupportedReason: string | null;
}

interface DesktopUpdateCheckResponse {
  ok: boolean;
  info?: DesktopUpdateInfo;
  error?: string;
}

interface DesktopUpdateInstallResponse {
  ok: boolean;
  installedVersion?: string;
  restartRequired?: boolean;
  error?: string;
  manualCommand?: string | null;
}

interface DesktopUpdateProgressEvent {
  stage: 'checking' | 'checked' | 'download' | 'downloaded' | 'installing' | 'installed' | 'error';
  message: string;
  percent?: number;
  downloadedBytes?: number;
  totalBytes?: number;
}

interface Window {
  pronoteDesktopUpdates?: {
    checkForUpdates: () => Promise<DesktopUpdateCheckResponse>;
    installUpdate: () => Promise<DesktopUpdateInstallResponse>;
    restartApp: () => Promise<{ ok: boolean }>;
    onProgress: (callback: (event: DesktopUpdateProgressEvent) => void) => () => void;
  };
}
