const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeVersion,
  compareVersions,
  assertAllowedUrl,
  selectReleaseAsset,
  buildUpdateInfo,
} = require('../electron/update-utils.cjs');

test('normalizeVersion and compareVersions handle tags and suffixes', () => {
  assert.deepEqual(normalizeVersion('v1.7.11-beta'), [1, 7, 11]);
  assert.equal(compareVersions('v1.7.11', '1.7.10'), 1);
  assert.equal(compareVersions('1.7.11', 'v1.7.11'), 0);
  assert.equal(compareVersions('1.7.9', '1.8.0'), -1);
});

test('assertAllowedUrl enforces HTTPS and host allow-list', () => {
  const allowed = new Set(['api.github.com', 'github.com']);
  const parsed = assertAllowedUrl('https://api.github.com/repos/Tarzzan/pronote-desktop/releases/latest', allowed);
  assert.equal(parsed.hostname, 'api.github.com');

  assert.throws(() => {
    assertAllowedUrl('http://api.github.com/repos/Tarzzan/pronote-desktop/releases/latest', allowed);
  }, /HTTPS requis/);

  assert.throws(() => {
    assertAllowedUrl('https://example.com/releases/latest', allowed);
  }, /Hôte de mise à jour non autorisé/);
});

test('selectReleaseAsset picks matching linux asset and ignores non-linux platform', () => {
  const release = {
    assets: [
      { name: 'pronote-desktop_1.7.11_arm64.deb', browser_download_url: 'https://github.com/a' },
      { name: 'pronote-desktop_1.7.11_amd64.deb', browser_download_url: 'https://github.com/b' },
    ],
  };

  const linuxAsset = selectReleaseAsset(release, 'linux', 'x64');
  assert.equal(linuxAsset?.name, 'pronote-desktop_1.7.11_amd64.deb');
  assert.equal(selectReleaseAsset(release, 'darwin', 'x64'), null);
});

test('buildUpdateInfo returns expected update flags and metadata', () => {
  const release = {
    tag_name: 'v1.7.12',
    name: 'v1.7.12',
    html_url: 'https://github.com/Tarzzan/pronote-desktop/releases/tag/v1.7.12',
    published_at: '2026-02-26T10:00:00Z',
    body: '# Release notes',
    assets: [
      {
        name: 'pronote-desktop_1.7.12_amd64.deb',
        size: 12345678,
        browser_download_url: 'https://github.com/Tarzzan/pronote-desktop/releases/download/v1.7.12/pronote-desktop_1.7.12_amd64.deb',
        digest: 'sha256:abc',
      },
    ],
  };

  const linuxInfo = buildUpdateInfo(release, {
    currentVersion: '1.7.11',
    platform: 'linux',
    arch: 'x64',
  });
  assert.equal(linuxInfo.hasUpdate, true);
  assert.equal(linuxInfo.latestVersion, '1.7.12');
  assert.equal(linuxInfo.asset?.name, 'pronote-desktop_1.7.12_amd64.deb');
  assert.equal(linuxInfo.unsupportedReason, null);

  const macInfo = buildUpdateInfo(release, {
    currentVersion: '1.7.11',
    platform: 'darwin',
    arch: 'x64',
  });
  assert.equal(macInfo.hasUpdate, true);
  assert.equal(macInfo.asset, null);
  assert.match(String(macInfo.unsupportedReason), /non supportée sur darwin/);
});
