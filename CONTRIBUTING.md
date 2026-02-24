# Guide de contribution

Merci de votre intérêt pour Pronote Desktop. Ce document décrit les conventions et le processus à suivre pour contribuer au projet.

---

## Prérequis de développement

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** 22 ou supérieur
- **pnpm** 10 ou supérieur (`npm install -g pnpm`)
- **Python** 3.11 ou supérieur
- **pip3** avec les paquets `pronotepy`, `flask` et `flask-cors`

## Mise en place de l'environnement

```bash
git clone https://github.com/Tarzzan/pronote-desktop.git
cd pronote-desktop
pnpm install
sudo pip3 install pronotepy flask flask-cors
```

Pour démarrer l'application en mode développement :

```bash
# Terminal 1 : démarrer le backend Python
python3 pronote_api.py

# Terminal 2 : démarrer le frontend Vite
pnpm dev
```

---

## Conventions de code

### Commits

Ce projet suit la convention [Conventional Commits](https://www.conventionalcommits.org/fr/) :

| Préfixe | Usage |
|---|---|
| `feat:` | Nouvelle fonctionnalité |
| `fix:` | Correction de bug |
| `docs:` | Documentation uniquement |
| `style:` | Formatage, espaces, virgules (pas de changement logique) |
| `refactor:` | Refactorisation sans ajout de fonctionnalité ni correction |
| `test:` | Ajout ou modification de tests |
| `chore:` | Tâches de maintenance (dépendances, CI, etc.) |

Exemples :
```
feat: ajouter la page bulletins de notes
fix: corriger le timeout de connexion Pronote
docs: mettre à jour le guide d'installation
```

### TypeScript

Toutes les interfaces Pronote sont définies dans `src/types/pronote.d.ts`. Toute nouvelle donnée doit y être typée avant d'être utilisée dans les composants.

### Composants React

Les pages sont des composants fonctionnels avec hooks. Chaque page suit le même pattern :

```tsx
const MaPage: React.FC = () => {
  const [data, setData] = useState<MonType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const client = getClient();
      if (!client) return;
      setLoading(true);
      try {
        const result = await client.getMaDonnee();
        setData(result);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ...
};
```

---

## Processus de Pull Request

1. Forkez le dépôt et créez une branche depuis `main` : `git checkout -b feat/ma-fonctionnalite`
2. Effectuez vos modifications en respectant les conventions ci-dessus
3. Vérifiez que le projet compile sans erreur : `pnpm build:web`
4. Poussez votre branche et ouvrez une Pull Request vers `main`
5. Décrivez clairement les changements apportés et leur motivation

---

## Signalement de bugs

Utilisez le [template de bug report](https://github.com/Tarzzan/pronote-desktop/issues/new?template=bug_report.md) en fournissant :

- La version de l'application (visible dans la sidebar)
- Le système d'exploitation et sa version
- Les étapes pour reproduire le bug
- Le comportement attendu et le comportement observé
- La stack trace si disponible (copiée depuis la boîte de dialogue d'erreur)

---

## Versionnage

La version est gérée automatiquement par le script `scripts/bump-version.cjs`. Avant chaque release :

```bash
node scripts/bump-version.cjs
# → Incrémente la version patch dans package.json
# → Met à jour les références de version dans les fichiers source
git add package.json src/
git commit -m "chore: bump version to $(node -p "require('./package.json').version")"
git tag -a "v$(node -p "require('./package.json').version")" -m "Release v..."
git push origin main --tags
```

La GitHub Action se charge ensuite de créer la Release et de construire le `.deb` automatiquement.
