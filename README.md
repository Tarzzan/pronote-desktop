<p align="center">
  <b>PRONOTE Desktop</b>
</p>

<h1 align="center">Pronote Desktop</h1>

<p align="center">
  Application native <strong>Pronote</strong> pour Linux et macOS<br/>
  Accédez à votre espace Pronote directement depuis votre bureau, sans navigateur.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.0-blue?style=flat-square"/>
  <img src="https://img.shields.io/badge/platform-Linux%20%7C%20macOS-lightgrey?style=flat-square"/>
  <img src="https://img.shields.io/badge/electron-40.x-47848F?style=flat-square&logo=electron"/>
  <img src="https://img.shields.io/badge/react-19.x-61DAFB?style=flat-square&logo=react"/>
  <img src="https://img.shields.io/badge/typescript-5.9-3178C6?style=flat-square&logo=typescript"/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square"/>
</p>

---

## Fonctionnalités

- **Tableau de bord** — Vue synthétique des cours du jour, devoirs, messages et informations
- **Emploi du temps** — Visualisation hebdomadaire des cours avec statuts (annulé, déplacé, etc.)
- **Notes** — Relevé de notes par trimestre avec moyennes, coefficients, max et min de classe
- **Cahier de textes** — Devoirs à faire avec filtres et marquage comme fait/non fait
- **Messagerie** — Discussions complètes avec réponse intégrée et recherche
- **Vie scolaire** — Suivi des absences et retards avec statut de justification
- **Informations & sondages** — Informations de l'établissement avec catégories
- **Authentification OTP** — Connexion par QR Code en plus du login classique
- **Dark mode** — Thème clair/sombre persistant
- **Remontée d'erreurs** — Signalement automatique des bugs vers GitHub Issues

---

## Installation

### Ubuntu / Debian (recommandé)

Téléchargez le dernier `.deb` depuis les [Releases](https://github.com/Tarzzan/pronote-desktop/releases) :

```bash
sudo dpkg -i pronote-desktop_1.1.0_amd64.deb
sudo apt-get install -f
```

L'application apparaît dans le menu **Éducation** de votre bureau.

---

## Développement

### Prérequis

- Node.js 22+
- pnpm 10+

### Installation des dépendances

```bash
git clone https://github.com/Tarzzan/pronote-desktop.git
cd pronote-desktop
pnpm install
```

### Démarrer en mode développement

```bash
pnpm dev
```

### Compiler pour la production

```bash
# Incrémenter la version
node scripts/bump-version.cjs

# Build web uniquement
pnpm build:web

# Build .deb complet
pnpm build:deb
```

---

## Architecture

```
pronote-desktop/
├── electron/           # Processus principal Electron
│   ├── main.cjs        # Fenêtre principale + gestion erreurs
│   └── preload.cjs     # Bridge sécurisé renderer <-> main
├── src/
│   ├── components/     # Composants réutilisables (Layout, ErrorBoundary)
│   ├── lib/
│   │   ├── pronote/    # Client API Pronote (crypto + appels réseau)
│   │   └── store/      # État global Zustand
│   ├── pages/          # Pages de l'application
│   └── types/          # Interfaces TypeScript Pronote
├── scripts/
│   └── bump-version.cjs  # Script d'incrémentation de version
└── .github/
    └── workflows/
        └── build.yml   # CI/CD : build .deb automatique
```

---

## Stack technique

| Technologie | Version | Rôle |
|---|---|---|
| Electron | 40.x | Shell natif Linux/macOS |
| React | 19.x | Interface utilisateur |
| TypeScript | 5.9 | Typage statique |
| Tailwind CSS | 4.x | Styles |
| Zustand | 5.x | Gestion d'état |
| React Router | 7.x | Navigation |
| Vite | 7.x | Bundler |
| date-fns | 4.x | Formatage des dates |

---

## Signalement de bugs

En cas d'erreur dans l'application, une boîte de dialogue s'affiche avec un bouton **"Signaler sur GitHub"** qui ouvre automatiquement une Issue pré-remplie avec la version, l'OS et la stack trace.

Vous pouvez également [ouvrir une Issue manuellement](https://github.com/Tarzzan/pronote-desktop/issues/new).

---

## Licence

MIT — Ce projet est une application cliente non officielle. Pronote est une marque déposée d'Index Éducation.
