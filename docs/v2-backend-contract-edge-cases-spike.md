# V2 Spike: Backend Contract Edge Cases

## Objectif
Renforcer la robustesse des contrats backend sur les cas limites déjà traités en production (erreurs d'attributs et payload partiel).

## Implémentation

- Extension de `tests/test_backend_contract.py` avec 4 cas limites:
  - `/api/grades` retourne `[]` si `period.grades` lève une exception,
  - `/api/absences` retourne `[]` si `period.absences` lève une exception,
  - `/api/discussions` applique bien les valeurs par défaut quand des champs sont absents,
  - `/api/informations` applique bien les valeurs par défaut quand des champs sont absents.

## Validation

- `python3 -m unittest discover -s tests -p 'test_backend_contract.py'`
- `npx -y pnpm test:backend-contract`
- `npx -y pnpm lint`
- `npx -y pnpm exec tsc -b`

## Bénéfice

- Évite les régressions sur des comportements de tolérance déjà attendus côté UI.
