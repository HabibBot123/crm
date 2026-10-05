# Features & backlog

Statuts :

- **done** — présent dans le code / routes (pré-pause)
- **partial** — commencé ou fragile / incomplet
- **todo** — noté mais pas livré
- **wont** — écarté (après décision)
- **revisit** — à revalider dans la discussion vision

## Coach / organisation

| Feature | Status | Notes |
|---------|--------|-------|
| Auth coach (signup/login/reset) | done | `/signup`, `/login`, … |
| Create organization | done | `/create-organization` |
| Dashboard overview (RPC metrics) | done | `/dashboard` |
| Clients CRM (list/search/detail) | done | `/dashboard/clients` |
| Manual enrollment + sale | done | Dialog Add enrollment ; `organization_sales.source=manual` ; pas de Stripe |
| Products list + CRUD course/coaching | done | Course = content ; coaching = pack commercial + ops assign |
| Content library upload | done | `/dashboard/content`, tus |
| Offers + variants + billing types | done | one-time / sub / installment ; accès + séances sur l’offre ; composition éditable si 0 vente |
| Offer archive via Stripe Connect | done | pas de delete offre |
| Branding / store page | done | Logo, bio, 1 couleur, offers actives + Buy. Cut hero/FAQ/testimonials/stats |
| Public buy links | done | Interstitial → Stripe Checkout Session ; share links sur offre |
| Headless checkout API docs / embed | todo | Moins prioritaire si redirect Session suffit |
| Stripe Connect onboarding | done | Requis pour **publish/sell** seulement (plus pour draft catalogue) |
| Team invites / members | done | `/dashboard/team`, `/invite/team` ; rôle `owner` non assignable via change role |
| Transfer org ownership | todo | Flow dédié : sync `organizations.owner_id` + rôles membres (pas via select rôle) |
| Coaching packs + assign coach | done | `/dashboard/coaching` — **v1 core** pour org multi-coach |
| Coaching sessions (create/complete) | partial | Tracking optionnel ; pas de booking avancé |
| Coach payouts by volume | todo | Après assign ; pas en v1 |
| Enrollment auto-expire job | todo | Passer `status=expired` quand `expires_at < now()` (accès déjà filtré par date dans vues) |
| Manual sub + link Stripe txn | todo | Étendre enrollment manuel : abonnements off-platform / rattacher une transaction Stripe existante |
| Unify sales / drop `manual_sales` | todo | Fusionner `manual_sales` → `organization_sales` (source) ; commissions pointent sur sale unifiée |
| Org mode Solo vs Team | partial | `organizations.mode` ; hide/gate UX ; Upgrade CTA stub (billing todo) |
| Solo → Team upgrade billing | todo | CTA “Upgrade to Team” (TeamPlanGate) — pas encore branché |
| Org role permissions (owner matrix) | done | Matrix Settings + UX `can()` + RLS + scope ; sidebar/mobile filtrés ; pages sans cap → No access — `docs/04` |
| Account + settings | done | `/dashboard/account`, `/settings` |

## CRM inbound (forms / leads)

| Feature | Status | Notes |
|---------|--------|-------|
| Pipeline leads + side panel | partial | `/dashboard/crm` ; colonnes Closer/Setter/Ambassadors ; % auto à l’attribution |
| Forms hub (inbound) | done | `/dashboard/crm/forms` : Forms, Fields, BU, Share links |
| CRM fields + form builder | partial | hub Fields + form editor ; hidden + success message |
| Public form `/org/.../form/...` | partial | clicks `?ref=`, honeypot, rate limit, thank-you |
| Share links (tout membre + label canal) | partial | `/dashboard/crm/forms/links` (+ redirect ambassador) |
| Dedup email (lead + badge) | done | `is_duplicate` ; UI row + badge |
| Clicks tracking + anti-spam POST | done | GET+ref / honeypot + rate limit |
| Business Units first-class | partial | hub BU ; colonne CRM si ≥1 BU ; **% default + owner** à venir (commissions) |
| Commissions (acquisition + delivery) | partial | Wave 1 acquisition : activate/cancel + page suivi + defaults member/BU. Delivery coach = suite |
| Booking Nylas | todo | phases ultérieures |
| Messagerie prospect (email / WhatsApp) | todo later | Via Unipile (user connecte ses comptes). Inbox + historique sur lead. Billing : **add-on par siège / connexion**, pas crédits (coût Unipile = compte connecté). WhatsApp officiel Meta / crédits = éventuelle phase 2. |

## Public & vente

| Feature | Status | Notes |
|---------|--------|-------|
| Page publique `/org/[slug]` | done | storefront minimal (identité + offers + Buy) |
| Checkout buy flow | done | Interstitial EN → Stripe ; success `/order-success` ; cancel = retry buy |
| Preview org pages | done | `/org/preview/...` |
| Short URL `/c/[coach]/[product]` | done | |
| Order success / checkout pages | done | |

## Espace coached

| Feature | Status | Notes |
|---------|--------|-------|
| Auth coached | done | `/coached-signup`, `/coached-login` |
| Home programmes + orgs | done | `/coached` |
| Course detail + progress | done | `/coached/[slug]/courses/[enrollment_product_id]` |
| Coaching program detail | done | `/coached/[slug]/coaching/[enrollment_product_id]` |
| Organizations list | done | `/coached/coaches` (route legacy; UI = orgs) |
| Discover coaches | deferred | retiré jusqu’à vrai catalog |
| Profile coached | done | `/coached/profile` (+ soft link coach workspace) |
| Sous-domaine dédié `app.coachstack.co` | todo | Domaine figé ; reste DNS/CNAME + Vercel + cookies (voir `todo.txt`) |

## Qualité / ops (backlog historique)

| Feature | Status | Notes |
|---------|--------|-------|
| Bloquer delete produit/offre/content si déjà utilisé | todo / revisit | `todo.txt` ligne 1 — vérifier couverture réelle |
| Inactiver `offer_variants` | todo | `todo.txt` |
| Durcir règles métier archive/delete | revisit | partiellement fait côté products/offers |

## Vision reprise (vide jusqu’à discussion)

| Feature / idée | Status | Notes |
|----------------|--------|-------|
| _(à remplir après alignement vision)_ | revisit | Ne pas coder de gros pivots avant `04-decisions.md` |
