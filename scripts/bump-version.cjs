#!/usr/bin/env node
/**
 * Script d'incrémentation automatique de version
 * Incrémente la version patch dans package.json à chaque build.
 * La version est injectée dans le frontend via __APP_VERSION__ (vite.config.ts define).
 * Les fichiers .tsx n'ont plus de version hardcodée — ils utilisent {__APP_VERSION__}.
 * Usage: node scripts/bump-version.cjs
 */
const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);
const newVersion = `${major}.${minor}.${patch + 1}`;
pkg.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Version incrémentée : ${major}.${minor}.${patch} → ${newVersion}`);

// Mettre à jour la version dans pronote_api.py (backend Python)
const apiPath = path.join(__dirname, '..', 'pronote_api.py');
if (fs.existsSync(apiPath)) {
  let apiContent = fs.readFileSync(apiPath, 'utf8');
  const oldVer = `${major}.${minor}.${patch}`;
  const updated = apiContent
    .replace(new RegExp(`Version: ${oldVer.replace(/\./g, '\\.')}`, 'g'), `Version: ${newVersion}`)
    .replace(new RegExp(`"version": "${oldVer.replace(/\./g, '\\.')}"`, 'g'), `"version": "${newVersion}"`)
    .replace(new RegExp(`v${oldVer.replace(/\./g, '\\.')}`, 'g'), `v${newVersion}`);
  if (updated !== apiContent) {
    fs.writeFileSync(apiPath, updated);
    console.log(`  Mis à jour : pronote_api.py`);
  }
}

// Mettre à jour la version dans postinst.sh
const postinstPath = path.join(__dirname, '..', 'build-resources', 'postinst.sh');
if (fs.existsSync(postinstPath)) {
  let content = fs.readFileSync(postinstPath, 'utf8');
  const oldVer = `${major}.${minor}.${patch}`;
  const updated = content.replace(new RegExp(oldVer.replace(/\./g, '\\.'), 'g'), newVersion);
  if (updated !== content) {
    fs.writeFileSync(postinstPath, updated);
    console.log(`  Mis à jour : build-resources/postinst.sh`);
  }
}

console.log(`\nNote: Les fichiers .tsx utilisent {__APP_VERSION__} (injecté par vite.config.ts).`);
console.log(`Aucune mise à jour manuelle des fichiers frontend requise.`);
