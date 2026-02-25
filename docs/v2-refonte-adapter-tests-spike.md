# V2 Hardening: Refonte Adapter Behavior Tests

## Objectif
Verrouiller le comportement de fallback du `PronotepyRefonteAdapter` pour éviter les régressions discrètes lors des changements backend.

## Implémentation

- Extension de `tests/test_backend_contract.py` avec une classe `RefonteAdapterBehaviorTests`.
- Cas couverts:
  - priorité `TeacherClient` par défaut,
  - fallback vers `Client` si `TeacherClient` échoue,
  - priorité `Client` quand `PRONOTE_REFRONTE_PREFER_TEACHER_CLIENT=0`,
  - levée d'`AdapterError` si tous les candidats échouent.

## Bénéfice

- Le comportement multi-clients de la couche adapter est désormais testé explicitement.
- Réduction du risque de casser la connexion lors des futures itérations `pronotepy`.
