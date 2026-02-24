# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

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

[1.2.0]: https://github.com/Tarzzan/pronote-desktop/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Tarzzan/pronote-desktop/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/Tarzzan/pronote-desktop/releases/tag/v1.0.1
