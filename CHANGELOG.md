# Changelog

## [1.7.0] — 2026-02-25
### 🐛 Correctifs Critiques (Rapport Confrère)
- **Dépendances Python 3.12** : le script d'installation (`postinst.sh`) a été rendu plus robuste. Il détecte la version de Python, utilise `--system-site-packages` pour une meilleure compatibilité, et inclut un fallback réseau pour `pip` si les wheels hors-ligne échouent, garantissant le démarrage sur Ubuntu 22.04 et 24.04.
- **API Hardcodée (`127.0.0.1`)** : l'URL de l'API dans le client TypeScript (`src/lib/pronote/client.ts`) est maintenant relative (`window.location.origin + '/api'`). Cela permet à l'application d'être accessible depuis le réseau local (LAN/WAN), par exemple sur un téléphone.
- **UI non servie (404 sur `/`)** : le serveur Flask (`pronote_api.py`) sert maintenant correctement l'interface React. La configuration de Vite (`vite.config.ts`) a été ajustée pour générer des chemins d'assets absolus, et le fallback SPA de Flask a été amélioré pour servir les fichiers statiques et `index.html`.
- **Bind Backend Configurable** : le serveur Flask écoute désormais sur l'hôte défini par `api_host` dans `config.json` (par défaut `127.0.0.1`). Pour un accès réseau, il suffit de le changer pour `0.0.0.0`.
- **Version UI Incohérente** : la version de l'application est maintenant injectée au moment du build depuis `package.json` dans toute l'interface. Fini les versions hardcodées et incohérentes entre le paquet et l'UI.

### ✍️ Changelog
- **Reconstitution** : les entrées manquantes pour les versions `v1.3.1` à `v1.6.1` ont été reconstituées à partir de l'historique des commits Git.
- **Processus de mise à jour** : le script `bump-version.cjs` a été amélioré pour mettre à jour automatiquement la version dans `package.json`, `pronote_api.py` et `postinst.sh`, simplifiant la maintenance.

---
## [1.6.1] — 2026-02-24
### Corrigé
- **Correctifs critiques Ubuntu 24.04** : intégration de wheels Python `cp312`, configuration de Flask pour servir l'UI, et ajustement du lanceur pour utiliser le mode `--app` de Chrome.

---
## [1.6.0] — 2026-02-24
### Ajouté
- **Page Appel de présence** : interface complète pour réaliser l'appel en classe avec les statuts Présent, Absent, Retard, Exclu.
- **Page Paramètres** : configuration du port, thème, notifications et URL de l'ENT.
- **Page Nouveau message** : composition de messages avec recherche de destinataires.
- **Page Saisie de devoirs** : formulaire pour ajouter des devoirs avec une durée estimée.
- **Mémorisation des identifiants** sur la page de connexion.

---
## [1.5.0] — 2026-02-24
### Ajouté
- **Port API configurable** via `/etc/pronote-desktop/config.json`.
- **Persistance du thème** (clair/sombre) dans la configuration locale.
- **Notifications desktop** via `libnotify` pour les événements importants.
- **Icône SVG scalable** pour une meilleure qualité d'affichage.
- **Captures d'écran** pour AppStream.

---
## [1.4.0] — 2026-02-24
### Ajouté
- **Icône d'application** multi-résolution.
- **Service systemd** (`pronote-desktop-api.service`) pour un démarrage automatique du backend.
- **Vérificateur de mises à jour** non-bloquant.
- **Métadonnées AppStream** pour une meilleure intégration dans les logithèques (GNOME Software, etc.).
- **Gestion des fichiers de configuration** (`conffiles`) pour préserver les réglages utilisateur lors des mises à jour.

---
## [1.3.1] — 2026-02-24
### Corrigé
- **Compatibilité Ubuntu 24.04 (PEP 668)** : le chemin de l'environnement virtuel Python a été corrigé pour être cohérent avec les nouvelles politiques système.

---
# Changelog

## [1.7.0] — 2026-02-25
### 🐛 Correctifs Critiques (Rapport Confrère)
- **Dépendances Python 3.12** : le script d'installation (`postinst.sh`) a été rendu plus robuste. Il détecte la version de Python, utilise `--system-site-packages` pour une meilleure compatibilité, et inclut un fallback réseau pour `pip` si les wheels hors-ligne échouent, garantissant le démarrage sur Ubuntu 22.04 et 24.04.
- **API Hardcodée (`127.0.0.1`)** : l'URL de l'API dans le client TypeScript (`src/lib/pronote/client.ts`) est maintenant relative (`window.location.origin + '/api'`). Cela permet à l'application d'être accessible depuis le réseau local (LAN/WAN), par exemple sur un téléphone.
- **UI non servie (404 sur `/`)** : le serveur Flask (`pronote_api.py`) sert maintenant correctement l'interface React. La configuration de Vite (`vite.config.ts`) a été ajustée pour générer des chemins d'assets absolus, et le fallback SPA de Flask a été amélioré pour servir les fichiers statiques et `index.html`.
- **Bind Backend Configurable** : le serveur Flask écoute désormais sur l'hôte défini par `api_host` dans `config.json` (par défaut `127.0.0.1`). Pour un accès réseau, il suffit de le changer pour `0.0.0.0`.
- **Version UI Incohérente** : la version de l'application est maintenant injectée au moment du build depuis `package.json` dans toute l'interface. Fini les versions hardcodées et incohérentes entre le paquet et l'UI.

### ✍️ Changelog
- **Reconstitution** : les entrées manquantes pour les versions `v1.3.1` à `v1.6.1` ont été reconstituées à partir de l'historique des commits Git.
- **Processus de mise à jour** : le script `bump-version.cjs` a été amélioré pour mettre à jour automatiquement la version dans `package.json`, `pronote_api.py` et `postinst.sh`, simplifiant la maintenance.

---
## [1.6.1] — 2026-02-24
### Corrigé
- **Correctifs critiques Ubuntu 24.04** : intégration de wheels Python `cp312`, configuration de Flask pour servir l'UI, et ajustement du lanceur pour utiliser le mode `--app` de Chrome.

---
## [1.6.0] — 2026-02-24
### Ajouté
- **Page Appel de présence** : interface complète pour réaliser l'appel en classe avec les statuts Présent, Absent, Retard, Exclu.
- **Page Paramètres** : configuration du port, thème, notifications et URL de l'ENT.
- **Page Nouveau message** : composition de messages avec recherche de destinataires.
- **Page Saisie de devoirs** : formulaire pour ajouter des devoirs avec une durée estimée.
- **Mémorisation des identifiants** sur la page de connexion.

---
## [1.5.0] — 2026-02-24
### Ajouté
- **Port API configurable** via `/etc/pronote-desktop/config.json`.
- **Persistance du thème** (clair/sombre) dans la configuration locale.
- **Notifications desktop** via `libnotify` pour les événements importants.
- **Icône SVG scalable** pour une meilleure qualité d'affichage.
- **Captures d'écran** pour AppStream.

---
## [1.4.0] — 2026-02-24
### Ajouté
- **Icône d'application** multi-résolution.
- **Service systemd** (`pronote-desktop-api.service`) pour un démarrage automatique du backend.
- **Vérificateur de mises à jour** non-bloquant.
- **Métadonnées AppStream** pour une meilleure intégration dans les logithèques (GNOME Software, etc.).
- **Gestion des fichiers de configuration** (`conffiles`) pour préserver les réglages utilisateur lors des mises à jour.

---
## [1.3.1] — 2026-02-24
### Corrigé
- **Compatibilité Ubuntu 24.04 (PEP 668)** : le chemin de l'environnement virtuel Python a été corrigé pour être cohérent avec les nouvelles politiques système.

---
# Changelog

## [1.6.1] — 2026-02-24

### Correctifs critiques (rapport testeur Ubuntu 24.04)
- **Wheels CP312** : remplacement des wheels CP311 par des wheels compatibles Python 3.12 (Ubuntu 24.04) — corrige `ModuleNotFoundError: No module named 'pronotepy'` et l'erreur `No matching distribution found for charset-normalizer`
- **Frontend 404 corrigé** : Flask sert maintenant `index.html` et `/assets/*` directement — plus de 404 sur `http://localhost:5174`. Ajout des routes `/`, `/<path:path>` (fallback SPA) et import de `send_from_directory`
- **Launcher navigateur** : priorité à `google-chrome --app=` et `chromium-browser --app=` pour une expérience fenêtre native sans barre de navigation, fallback `xdg-open` si absent
- **postinst** : utilisation de `python3 -m venv --system-site-packages` pour garantir la compatibilité Python 3.10/3.11/3.12 — les paquets système sont utilisés en fallback si les wheels embarqués ne correspondent pas à l'ABI
- Mise à jour de la version dans `pronote_api.py` et `postinst.sh` (1.5.0 → 1.6.1)

---

## [1.6.0] — 2026-02-24

### Nouvelles fonctionnalités
- **Page Appel de présence** (`/attendance/call`) : formulaire complet avec statuts présent/absent/retard/excusé, saisie des minutes de retard, actions rapides "Tout marquer" et statistiques en temps réel
- **Page Paramètres** (`/settings`) : interface graphique pour configurer le port API, l'URL Pronote, le thème, les notifications et les mises à jour automatiques
- **Page Nouveau message** (`/messaging/new`) : composition de messages avec recherche de destinataires, objet et corps du message
- **Page Saisie des devoirs** (`/homework/edit`) : formulaire multi-devoirs avec classe, matière, type, date d'échéance et durée estimée
- **Mémorisation des identifiants** sur la page de connexion avec case à cocher "Se souvenir de moi"
- **Détection des erreurs réseau** avec message explicite et icône distincte (WifiOff) sur la page de connexion
- Lien "Paramètres" et "Nouveau message" ajoutés dans la barre de navigation latérale

### Corrections
- Version hardcodée dans `client.ts` corrigée (v1.2.0 → v1.6.0)
- Version affichée sur la page de connexion mise à jour (v1.5.0 → v1.6.0)

---

## [1.5.0] — 2026-02-24

### Corrections de bugs
- Cohérence des versions dans tous les fichiers (pronote_api.py, Sidebar, LoginPage, ErrorBoundary, PlaceholderPage étaient tous sur des versions différentes)
- Correction du dépôt GitHub hardcodé dans ErrorBoundary (`pronote-desktop/pronote-desktop` → `Tarzzan/pronote-desktop`)
- Correction TypeScript dans BulletinsPage (passage d'un objet Period au lieu d'un string à getGrades)
- Correction TypeScript dans MainLayout (type Transition de framer-motion)

### Nouvelles fonctionnalités
- **Port configurable** : le port API (5174 par défaut) est maintenant lu depuis `/etc/pronote-desktop/config.json`
- **Persistance du thème sombre** : le thème est sauvegardé dans localStorage et dans config.json
- **Notifications desktop** : nouvel endpoint `/api/notify` (POST) utilisant libnotify/notify-send
- **Endpoint /api/config** : GET pour lire la configuration, PATCH pour modifier le thème
- **Icône SVG scalable** : ajout de `pronote-desktop.svg` dans hicolor/scalable/apps
- **Captures d'écran AppStream** : 3 captures (dashboard, emploi du temps, notes) pour GNOME Software / KDE Discover
- **Dépendance libnotify-bin** déclarée dans le paquet


Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

---

## [1.4.0] — 2026-02-24

### ✨ Nouveautés

- **Icône personnalisée** : icône multi-résolution (16×16 à 512×512 + SVG scalable) installée dans `/usr/share/icons/hicolor/` — visible dans le menu Applications, le dock et les gestionnaires de fichiers
- **Service systemd** : le backend Flask démarre automatiquement avec le système via `pronote-desktop-api.service`, éliminant le délai de 2 secondes au lancement
- **Vérificateur de mises à jour** : notification non bloquante via `notify-send` si une nouvelle version est disponible sur GitHub
- **Métadonnées AppStream** : fichier `fr.pronote.desktop.metainfo.xml` conforme au standard Freedesktop — description riche, captures d'écran et historique des versions pour les centres d'applications (GNOME Software, KDE Discover)
- **Configuration persistante** : `/etc/pronote-desktop/config.json` préservé lors des mises à jour grâce au mécanisme `conffiles`

### 🔧 Technique

- Script `preinst` : sauvegarde de l'ancien venv lors d'un `upgrade` pour rollback possible
- Script `postrm` : arrêt et suppression propre du service systemd et du venv
- Installation offline conservée : 19 wheels Python embarqués, aucun appel réseau

---

## [1.3.1] — 2026-02-24

### 🐛 Corrections

- **Correction critique Ubuntu 24.04+** : le script d'installation créait un environnement virtuel Python dans `/opt/pronote-desktop` mais le script de lancement cherchait dans `/usr/lib/pronote-desktop`. Les deux chemins sont maintenant cohérents (`/usr/lib/pronote-desktop/python-env`).
- **Compatibilité PEP 668** : les dépendances Python (pronotepy, flask, flask-cors) sont installées dans un environnement virtuel isolé au lieu du système, évitant l'erreur `externally-managed-environment` sur Ubuntu 24.04+.
- **Script de lancement amélioré** : utilise automatiquement le venv si disponible, sinon bascule sur Python système en fallback.

---

## [1.3.0] — 2026-02-24

### ✨ Nouveautés

- **Page Bulletins scolaires** : affichage des résultats par période avec appréciations, graphique de profil (RadarChart) et sélecteur de trimestre/semestre
- **Page Compétences** : grille d'évaluation par référentiel avec niveaux colorés (Maîtrise insuffisante → Très bonne maîtrise)
- **Page QCM interactifs** : exercices à choix multiples avec progression, score final et correction instantanée
- **Graphiques dashboard** : PieChart (répartition des cours de la semaine) et BarChart (devoirs par matière) via `recharts`
- **Animations de page** : transitions fade-in/fade-out avec `framer-motion`
- **Sidebar améliorée** : icônes SVG colorées par catégorie, badges de notification animés, effets de survol

### 📸 Documentation

- Screenshots de toutes les pages intégrés dans le README
- Wiki GitHub créé avec 3 pages : Guide d'installation, Guide utilisateur, Guide développeur
- CHANGELOG mis à jour

### 🔧 Technique

- Ajout de `recharts` et `framer-motion` comme dépendances de production
- Nouvelles routes : `/bulletins`, `/competences/referentiels`, `/qcm`
- Versioning automatique incrémenté à 1.3.0

---

## [1.2.0] — 2026-02-24

### Corrigé
- **Bug critique CSS** : suppression du reset `* { box-sizing: border-box; margin: 0; padding: 0 }` dans `index.css` qui était injecté après les classes Tailwind dans le bundle de production, écrasant tous les paddings et marges. Toutes les pages s'affichent maintenant correctement.
- **Authentification** : correction de la gestion d'état Zustand — le client Pronote ne se perdait plus silencieusement après un rechargement de page.
- **Gestion d'erreurs** : les erreurs réseau affichent maintenant un message clair avec un bouton "Réessayer" au lieu d'un spinner infini.

### Ajouté
- **Backend Python Flask** (`pronote_api.py`) : serveur API local qui fait le pont entre le frontend TypeScript et la bibliothèque pronotepy. Remplace les données statiques hardcodées par de vrais appels à l'API Pronote.
- **ErrorBoundary React** : capture toutes les erreurs non gérées dans les composants React et affiche une interface de récupération avec un bouton "Signaler sur GitHub" qui ouvre une Issue pré-remplie.
- **Remontée d'erreurs Electron** : le processus principal Electron intercepte les crashs non gérés et propose le même mécanisme de signalement.

### Modifié
- Version affichée dans la sidebar et la page de connexion : `v1.1.0` → `v1.2.0`
- `package.json` : version mise à jour à `1.2.0`

---

## [1.1.0] — 2026-02-24

### Corrigé
- **Données statiques** : toutes les méthodes du client API (`getLessons`, `getGrades`, `getHomework`, etc.) retournaient des tableaux hardcodés. Elles effectuent maintenant de vrais appels à l'API Pronote via pronotepy.
- **Authentification fragile** : `clientInstance` était une variable globale non réactive. Remplacé par un store Zustand correctement initialisé avec persistance dans `localStorage`.

### Ajouté
- **GitHub Action CI/CD** (`.github/workflows/build.yml`) : build automatique du `.deb` sur chaque push sur `main`, et création d'une Release GitHub sur chaque tag `v*`.
- **Script de versioning** (`scripts/bump-version.cjs`) : incrémente automatiquement la version patch dans `package.json` et les fichiers source.
- **Gestion d'erreurs réseau** : messages d'erreur explicites (timeout, identifiants incorrects, serveur inaccessible) avec bouton "Réessayer".

### Modifié
- `electron/main.cjs` : ajout de `electron-unhandled` pour la capture des crashs non gérés.
- `electron/preload.cjs` : exposition sécurisée de `shell.openExternal` pour l'ouverture des Issues GitHub.

---

## [1.0.1] — 2026-02-24

### Ajouté
- Première version publique de Pronote Desktop.
- **Tableau de bord** : vue synthétique des cours du jour, devoirs à venir, messages non lus, informations récentes.
- **Emploi du temps** : planning hebdomadaire avec navigation par semaine, affichage des matières, horaires et salles.
- **Notes** : relevé de notes par trimestre avec moyennes, coefficients, maximum et minimum de classe.
- **Cahier de textes** : liste des devoirs avec filtres (Tous / À faire / Faits) et marquage comme fait.
- **Messagerie** : liste des discussions avec lecture du contenu et champ de réponse.
- **Vie scolaire** : liste des absences et retards avec statut de justification.
- **Informations & sondages** : liste des informations de l'établissement avec expansion du contenu.
- **Dark mode** : bascule clair/sombre persistante dans le header.
- **Sidebar responsive** : navigation latérale avec 13 sections et sous-menus dépliables.
- **Authentification QR Code (OTP)** : connexion par QR Code Pronote en plus du login classique.
- **Paquet .deb** : installable sur Ubuntu/Debian via `dpkg -i`.

---

[1.0.1]: https://github.com/Tarzzan/pronote-desktop/releases/tag/v1.0.1
[1.1.0]: https://github.com/Tarzzan/pronote-desktop/compare/v1.0.1...v1.1.0
[1.2.0]: https://github.com/Tarzzan/pronote-desktop/compare/v1.1.0...v1.2.0
[1.3.0]: https://github.com/Tarzzan/pronote-desktop/compare/v1.2.0...v1.3.0
[1.3.1]: https://github.com/Tarzzan/pronote-desktop/compare/v1.3.0...v1.3.1
[1.4.0]: https://github.com/Tarzzan/pronote-desktop/compare/v1.3.1...v1.4.0
[1.5.0]: https://github.com/Tarzzan/pronote-desktop/compare/v1.4.0...v1.5.0
[1.6.0]: https://github.com/Tarzzan/pronote-desktop/compare/v1.5.0...v1.6.0
[1.6.1]: https://github.com/Tarzzan/pronote-desktop/compare/v1.6.0...v1.6.1
[1.7.0]: https://github.com/Tarzzan/pronote-desktop/compare/v1.6.1...v1.7.0