# Agents — CoachStack (crm-sport)

Ce repo est **CoachStack** : CRM + delivery platform pour coachs / organisations de coaching.

## Source de vérité

| Priorité | Fichier | Rôle |
|----------|---------|------|
| 1 | `docs/` | Mémoire produit vivante (`00`–`06` : overview, stack, archi, features, décisions, sessions, **database**) |
| 2 | `APP_OVERVIEW.md` | Référence longue des routes / entités (état historique pré-pause) |
| 3 | `.cursor/rules/` | Comportement agent (mémoire, coding, UX) |

## Avant d’agir

1. Lire `docs/00-overview.md` + le fichier `docs/` pertinent à la tâche.
2. Toute question schéma / triggers / RPC / vues → **`docs/06-database.md`** (pas `supabase/migrations/`). Compléter via MCP Supabase si besoin.
3. Si le sujet est product / vision : traiter `docs/` comme source de vérité ; `APP_OVERVIEW.md` décrit le **système déjà construit**, qui peut évoluer.
4. Suivre `.cursor/rules/project-memory.mdc` (always on).
5. **Ne pas coder** une refonte / pivot vision sans accord explicite — le projet est en reprise après pause, la vision se discute d’abord.

## Pendant / après une session

- Toute décision durable (produit, stack, archi, contrainte, feature) → MAJ du fichier `docs/` concerné dans la même session.
- Ajouter une entrée courte dans `docs/05-session-log.md`.
- Ne jamais y mettre secrets / clés API.

## Copy / UI text

- **Pas de tiret long `—`** dans les textes UI, toasts, labels, descriptions, docs produit rédigés pour l’app. Préférer `:`, `.`, ou une phrase courte.
- **Peu de texte** : labels courts, une idée par phrase, éviter les pavés d’explication et les sous-textes redondants.
- Empty / helper : une ligne max si vraiment utile ; sinon rien.
