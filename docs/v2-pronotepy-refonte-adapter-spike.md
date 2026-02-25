# V2 Spike: Pronotepy Refonte Adapter

## Objectif
Brancher une seconde implémentation backend sous le contrat `PronoteBackendAdapter` pour préparer la migration V2 sans régression des routes Flask existantes.

## Implémentation réalisée

- Ajout de `PronotepyRefonteAdapter` dans `pronote_api.py`.
- La connexion tente automatiquement:
  1. `pronotepy.TeacherClient` (si disponible),
  2. puis fallback sur `pronotepy.Client`.
- Sélection via variable d'environnement `PRONOTE_BACKEND_ADAPTER`:
  - `pronotepy-sync` (défaut)
  - `pronotepy-refonte`
- Option de priorité:
  - `PRONOTE_REFRONTE_PREFER_TEACHER_CLIENT=1` (défaut)
  - `PRONOTE_REFRONTE_PREFER_TEACHER_CLIENT=0` pour prioriser `Client`.

## Pourquoi ce design

- Préserve le comportement actuel par défaut (`pronotepy-sync`).
- Permet de tester une variante V2 sans modifier les routes API.
- Réduit le risque en gardant un fallback explicite quand `TeacherClient` n'est pas présent.

## Validation technique

- `python3 -m py_compile pronote_api.py`
- `pnpm lint`
- `tsc -b`

## Limites du spike

- Pas encore de tests unitaires Python dédiés à la factory adapter.
- Pas de métriques backend (latence/login failure rate) ajoutées dans ce spike.

## Étapes suivantes recommandées

1. Ajouter des tests de contrat API backend (login, timetable, periods).
2. Ajouter une télémétrie simple sur les erreurs de login par adapter.
3. Définir les critères de bascule progressive vers `pronotepy-refonte`.
