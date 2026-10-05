# Tech stack

Détecté depuis `package.json` + conventions repo (état pré-pause).

## Core

| Couche | Choix |
|--------|--------|
| Framework | **Next.js 16** (App Router) |
| UI | **React 19**, Tailwind 4, Radix / shadcn-style components |
| Language | TypeScript 5.7 |
| Data fetching (client) | **TanStack React Query** |
| Forms / validation | react-hook-form + **Zod** |
| Auth + DB + Storage | **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) + RLS |
| Paiements | **Stripe** + **Stripe Connect** |
| Email | **Resend** |
| Upload media | **tus-js-client** (resumable) |
| Package manager | **pnpm** |

## Conventions repo (à respecter)

- Accès Supabase **uniquement** via `lib/services/*` — pas de clients Supabase directs dans les composants.
- UI data via hooks React Query (`hooks/`).
- Schémas Zod dans `schemas/` quand présents.
- Contrats DB → `docs/06-database.md` (pas `supabase/migrations/`).
- Routes App Router dans `app/`.

## Domain note

- Produits : types `course` | `coaching`.
- Offres : `billing_type` = `subscription` | `one_time` | `installment`.
- Statuts produits / offres : `draft` | `active`/`published` | `archived` (voir services pour détails exacts).

## Infra / domaines (figé)

- Domaine final : **`coachstack.co`**
- Espace coached : **`app.coachstack.co`** (CNAME Cloudflare → Vercel ; cookie Auth cross-subdomain à valider en prod — voir `todo.txt`)

## Secrets

Jamais dans les docs. Utiliser `.env.local` (cf. `.env.local.example`).

## Stripe Connect webhooks (dev vs prod)

Endpoint app : `POST /api/webhooks/stripe-connect`  
Secret local : `STRIPE_CONNECT_WEBHOOK_SECRET` dans `.env.local`.

### Dev — ngrok

Stripe ne peut pas appeler `localhost`. On tunnel via **ngrok** :

```bash
ngrok http 3000
```

(Remplace `3000` si le dev server tourne sur un autre port.)

1. Copier l’URL HTTPS ngrok (ex. `https://abc123.ngrok-free.app`).
2. Dans [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks) (mode **test**, endpoint **Connect** si applicable) :
   - URL : `https://<ton-subdomaine-ngrok>/api/webhooks/stripe-connect`
   - Events utiles : `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`, etc.
3. Copier le **Signing secret** (`whsec_…`) → `STRIPE_CONNECT_WEBHOOK_SECRET` dans `.env.local`.
4. Redémarrer Next.js.

Chaque nouveau tunnel ngrok change l’URL → **remettre à jour** l’endpoint Stripe + éventuellement le secret.

### Prod

- Remplacer l’URL ngrok par l’URL publique réelle, ex. `https://<domaine-prod>/api/webhooks/stripe-connect`.
- Utiliser le **signing secret prod** (pas le secret test / ngrok) dans les env de déploiement.
- Ne pas laisser un endpoint Stripe pointant encore vers ngrok en production.
