#!/usr/bin/env node
/**
 * Script d'incrémentation automatique de version
 * Incrémente la version patch dans package.json à chaque build
 * Usage: node scripts/bump-version.js
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

// Mettre à jour également la version dans LoginPage.tsx et PlaceholderPage.tsx
const filesToUpdate = [
  path.join(__dirname, '..', 'src', 'pages', 'LoginPage.tsx'),
  path.join(__dirname, '..', 'src', 'pages', 'PlaceholderPage.tsx'),
  path.join(__dirname, '..', 'src', 'components', 'layout', 'Sidebar.tsx'),
];

const oldVersionStr = `v${major}.${minor}.${patch}`;
const newVersionStr = `v${newVersion}`;

filesToUpdate.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const updated = content.replace(new RegExp(oldVersionStr.replace('.', '\\.'), 'g'), newVersionStr);
    if (updated !== content) {
      fs.writeFileSync(filePath, updated);
      console.log(`  Mis à jour : ${path.basename(filePath)}`);
    }
  }
});
