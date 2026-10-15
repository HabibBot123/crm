# Architecture (haut niveau)

Référence détaillée routes / entités : `APP_OVERVIEW.md`.

## Surfaces / routes

```text
/                         → marketing CoachStack (coach-facing)
/signup /login            → auth coachs
/create-organization      → onboarding org
/dashboard/*              → back-office org
/org/[slug]               → page publique brandée + /buy/[offerId]
app.* / {slug}.app.*      → portail membre (/home, /courses, /coaching, /s, …)
/coached-landing          → landing hub (rewrite / sur app.*)
API webhooks Stripe       → app/api/webhooks/stripe-connect
API webhooks Resend       → app/api/webhooks/resend (campagnes delivery)
                            (dev: ngrok → voir docs/01-tech-stack.md ; prod: URL réelle)
```

## Couches

| Couche | Où |
|--------|-----|
| Pages / layouts | `app/` |
| Features UI | `features/`, `components/` |
| Hooks React Query | `hooks/` |
| Services Supabase / métier | `lib/services/` |
| Schémas | `schemas/` |
| Contrats DB (tables, vues, RPC, triggers) | **`docs/06-database.md`** (live Supabase ; pas les migrations locales) |
| Templates email Supabase (auth) | `supabase/email-templates/` |
| Templates campagnes marketing | TipTap maison : map dans `docs/04` Étape 5 (UI `components/dashboard/campaigns/*`, service `lib/services/campaign-email-templates.ts`) |

## Domaine (entités clés)

```text
organizations ──< organization_members
       │
       ├── products (course | coaching)
       │      ├── product_modules → product_module_items → content_items
       │      └── product_coaching (pack commercial: sessions, période, mode)
       │
       ├── offers ── offer_products ── products
       │      └── offer_variants (+ Stripe IDs)
       │
       └── enrollments
              └── enrollment_products (snapshot produits achetés)
                     ├── coaching_assignments → organization_members
                     ├── coaching_sessions (tracking optionnel)
                     └── course_lesson_progress
```

## Permissions (UX)

- `fetchOrganizationsWithMember` → `member_role` / `member_id` (provider).
- Matrix : `organization_role_permissions` via `fetchMemberCapabilityContext` → `useOrgCapabilities().can` / `scope`.
- RLS : `has_org_capability` (SQL) ; ne pas re-fetch le rôle page par page.

## Patterns métier importants

- Offres : **pas de delete** — archiver (souvent via API Stripe-aware).
- Produits : delete seulement si `draft` et non liés à une offre ; archive bloquée si encore sur une offre.
- `enrollment_products` : snapshot à l’achat (trigger `enrollment_products_fill` — détail `docs/06-database.md`) — grain pour assign / progress / sessions.
- Guest purchase → compte : RPC `link_guest_purchases_to_user` via `app/auth/callback` (voir `docs/06-database.md`).
- Coaching v1 : **assignation** prioritaire ; pas de booking calendrier.
- Dashboard Overview : RPC `dashboard_overview` (member \| org via `analytics.view` \| bu via statut BU owner).
- Branding org → JSON / champs utilisés par `/org/[slug]`.

## Design

- `design-system.md` + rule `.cursor/rules/design-system-ux.mdc`.

## État reprise

Architecture ci-dessus = **as-built** + décisions dans `04-decisions.md` (Stripe soft-gate, coaching org-first).
