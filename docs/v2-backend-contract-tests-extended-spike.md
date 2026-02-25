# V2 Spike: Backend Contract Tests Extended

## Objectif
Étendre la protection anti-régression backend aux routes basées sur les périodes.

## Implémentation réalisée

- Extension de `tests/test_backend_contract.py` avec des tests de contrat pour:
  - `/api/grades`
  - `/api/averages`
  - `/api/absences`
  - `/api/delays`
- Ajout de vérifications d'authentification (401) pour les endpoints de période.
- Vérification de la structure JSON sur des objets simulés réalistes.

## Validation

- `python3 -m unittest discover -s tests -p 'test_backend_contract.py'`
- `npx -y pnpm test:backend-contract`
- `npx -y pnpm lint`
- `npx -y pnpm exec tsc -b`

## Limites

- Les tests couvrent le contrat JSON principal mais pas tous les cas extrêmes métier.
- L'intégration réseau Pronote réelle reste hors périmètre de ce spike.

## Suites proposées

1. Ajouter des cas d'erreurs de sérialisation (attributs manquants).
2. Couvrir `/api/discussions` et `/api/informations` avec des fixtures plus riches.
3. Intégrer ces tests dans un workflow CI dédié V2.
