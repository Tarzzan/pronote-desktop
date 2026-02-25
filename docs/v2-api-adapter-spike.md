# V2 Spike: API Adapter (Backend)

## Objectif
Introduire une couche d'adaptation backend entre Flask (`pronote_api.py`) et le client Pronote pour préparer une future migration (ex: refonte `pronotepy`) sans réécrire les routes.

## Implémentation réalisée

- Ajout d'un contrat `PronoteBackendAdapter` dans `pronote_api.py`.
- Ajout d'une implémentation `PronotepySyncAdapter` (comportement actuel).
- Ajout d'une factory `build_backend_adapter()` pilotée par `PRONOTE_BACKEND_ADAPTER`.
- Remplacement des accès directs à `_client` dans les routes par `_adapter`.
- Ajout d'un helper `get_selected_period()` pour centraliser la logique de sélection de période.

## Compatibilité

- Contrat JSON des endpoints conservé.
- Flux de login/logout inchangé côté frontend.
- Aucune dépendance frontend modifiée.

## Endpoints migrés vers adapter

- `/api/login`
- `/api/logout`
- `/api/timetable`
- `/api/homework`
- `/api/periods`
- `/api/grades`
- `/api/averages`
- `/api/discussions`
- `/api/informations`
- `/api/absences`
- `/api/delays`

## Validation technique

- `python3 -m py_compile pronote_api.py`: OK
- `pnpm lint`: OK
- `tsc -b`: OK

## Limites du spike

- Le mode par défaut est désormais `pronotepy-refonte`; la stratégie de rollback explicite reste `PRONOTE_BACKEND_ADAPTER=pronotepy-sync`.
- Pas encore de tests unitaires Python dédiés à l'interface adapter.
- Pas de packaging spécifique V2 dans ce spike.

## Prochaines étapes recommandées

1. Ajouter un `RefontePronotepyAdapter` derrière le même contrat.
2. Écrire des tests backend de contrat (snapshot JSON endpoints clés).
3. Ajouter instrumentation/metrics (taux échec login, latence endpoints critiques).
