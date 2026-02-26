const DEFAULT_ALLOWED_HOSTS = new Set([
  'api.github.com',
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
]);

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

function assertAllowedUrl(urlString, allowedHosts = DEFAULT_ALLOWED_HOSTS) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('URL de mise à jour invalide.');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('URL de mise à jour non sécurisée (HTTPS requis).');
  }

  const hosts = allowedHosts instanceof Set ? allowedHosts : new Set(allowedHosts || []);
  if (!hosts.has(parsed.hostname)) {
    throw new Error(`Hôte de mise à jour non autorisé: ${parsed.hostname}`);
  }
  return parsed;
}

function selectReleaseAsset(release, platform = process.platform, arch = process.arch) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const debAssets = assets.filter((asset) =>
    typeof asset?.name === 'string' &&
    asset.name.endsWith('.deb') &&
    typeof asset.browser_download_url === 'string');

  if (platform !== 'linux') return null;

  const archToken = arch === 'x64' ? 'amd64' : arch;
  const exact = debAssets.find((asset) => asset.name.includes(`_${archToken}.deb`));
  if (exact) return exact;
  if (debAssets.length === 1) return debAssets[0];
  return null;
}

function buildUpdateInfo(release, options = {}) {
  const currentVersion = options.currentVersion || '0.0.0';
  const platform = options.platform || process.platform;
  const arch = options.arch || process.arch;
  const latestVersion = toReleaseVersion(release?.tag_name || release?.name);
  const asset = selectReleaseAsset(release, platform, arch);
  const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

  return {
    currentVersion,
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
    unsupportedReason: platform !== 'linux'
      ? `Mise à jour automatique non supportée sur ${platform}.`
      : null,
  };
}

module.exports = {
  DEFAULT_ALLOWED_HOSTS,
  normalizeVersion,
  compareVersions,
  toReleaseVersion,
  sanitizeNotes,
  assertAllowedUrl,
  selectReleaseAsset,
  buildUpdateInfo,
};
