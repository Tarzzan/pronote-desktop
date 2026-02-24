# Pronote Desktop v1.0.1 — Documentation Complète

**Auteur :** Manus AI
**Date :** 24 février 2026

## 1. Introduction

Pronote Desktop est une application de bureau non officielle, open-source, conçue pour offrir une expérience native et améliorée de la plateforme de vie scolaire Pronote. Elle est développée pour fonctionner sur les systèmes d'exploitation Linux (Ubuntu/Debian) et macOS.

L'application vise à reproduire l'ensemble des fonctionnalités de la version web tout en y ajoutant des améliorations de performance, une meilleure intégration au système d'exploitation (notifications natives, etc.) et une interface utilisateur plus réactive et moderne.

## 2. Installation (Ubuntu/Debian)

L'installation se fait via le paquet `.deb` fourni.

### Prérequis

Aucun prérequis majeur n'est nécessaire, les dépendances sont automatiquement gérées par le paquet.

### Mode opératoire

1.  **Télécharger le paquet** `pronote-desktop_1.0.1_amd64.deb`.
2.  **Ouvrir un terminal** dans le dossier de téléchargement.
3.  **Exécuter la commande d'installation** :

    ```bash
    sudo dpkg -i pronote-desktop_1.0.1_amd64.deb
    ```

4.  Si des dépendances sont manquantes, exécutez la commande suivante pour les installer automatiquement :

    ```bash
    sudo apt-get install -f
    ```

5.  L'application sera alors disponible dans votre menu d'applications sous le nom "Pronote Desktop".

## 3. Fonctionnalités

L'application implémente les modules principaux de Pronote, accessibles via une barre latérale de navigation.

| Module | Description |
| :--- | :--- |
| **Tableau de bord** | Vue d'ensemble de la journée : prochains cours, derniers devoirs, messages et informations. |
| **Emploi du temps** | Affichage de l'emploi du temps par jour, semaine ou mois. |
| **Notes** | Consultation des notes et des moyennes par matière et par période (trimestre/semestre). |
| **Cahier de textes** | Liste des devoirs à faire et faits, avec la possibilité de marquer un devoir comme terminé. |
| **Messagerie** | Consultation des discussions, envoi et réception de messages. |
| **Vie scolaire** | Suivi des absences, retards et sanctions. |
| **Informations & Sondages** | Accès aux actualités et sondages publiés par l'établissement. |

### Fonctionnalités additionnelles

*   **Thème sombre (Dark Mode)** : L'interface peut basculer entre un thème clair et un thème sombre.
*   **Notifications natives** : (À venir) Intégration avec le système de notifications du bureau.
*   **Mode hors-ligne** : (À venir) Consultation des données précédemment chargées sans connexion internet.

## 4. Stack Technique

L'application est construite sur un ensemble de technologies web modernes, packagées pour le bureau avec Electron.

*   **Framework Frontend** : React 18 avec TypeScript
*   **Bundler** : Vite
*   **Styling** : Tailwind CSS
*   **Gestion d'état** : Zustand
*   **Routing** : React Router
*   **Packaging natif** : Electron & Electron Builder

## 5. Prompt Codex Amélioré

Voici un prompt amélioré et structuré pour être fourni à un agent de développement comme Codex, afin de reproduire ou d'améliorer cette application.

> **Objectif :** Développer une application de bureau multiplateforme (Linux/macOS) nommée "Pronote Desktop" qui agit comme un client natif pour la plateforme Pronote. L'application doit être sécurisée, performante, et offrir une expérience utilisateur supérieure à la version web.
>
> **Stack technique imposée :**
> *   **Packaging :** Electron
> *   **Frontend :** React 18 + TypeScript
> *   **Styling :** Tailwind CSS
> *   **État global :** Zustand
> *   **API :** Utiliser une couche de communication basée sur `axios` pour interagir avec l'API non-documentée de Pronote, en s'inspirant de projets existants comme `pronotepy` pour la logique de chiffrement (AES-256-CBC) et la structure des appels.
>
> **Fonctionnalités clés à implémenter :**
> 1.  **Module d'Authentification Complet :**
>     *   Login via identifiant/mot de passe.
>     *   Login via QR Code (authentification OTP).
>     *   Gestion sécurisée et persistante de la session (localStorage).
> 2.  **Interface Utilisateur (UI) :**
>     *   Créer une interface responsive avec une barre de navigation latérale (sidebar) listant tous les modules.
>     *   Implémenter un thème clair et un thème sombre (dark mode).
> 3.  **Modules Pronote :**
>     *   **Tableau de bord :** Vue d'accueil synthétique.
>     *   **Emploi du temps :** Affichage calendaire.
>     *   **Notes :** Affichage des notes et moyennes.
>     *   **Cahier de textes :** Gestion des devoirs.
>     *   **Messagerie :** Interface de discussion.
>     *   **Vie Scolaire :** Suivi des absences/retards.
> 4.  **Packaging et Déploiement :**
>     *   Configurer `electron-builder` pour générer des paquets `.deb` (Debian/Ubuntu) et `.dmg` (macOS).
>     *   Inclure une icône d'application et des métadonnées appropriées.
>     *   Mettre en place un script de versioning automatique qui incrémente la version à chaque build.
>
> **Mode opératoire pour le développement :**
> 1.  Initialiser un projet Vite (React + TypeScript).
> 2.  Ajouter et configurer Electron, Electron Builder et Tailwind CSS.
> 3.  Développer la couche API pour communiquer avec Pronote.
> 4.  Implémenter le module d'authentification et le store Zustand.
> 5.  Développer chaque module fonctionnel comme une page distincte avec React Router.
> 6.  Tester exhaustivement chaque fonctionnalité en utilisant un compte de démonstration.
> 7.  Configurer le build et générer les paquets d'installation.

