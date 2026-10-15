# CoachStack — Overview

## Status (2026-07)

- Projet **mis en pause** quelques mois, **reprise en cours**.
- Stack & features ci-dessous = **état construit** (pré-pause).
- Habib veut **discuter / éventuellement revoir la vision** avant de continuer à coder une refonte.
- Tant qu’aucune décision n’est écrite dans `docs/04-decisions.md`, considérer la vision historique comme **baseline**, pas comme gelée.

## What it is

**CoachStack** = CRM vertical + plateforme de delivery pour coachs / organisations de coaching (éducation, business, life, fitness, executive, etc.).

Quatre surfaces :

1. **Back-office coach** — orgs, produits (cours / coaching), offres, clients, sessions, contenu, équipe, paiements.
2. **Pages marketing publiques** — pages brandées par organisation pour présenter / vendre des offres.
3. **App membre** — `{slug}.app.coachstack.co` : Circle-like (`/home`, `/courses`, `/coaching`, `/s/…`). Hub = choix d’org. Voir `docs/04`.
4. Store reste `{slug}.coachstack.co` (séparé de l’app membre).

## Who it is for

| Rôle | Besoin |
|------|--------|
| Coach / org owner | Gérer catalogue, ventes, clients, équipe, Stripe Connect, branding ; **manage spaces / feeds / stats suivi** |
| Team member / coach assigné | Packs étudiants + **présence dans les spaces** (même shell, caps delivery) |
| Coached (client final) | Entrer dans ses **spaces**, feed/commu/DM, accéder au contenu acheté, profil (photo) |

## ICP v1 (tranché)

- **Priorité** : organisations multi-coach (1er client) qui vendent des packs et **assignent** des coachs.
- Solo coach supporté, mais le design coaching ops part de l’org.

## Positioning (baseline)

CRM + commerce + delivery **spécialisé coaching**, pas un CRM générique ni un LMS générique seul.

## À confirmer (vision revive)

- [x] ICP prioritaire : **organisations / multi-coach** (solo secondaire)
- [x] Site CoachStack vs site externe : **buy links OK** ; delivery chez nous ; branding = store minimal (TipTap bio + preview live décidés 2026-10)
- [ ] Vertical prioritaire (sport déjà dans le nom du repo vs “tous coachs”) ?
- [ ] Queue diff vs Teachable / Kajabi / Systeme.io / Notion-CRM ?
- [x] Coaching v1 : packs + assign (pas booking) — voir `04-decisions.md`
- [x] Community Circle-like (multi-spaces / org, feeds, DM peers) — direction figée 2026-10-15 ; règles offer→space V1 live
- [ ] Ce qu’on **coupe** encore hors storefront/coaching ?
- [ ] Ce qu’on **ajoute** par rapport à l’existant (ex. payouts coach) ?

Voir `docs/04-decisions.md` pour les réponses figées.
