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
| Email | **Resend** (transactionnel + Broadcast marketing ; compte plateforme multi-tenant) |
| Jobs / workers | **Inngest** (sync contacts campagnes ; séquences marketing phase 2) |
| Upload media | **tus-js-client** (resumable) |
| Package manager | **pnpm** |
| Rich text (store bio) | **TipTap** + `sanitize-html` : gras / italique / liens / listes |
| Rich text (templates campagnes) | **TipTap** maison (`@tiptap/*` : StarterKit, BubbleMenu, TextStyle/Color/FontSize, Image, Link, TextAlign) + nodes custom chips / Button. Map → `docs/04` Étape 5 |

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

## Resend webhooks (campagnes)

Endpoint app : `POST /api/webhooks/resend`  
Secret : `RESEND_WEBHOOK_SECRET` (`whsec_…` au create webhook).  
Opt-out CoachStack : `UNSUBSCRIBE_SECRET` (HMAC `/unsubscribe` ; fallback `RESEND_API_KEY`).  
Events : `email.sent` / `delivered` / `opened` / `clicked` / `bounced` / `complained` / `delivery_delayed` / `failed` / `suppressed` (+ unsub via topic si dispo).  
Match campagne : `data.broadcast_id` → `campaigns.resend_broadcast_id`. Dev = même tunnel ngrok que Stripe.

## Inngest + sync audience provider

### Flow (figé 2026-10-14)

1. Trigger DB `leads` / `enrollments` → upsert `campaign_contacts` (invalide `provider_properties_synced_at`).
2. Trigger SQL `campaign_contacts_provider_sync_webhook` (`supabase_functions.http_request`) → `POST /api/webhooks/supabase/campaign-contacts`.
3. Route Next (auth Bearer) → `inngest.send("campaign/contact.sync")` (réponse 200 rapide via `after()`).
4. Inngest invoque `/api/inngest` → `syncCampaignContactToResend` (properties Resend `cs_fn_` / `cs_ln_` / `cs_unsub_` + mark synced).
5. Au Send campagne : dirty catch-up segment + rewrite merge tags org-scopés.

`proxy.ts` : `/api/webhooks/*` et `/api/inngest` **bypass** `updateSession` (callbacks publics / rapides).

### Env

| Var | Rôle |
|-----|------|
| `INNGEST_EVENT_KEY` | `inngest.send` → Cloud |
| `INNGEST_SIGNING_KEY` | Cloud → vérifie `/api/inngest` |
| `SUPABASE_CAMPAIGN_CONTACTS_WEBHOOK_SECRET` | Header `Authorization: Bearer …` du webhook DB |

### Local vs prod (Inngest)

- **Oui** : en local tu peux pointer Inngest Cloud vers une URL **non-prod** (ngrok). Dashboard Inngest → Sync app → `https://<ngrok>/api/inngest`.
- Keys : préférer un **app / env Inngest “Development”** (keys séparées) plutôt que les keys prod, pour ne pas mélanger runs.
- Ne **pas** mettre `INNGEST_DEV=1` si tu utilises Cloud + ngrok (sinon SDK vise le Dev Server local).
- Alternative pure local : `npx inngest-cli@latest dev` (sans Cloud) ; le webhook Supabase cloud doit quand même atteindre Next via ngrok.

### Checklist **lancement prod** (webhooks à repointer)

Quand l’URL publique change (ngrok → `coachstack.co` / Vercel) :

1. **Inngest** : Sync app → `https://<domaine-prod>/api/inngest` + keys prod dans env Vercel.
2. **Supabase** : recréer / update le trigger `campaign_contacts_provider_sync_webhook` (URL actuelle est hardcodée dans le trigger SQL) → `https://<domaine-prod>/api/webhooks/supabase/campaign-contacts` + même secret (ou secret prod dédié).
3. **Resend** webhook delivery → URL prod `/api/webhooks/resend` + `RESEND_WEBHOOK_SECRET` prod.
4. **Stripe Connect** webhook → URL prod `/api/webhooks/stripe-connect` + secret prod.
5. `NEXT_PUBLIC_APP_URL` / unsub links = domaine prod.

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
