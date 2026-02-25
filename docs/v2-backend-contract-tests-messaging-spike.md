# V2 Spike: Backend Contract Tests Messaging

## Objectif
Compléter la couverture des contrats backend sur les routes de communication.

## Implémentation

- Extension de `tests/test_backend_contract.py` pour couvrir:
  - `/api/discussions`
  - `/api/informations`
- Ajout des gardes d'authentification (401) pour ces routes.
- Vérification de la structure JSON retournée pour discussions/messages et informations.
- Mise à jour du `DummyAdapter` pour supporter des fixtures `discussions` et `informations`.

## Validation

- `python3 -m unittest discover -s tests -p 'test_backend_contract.py'`
- `npx -y pnpm test:backend-contract`
- `npx -y pnpm lint`
- `npx -y pnpm exec tsc -b`

## Limites

- Couverture orientée contrat JSON principal, pas scénarios réseau pronotepy réels.
