# V2 Hardening: Smoke Deploy Script Reliability

## Problème rencontré
Lors du smoke test package, les relances 2 et 3 pouvaient crash (`Trace/breakpoint trap`) tout en laissant le script afficher `Smoke test passed`.

## Cause racine
Le script validait un PID récupéré par `pgrep` (processus générique), pas le PID exact lancé au run en cours.

## Correctif

- `scripts/smoke-deploy.sh`:
  - suivi du PID exact via `$!` après lancement `nohup`;
  - validation explicite de ce PID après 3s puis après la fenêtre de stabilité;
  - logs de diagnostic (`tail`) en cas d'échec;
  - lancement smoke en `--disable-gpu` pour limiter les faux négatifs liés au GPU dans des environnements de test.

## Effet
Le smoke test échoue désormais correctement si le process UI du run courant crash réellement.
