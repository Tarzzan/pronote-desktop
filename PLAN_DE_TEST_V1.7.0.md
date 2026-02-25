# Plan de Test — Pronote Desktop v1.7.0

**Date :** 2026-02-25
**Version :** 1.7.0
**Auteur :** Manus AI

## 1. Introduction

Ce document détaille le plan de test pour la validation des correctifs et améliorations apportés dans la version 1.7.0 de Pronote Desktop. L'objectif est de s'assurer que les problèmes identifiés dans le rapport du 24/02/2026 sont résolus et qu'aucune régression n'a été introduite.

Les tests couvrent 6 axes principaux, correspondant aux 6 correctifs implémentés.

## 2. Environnements de Test

| OS | Version | Architecture | Python | Scénario |
|---|---|---|---|---|
| Ubuntu Desktop | 24.04 LTS | amd64 | 3.12 | Validation du fix principal (compatibilité PEP 668) |
| Ubuntu Desktop | 22.04 LTS | amd64 | 3.10 | Validation de la rétrocompatibilité |
| Machine Virtuelle | Debian 12 | amd64 | 3.11 | Validation sur un autre OS basé sur Debian |

## 3. Plan de Test Détaillé

### Axe 1 : Dépendances Python et Installation

**Objectif :** Valider la robustesse du script d'installation (`postinst.sh`) sur différentes versions d'Ubuntu, avec et sans accès Internet.

| ID Test | Scénario | Type | Environnement | Étapes | Résultat Attendu |
|---|---|---|---|---|---|
| **1.1** | Installation offline sur Ubuntu 24.04 | Intégration | Ubuntu 24.04 (sans Internet) | 1. Désactiver l'accès réseau.\n2. Installer le `.deb` : `sudo dpkg -i pronote-desktop_1.7.0_offline_amd64.deb`.\n3. Lancer l'application. | L'application démarre. Le venv est créé avec les wheels `cp312` fournies ou celles du système. Pas d'erreur `ModuleNotFoundError`. |
| **1.2** | Installation online sur Ubuntu 24.04 | Intégration | Ubuntu 24.04 (avec Internet) | 1. Simuler une absence de wheel `charset-normalizer` pour `cp312` dans `/usr/lib/pronote-desktop/wheels`.\n2. Installer le `.deb`.\n3. Observer les logs d'installation (`/var/log/apt/term.log`). | Le script `postinst.sh` doit détecter l'échec de l'installation offline et basculer sur `pip install charset-normalizer` via le réseau. L'application démarre. |
| **1.3** | Installation offline sur Ubuntu 22.04 | Régression | Ubuntu 22.04 (sans Internet) | 1. Désactiver l'accès réseau.\n2. Installer le `.deb`.\n3. Lancer l'application. | L'application démarre sans erreur, en utilisant les wheels `cp310` ou `cp311` du système ou fournies. |
| **1.4** | Migration de configuration | Intégration | Ubuntu 22.04 | 1. Installer une version antérieure (ex: 1.6.0).\n2. Configurer le port.\n3. Mettre à jour vers la v1.7.0.\n4. Vérifier `/etc/pronote-desktop/config.json`. | Le fichier de configuration doit maintenant contenir la clé `"api_host": "127.0.0.1"` sans écraser les autres réglages. |

### Axe 2 : Service de l'UI (Flask & Vite)

**Objectif :** S'assurer que le backend Flask sert correctement l'interface utilisateur React, y compris les assets et le fallback pour la navigation SPA.

| ID Test | Scénario | Type | Environnement | Étapes | Résultat Attendu |
|---|---|---|---|---|---|
| **2.1** | Accès à la racine | Manuel | Navigateur (Chrome, Firefox) | 1. Lancer l'application.\n2. Ouvrir `http://127.0.0.1:5174` dans le navigateur. | La page de connexion s'affiche correctement, sans erreur 404. Les assets (CSS, JS) sont chargés avec un code 200. |
| **2.2** | Accès direct à une route profonde | Manuel | Navigateur | 1. Lancer l'application.\n2. Ouvrir `http://127.0.0.1:5174/cahier-de-textes`. | L'application doit charger, se connecter (si identifiants mémorisés), et afficher directement la page du cahier de textes. Pas de 404. |
| **2.3** | Vérification des chemins d'assets | Manuel | Outils de développement du navigateur | 1. Ouvrir la page.\n2. Inspecter l'onglet "Réseau". | Les requêtes pour les fichiers JS/CSS doivent être vers `/assets/fichier.js` (chemin absolu) et non `assets/fichier.js` (relatif). |

### Axe 3 : Accès Réseau (API non hardcodée)

**Objectif :** Valider que l'application est accessible et fonctionnelle depuis une autre machine sur le même réseau local (LAN).

| ID Test | Scénario | Type | Environnement | Étapes | Résultat Attendu |
|---|---|---|---|---|---|
| **3.1** | Accès LAN | Intégration | 2 machines sur le même LAN | 1. **Machine A (Serveur) :** Modifier `/etc/pronote-desktop/config.json` pour mettre `"api_host": "0.0.0.0"`.\n2. Redémarrer le service : `sudo systemctl restart pronote-desktop-api`.\n3. Obtenir l'IP locale de la machine A (ex: `192.168.1.50`).\n4. **Machine B (Client) :** Ouvrir `http://192.168.1.50:5174` dans un navigateur. | La page de connexion s'affiche. La connexion et la navigation dans l'application sont entièrement fonctionnelles. Les appels API dans l'onglet réseau vont vers `http://192.168.1.50:5174/api/...`. |
| **3.2** | Retour au mode local | Régression | Machine A | 1. Remettre `"api_host": "127.0.0.1"` dans la configuration.\n2. Redémarrer le service.\n3. Accéder à `http://127.0.0.1:5174`. | L'application fonctionne normalement en local. L'accès depuis la machine B est maintenant impossible. |

### Axe 4 : Cohérence de la Version Affichée

**Objectif :** Vérifier que la version affichée dans l'interface utilisateur est dynamique et correspond à la version du paquet.

| ID Test | Scénario | Type | Manuel | Étapes | Résultat Attendu |
|---|---|---|---|---|---|
| **4.1** | Vérification de la version UI | Manuel | Navigateur | 1. Lancer l'application.\n2. Noter la version sur la page de connexion.\n3. Se connecter.\n4. Noter la version dans la sidebar en bas à gauche. | Les deux versions affichées doivent être **1.7.0**. |
| **4.2** | Vérification de l'endpoint Health | API | `curl` ou navigateur | 1. Accéder à `http://127.0.0.1:5174/api/health`. | La réponse JSON doit contenir `"version": "1.7.0"`. |
| **4.3** | Test de la variable d'environnement | Unitaire | Build local | 1. Modifier `package.json` pour mettre la version `1.8.0-test`.\n2. Recompiler le projet : `pnpm build`.\n3. Lancer l'application en mode dev.\n4. Vérifier les points 4.1 et 4.2. | La version affichée doit être **1.8.0-test** partout. |

### Axe 5 : Bind Backend Configurable

**Objectif :** Confirmer que le serveur Flask écoute sur l'interface réseau spécifiée dans le fichier de configuration.

| ID Test | Scénario | Type | Intégration | Étapes | Résultat Attendu |
|---|---|---|---|---|---|
| **5.1** | Bind sur `127.0.0.1` (défaut) | Intégration | Machine A | 1. S'assurer que `api_host` est `127.0.0.1` ou absent du `config.json`.\n2. Lancer le service.\n3. Exécuter `ss -tlnp | grep 5174`. | La sortie doit montrer que le processus Python écoute sur `127.0.0.1:5174` et non `0.0.0.0:5174`. |
| **5.2** | Bind sur `0.0.0.0` | Intégration | Machine A | 1. Mettre `"api_host": "0.0.0.0"` dans le `config.json`.\n2. Redémarrer le service.\n3. Exécuter `ss -tlnp | grep 5174`. | La sortie doit montrer que le processus Python écoute sur `0.0.0.0:5174` (ou `*:5174`). |

### Axe 6 : Changelog

**Objectif :** S'assurer que le changelog est complet, correctement formaté et que le processus de mise à jour est clair.

| ID Test | Scénario | Type | Manuel | Étapes | Résultat Attendu |
|---|---|---|---|---|---|
| **6.1** | Vérification du fichier `CHANGELOG.md` | Manuel | Lecteur de texte / IDE | 1. Ouvrir le fichier `CHANGELOG.md` dans le dépôt. | Le fichier doit contenir des entrées pour les versions 1.7.0, 1.6.1, 1.6.0, 1.5.0, 1.4.0, et 1.3.1. Les liens de comparaison en bas du fichier doivent être corrects. |
| **6.2** | Vérification de la Release GitHub | Manuel | Navigateur | 1. Aller sur la page des [Releases](https://github.com/Tarzzan/pronote-desktop/releases) du projet. | Une release `v1.7.0` doit exister avec des notes de version claires et un tableau récapitulatif des correctifs. |

## 4. Tests de Régression

**Objectif :** Valider que les fonctionnalités existantes n'ont pas été cassées par les nouveaux correctifs.

| ID Test | Scénario | Type | Manuel | Étapes | Résultat Attendu |
|---|---|---|---|---|---|
| **R.1** | Cycle de vie complet de l'authentification | Manuel | Navigateur | 1. Se connecter avec des identifiants valides.\n2. Naviguer sur plusieurs pages.\n3. Se déconnecter.\n4. Recharger la page. | La connexion, la navigation et la déconnexion doivent fonctionner sans erreur. Après rechargement, l'utilisateur doit être sur la page de connexion. |
| **R.2** | Fonctionnalités principales | Manuel | Navigateur | 1. Se connecter.\n2. Consulter l'emploi du temps.\n3. Consulter les notes et les devoirs.\n4. Envoyer un message via la messagerie. | Toutes les fonctionnalités doivent être opérationnelles et afficher des données cohérentes. |
| **R.3** | Thème clair/sombre | Manuel | Navigateur | 1. Changer le thème via le bouton dans le header.\n2. Recharger la page. | Le thème change instantanément. Le choix est conservé après rechargement. |
