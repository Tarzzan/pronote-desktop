<!-- Bannière principale -->
<div align="center">
  <img src="https://files.manuscdn.com/user_upload_by_module/session_file/92503813/aNzQjGwkBjkpmmsA.svg" alt="Bannière Pronote Desktop"/>
</div>

<!-- Badges dynamiques -->
<div align="center">
  <img src="https://img.shields.io/github/v/release/Tarzzan/pronote-desktop?style=for-the-badge&color=e94560&label=Version" alt="Version"/>
  <img src="https://img.shields.io/github/downloads/Tarzzan/pronote-desktop/total?style=for-the-badge&color=f5a623&label=Téléchargements" alt="Téléchargements"/>
  <img src="https://img.shields.io/github/license/Tarzzan/pronote-desktop?style=for-the-badge&color=a8d8ea&label=Licence" alt="Licence"/>
  <img src="https://img.shields.io/github/workflow/status/Tarzzan/pronote-desktop/Build%20&%20Release%20Pronote%20Desktop?style=for-the-badge&label=Build" alt="Build Status"/>
</div>

<br/>

<!-- Bouton de téléchargement principal -->
<div align="center">

  <a href="https://github.com/Tarzzan/pronote-desktop/releases/download/v1.7.13/pronote-desktop_1.7.13_amd64.deb">
    <img src="https://img.shields.io/badge/⬇️_Télécharger_v1.7.13-.deb_102.9_MB-e94560?style=for-the-badge&logo=linux&logoColor=white" alt="Télécharger le .deb"/>
  </a>

  <a href="https://github.com/Tarzzan/pronote-desktop/releases/latest">
    <img src="https://img.shields.io/badge/Toutes_les_versions-GitHub_Releases-0f3460?style=for-the-badge&logo=github" alt="Toutes les releases"/>
  </a>

  <br/><sub>🐧 Ubuntu 22.04 / 24.04 · Debian 11+ · amd64 · 102.9 MB</sub>

</div>

<br/>

<!-- Séparateur visuel -->
<img src="https://files.manuscdn.com/user_upload_by_module/session_file/92503813/prmnAepEdDPLcabJ.svg" alt="Séparateur"/>

## 🎓 Un client Pronote moderne pour les professeurs sur Linux

**Pronote Desktop** est une application de bureau **non officielle**, open-source et moderne qui permet aux professeurs d’accéder à leur espace Pronote directement depuis un environnement Linux (Debian/Ubuntu).

Elle offre une expérience utilisateur fluide, réactive et enrichie par rapport à l’interface web traditionnelle, tout en étant packagée comme une application native.

<br/>

<!-- Visuel des fonctionnalités -->
<div align="center">
  <img src="https://files.manuscdn.com/user_upload_by_module/session_file/92503813/FHAVcCKJeEFVOjjk.svg" alt="Fonctionnalités"/>
</div>

<br/>

<!-- Séparateur visuel -->
<img src="https://files.manuscdn.com/user_upload_by_module/session_file/92503813/prmnAepEdDPLcabJ.svg" alt="Séparateur"/>

## 🚀 Installation (Ubuntu / Debian)

<details>
<summary>Cliquez pour voir les instructions d'installation</summary>

### Méthode 1 : Installation automatique (recommandé)

1.  **Téléchargez le dernier paquet `.deb`** depuis la [page des Releases](https://github.com/Tarzzan/pronote-desktop/releases/latest).
2.  **Double-cliquez** sur le fichier `.deb` pour l’ouvrir avec l’installateur de paquets de votre système.
3.  Cliquez sur **Installer**.

### Méthode 2 : En ligne de commande

```bash
# Télécharger la dernière version
wget https://github.com/Tarzzan/pronote-desktop/releases/download/v1.7.13/pronote-desktop_1.7.13_amd64.deb

# Installer le paquet
sudo dpkg -i pronote-desktop_1.7.13_amd64.deb

# Résoudre les dépendances si nécessaire
sudo apt-get install -f
```

Une fois installé, l’application est disponible dans votre menu `Applications → Éducation → Pronote Desktop`.

</details>

<br/>

<!-- Séparateur visuel -->
<img src="https://files.manuscdn.com/user_upload_by_module/session_file/92503813/prmnAepEdDPLcabJ.svg" alt="Séparateur"/>

## 🛠️ Stack Technique

<details>
<summary>Cliquez pour voir la stack technique</summary>

| Couche | Technologie | Rôle |
|---|---|---|
| 🖥️ **Interface** | React, TypeScript, Vite | Composants UI, typage statique, build |
| 🎨 **Style** | Tailwind CSS | Styles utilitaires |
| 🗃️ **État** | Zustand | Gestion d’état global |
| 🏠 **Desktop** | Electron | Shell natif Linux |
| 🌐 **API Pronote** | `pronotepy` | Bibliothèque Python Pronote |
| 🔌 **Backend** | Flask, Flask-CORS | Serveur API local (proxy) |

</details>

<br/>

<!-- Séparateur visuel -->
<img src="https://files.manuscdn.com/user_upload_by_module/session_file/92503813/prmnAepEdDPLcabJ.svg" alt="Séparateur"/>

## 🤝 Contribuer & Signaler un Bug

Ce projet est ouvert aux contributions ! N’hésitez pas à **forker le dépôt** et à ouvrir une **Pull Request**.

<div align="center">
  <a href="https://github.com/Tarzzan/pronote-desktop/issues/new?template=bug_report.md">
    <img src="https://img.shields.io/badge/Signaler_un_bug-e94560?style=for-the-badge&logo=github" alt="Signaler un bug"/>
  </a>
  <a href="https://github.com/Tarzzan/pronote-desktop/issues/new?template=feature_request.md">
    <img src="https://img.shields.io/badge/Proposer_une_idée-f5a623?style=for-the-badge&logo=github" alt="Proposer une idée"/>
  </a>
</div>

<br/>

<!-- Séparateur visuel -->
<img src="https://files.manuscdn.com/user_upload_by_module/session_file/92503813/prmnAepEdDPLcabJ.svg" alt="Séparateur"/>

## 📜 Licence

MIT — Ce projet est une application cliente **non officielle**. Pronote est une marque déposée d’Index Éducation. Ce projet n’est pas affilié à [Index Education](https://www.index-education.com/).
