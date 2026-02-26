# PRONOTE Desktop — Version Native GTK4

> **Branche expérimentale** — Ce dossier contient le portage natif Linux de PRONOTE Desktop, basé sur GTK4 et Python. Il coexiste avec la version Electron stable dans ce dépôt.

## Architecture

```
native/
├── main.py                  # Point d'entrée GTK4/Libadwaita
├── app_state.py             # État global (GObject, signaux, multi-profils)
├── content_area.py          # Zone de contenu avec Lazy Loading
├── sidebar.py               # Navigation adaptée au profil
├── login_page.py            # Connexion avec détection automatique du profil
├── update_manager.py        # Vérification des mises à jour via l'API GitHub
├── style.css                # Thème visuel (bleu marine, fidèle à l'original)
├── requirements.txt         # Dépendances Python
└── pages/
    ├── dashboard_page.py    # Tableau de bord
    ├── timetable_page.py    # Emploi du temps
    ├── homework_page.py     # Devoirs
    ├── grades_page.py       # Notes
    ├── messages_page.py     # Messagerie
    ├── absences_page.py     # Absences
    ├── information_page.py  # Informations
    ├── menus_page.py        # Menus cantine
    ├── teacher_classes_page.py  # Classes (Professeur)
    └── teacher_grades_page.py   # Notes de classe (Professeur)
```

## Profils utilisateurs supportés

| Profil | Client pronotepy | Fonctionnalités spécifiques |
|---|---|---|
| **Élève** | `pronotepy.Client` | Notes, devoirs, absences, menus |
| **Parent** | `pronotepy.ParentClient` | Sélecteur d'enfant, accès aux données de l'enfant |
| **Professeur** | `pronotepy.TeacherClient` | Liste des classes, notes de classe |

## Installation

```bash
# 1. Dépendances système
sudo apt install python3-gi python3-gi-cairo gir1.2-gtk-4.0 gir1.2-adw-1

# 2. Dépendances Python
pip install -r native/requirements.txt

# 3. Lancement
cd native && python3 main.py
```

## Améliorations clés vs v1 (Electron)

- **Lazy Loading** : les pages sont instanciées uniquement lors de la première visite — démarrage < 1s.
- **Signal GObject** `logout-requested` : déconnexion propre avec libération de la mémoire.
- **Contrôle d'accès par profil** : chaque page vérifie le profil avant d'être affichée.
- **Taille** : ~15 MB vs ~200 MB pour Electron.

## Statut

| Fonctionnalité | Statut |
|---|---|
| Connexion multi-profils | ✅ Implémenté |
| Lazy Loading des pages | ✅ Implémenté |
| Emploi du temps | ✅ Implémenté |
| Notes et devoirs | ✅ Implémenté |
| Messagerie | ✅ Implémenté |
| Persistance de session | 🔄 En cours |
| Thème sombre | 🔄 En cours |
| Paquet .deb autonome | 🔄 En cours |
