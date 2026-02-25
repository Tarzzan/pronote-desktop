# V2 Roadmap (Fork Strategy)

## Décision
**Fork V2 recommandé.**

Pourquoi:
- V1 doit rester livrable/stable pour utilisateurs non techniques.
- V2 implique des changements de fond (backend API, dépendances, cycle release) à risque.
- La séparation fork/branches réduit fortement le coût de rollback.

## Faisabilité technique

### Réutilisable tel quel (forte valeur, faible risque)
- Shell Electron + stabilisation Linux déjà en place.
- UI existante (routes/pages), en gardant les contrats API.
- Workflow CI build/lint/typecheck/release déjà opérationnel.
- Mécanisme update in-app récemment ajouté.

### À refactorer / encapsuler (risque moyen)
- Couche backend `pronote_api.py` pour intégrer proprement une API `pronotepy` modernisée.
- Mapping de payloads (lessons, groups, teachers, classrooms) vers types frontend.
- Gestion des erreurs/réessais côté backend (normaliser codes/messages).

### Risque élevé (à isoler tôt)
- Remplacement/upgrade de `pronotepy` (contrats et comportements différents).
- Packaging Python offline + postinst (`venv`, wheels, fallback réseau).
- Compatibilité multiplateforme réelle (Ubuntu 22.04/24.04, droits sudo/pkexec).

## Phases de migration

## Phase 0 — Cadrage & baseline
Objectif: figer le périmètre et les tests de référence V1.

Livrables:
- inventaire parcours critiques,
- matrice compatibilité API,
- baseline performances/erreurs.

Go/No-Go:
- **Go** si baseline e2e stable (login + timetable + dashboard + build).
- **No-Go** si la baseline est instable (corriger V1 d'abord).

## Phase 1 — Socle backend/API V2
Objectif: brancher la refonte API derrière une couche d'adaptation.

Livrables:
- adaptateur V2 -> contrat JSON frontend,
- stratégie retry/timeout/caching,
- logs backend normalisés.

Go/No-Go:
- **Go** si login démo et endpoints critiques (`health`, `login`, `timetable`, `grades`, `homework`) passent 3 runs.
- **No-Go** si variations de schémas cassent l'UI.

## Phase 2 — Intégration UI/Electron
Objectif: connecter V2 sans régression UX.

Livrables:
- consommation API V2 dans client TS,
- corrections rendering/états d'erreur,
- smoke tests interface.

Go/No-Go:
- **Go** si app stable >= 40s, login démo OK, pas de crash post-login, timetable lisible/sans scintillement.
- **No-Go** si crashs renderer ou régression navigation.

## Phase 3 — Packaging & release pipeline
Objectif: produire un `.deb` V2 installable en une fois.

Livrables:
- postinst fiable,
- pipeline V2 (artifact + release beta),
- test install machine propre.

Go/No-Go:
- **Go** si install+launch+health API valides sur Ubuntu 22.04 et 24.04.
- **No-Go** si dépendances Python/offline non déterministes.

## Phase 4 — Beta contrôlée & rollback
Objectif: valider V2 sur un cercle pilote.

Livrables:
- release bêta V2,
- plan rollback documenté vers V1,
- suivi incidents et correctifs.

Go/No-Go:
- **Go** si 0 bug P0/P1 ouvert après campagne beta.
- **No-Go** si crashs récurrents ou update in-app non fiable.

## Plan d'exécution priorisé
Court terme (1-2 semaines):
1. Baseline V1 + contrats API figés.
2. Spike backend adaptateur V2.
3. Jeux de tests smoke automatiques.

Moyen terme (2-4 semaines):
1. Intégration UI/Electron V2.
2. Packaging `.deb` V2 robuste.
3. Beta fermée avec checklist.

## Prochaines 3 actions concrètes
1. Créer le fork V2 distant et la branche d'intégration `main-v2`.
2. Implémenter `v2/spike-api-adapter` (sans toucher V1) avec endpoints critiques.
3. Mettre en place une CI V2 séparée (pas de release stable auto).
