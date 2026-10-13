## CoachStack — High-Level App Overview

This document summarizes what the app is, who it is for, and the main features and pages, so that an AI can understand the product without scanning the whole repository.

**Living product memory** lives in `docs/` (`00`–`06`). This file is the longer **as-built** routes / entities reference. Prefer `docs/04-decisions.md` and `docs/06-database.md` when they conflict with older detail here.

---

## 1. What this app is

**CoachStack** is a vertical CRM + commerce + delivery platform for professional coaches and coaching organizations (education, business, life, fitness, executive, etc.).

It combines:

- **Back-office for coaches**: organizations, catalog (products / offers / content), clients, CRM inbound (forms / leads), sales & analytics, commissions, coaching pack assignment, team & permissions, Stripe Connect, store branding.
- **Public marketing / store pages**: branded org storefront + buy links (interstitial → Stripe Checkout Session).
- **Coached space (client portal)**: programs purchased, coaches/orgs, course progress, coaching sessions.

The stack is **Next.js App Router + Supabase (RLS) + React Query + Zod + Stripe Connect**.

---

## 2. Main user roles

### Coach / organization side

- **Org owner** — full access (not stored in the permission matrix; always allowed).
- **Admin** — matrix role; typically full ops.
- **Sales / Ambassador / Coach / Staff** — invite roles with caps from `organization_role_permissions`.
- **BU owner** — not an invite role; status on a business unit; scoped capabilities via matrix row `bu_owner`.

Capabilities are enforced in UX (`useOrgCapabilities().can` / `scope`) and RLS (`has_org_capability`, `*_in_scope` helpers). Sidebar items are gated (see `lib/permissions/dashboard-nav.ts`).

### End client

- **Coached** — signs up / logs in to the coached space, buys offers, accesses courses and coaching packs.

---

## 3. High-level flows

### Coach onboarding

- Sign up (`/signup`), log in (`/login`), create an organization (`/create-organization`).
- Build catalog without Stripe; **Stripe Connect required only to publish / sell**.
- Configure store branding (`/dashboard/branding`), invite team (`/dashboard/team`).

### Building the catalog

- Products: `course` | `coaching` (`/dashboard/products`).
- Content library with resumable upload (`/dashboard/content`).
- Offers bundle products; billing `one_time` | `subscription` | `installment`; access duration + sessions on the **offer** (`/dashboard/offers`).
- Offers are **archived** (Stripe-aware), never deleted.

### Selling and checkout

- Public store: `/org/[slug]` (minimal: identity + active offers + Buy).
- Buy: `/org/[slug]/buy/[offerId]` → short interstitial → Stripe Checkout Session.
- Success always returns to CoachStack `/order-success` (then coached signup). Cancel retries the same buy URL.
- Webhooks write `enrollments` + `organization_sales` (`source=stripe`, `sold_at` at insert).
- Guest purchase → account: `link_guest_purchases_to_user` from auth callback.

### CRM inbound

- Forms hub: Forms | Fields | Statuses | Share links (`/dashboard/crm/forms/...`).
- Public form submit creates a **lead** (duplicate email still created; UI badge).
- Share links: any member + channel label; optional default fields + BU; click tracking (`?ref=`).
- Pipeline: `/dashboard/crm` (RPC `crm_leads_page`, FilterRefine, side panel).
- **Owner** (`leads.owner_id`) = who follows the lead (ops, email on assign). **≠ pay roles**.
- Pay roles = `lead_attributions` (closer / setter / ambassador / business_unit = BU Owner). Money via attributions + Activate; Stripe auto for BU Owner.

### Record sale → Activate commissions

- From lead: Record sale = Create enrollment+sale | Link existing | **Sale only**.
- Sale = cash register (`organization_sales`); CA date = **`sold_at`** (manual UI date; Stripe = now).
- Activate commissions (preview) creates acquisition `commissions` tied to `organization_sale_id`.
- Residual **BU Owner** = from the **offer** `business_unit_id` (not lead BU). Stripe payments auto-create BU Owner coms; CRM Activate skips BU Owner if already on the sale. Offer without BU → no BU Owner com.
- Cancel Activate = DELETE pending lines (then re-activate recreates).

### Coaching ops

- Page `/dashboard/coaching` (view `v_coaching_packs`, FilterRefine coach + status).
- Assign / Change / Remove coach (SearchSelect + commission preview/override).
- Change/Remove locked after first session or first paid delivery commission.
- Delivery commissions created on assign when a sale exists (`pool=delivery`).
- Solo org: auto-assign owner coach on coaching enrollment product insert.
- Enrollment expiry: `expire_due_enrollments()` cron on `expires_at` only; repurchase = expire-then-insert.

### Sales & analytics

- `/dashboard/sales` — treasury list (`v_organization_sales`), filters, sale detail sheet.
- `/dashboard/analytics` — Sales/CRM analytics (cap `analytics.view`); RPC `crm_sales_analytics`.
  - Modes **org** (admin, filtre BU optionnel) vs **BU Owner** (`viewer_mode=head`, auto).
  - Period presets + FilterRefine (custom/BU). P&L vs Cash; CA on `sold_at`.
  - BU Owner: BU CA, BU Owner + Team coms (no org margin); chart = BU Owner coms.

### Commissions payouts

- `/dashboard/crm/commissions` — table + by-member summary (RPC); mark paid / unpay; overdue = pending past `due_at`.
- Org plan in Settings → Commissions (`organizations.commission_plan`).
- Business units in Settings → Business units.

### Coached experience

- Auth: `/coached-signup`, `/coached-login`.
- Home `/coached`; course and coaching detail under `/coached/[slug]/...`.
- Portal data via `v_coached_products` (living enrollments only).

---

## 4. Main app pages (Next.js routes)

### 4.1 Entry, auth, and organization

| Route | Role |
|-------|------|
| `/` | Marketing / entry (coach-facing) |
| `/signup`, `/login`, `/login/forgot-password`, `/login/reset-password` | Coach auth |
| `/coached-signup`, `/coached-login` | Coached auth |
| `/create-organization` | Org onboarding |
| `/invite/team` | Accept team invite |
| `/auth/callback` | Auth callback (incl. guest purchase link) |

### 4.2 Coach dashboard (back-office)

Shared layout; nav groups Workspace / Monetize / Manage (`lib/permissions/dashboard-nav.ts`). Pages without capability show No access. Design: `PageHeader`, `SectionCard`, `FilterRefine`, etc. (see design-system rules).

#### Workspace

- `/dashboard` — Overview metrics via RPC `dashboard_overview` (totals, recent sales, top products, unassigned coaching count).

- `/dashboard/clients` — Clients CRM (`v_organization_clients`); search + FilterRefine (status, spend, joined); detail enrollments. Cap `clients.view`. Manual **Add enrollment** (email lookup org-only).

- `/dashboard/sales` — Sales list (`v_organization_sales`); search + filters (payment / source / offer); `SaleDetailSheet` (sale / client / lead / commissions). Cap `sales.view`.

- `/dashboard/analytics` — Sales/CRM analytics (see §3). Cap `sales.view`. Service `lib/services/analytics.ts`, hook `use-analytics`, schema `schemas/analytics.schema.ts`.

- `/dashboard/crm` — Leads pipeline; RPC `crm_leads_page`; FilterRefine (status / origin / members / BU / filterable custom fields ≤4); lead side panel (answers, Owner, commissions/attributions, activity). Caps `crm.leads.view` / `view_own`.

- `/dashboard/crm/commissions` — Commissions table + member summary; FilterRefine; pay / unpay. Caps `commissions.view_own` / `view_all`. Team plan only in nav.

- `/dashboard/crm/forms` — Forms hub home (list / create forms).
- `/dashboard/crm/forms/fields` — Org CRM fields (filterable toggle).
- `/dashboard/crm/forms/statuses` — Org lead statuses (≤10; system `new` / `lost` / `converted`).
- `/dashboard/crm/forms/links` — Share links (channel label, member, BU, stats).
- `/dashboard/crm/forms/[id]` — Form editor (fields, hidden values, success message, redirect, `initial_status`).
- Redirects: `/dashboard/crm/settings` → fields; `/dashboard/crm/ambassador` → share links; hub `business-units` → Settings.

- `/dashboard/coaching` — Coaching packs ops (`v_coaching_packs`); assign / sessions sheet. Cap `coaching.view` (+ `coaching.assign` for mutations).

#### Monetize

- `/dashboard/offers`, `/dashboard/offers/new`, `/dashboard/offers/[id]` — Commercial SKUs, variants, Stripe price/archive, composition editable if 0 sales.
- `/dashboard/products`, `/dashboard/products/new`, `/dashboard/products/[id]` — Course modules/content; coaching delivery mode (sessions/access on offer).
- `/dashboard/content` — Media library (tus upload).

#### Manage

- `/dashboard/branding` — Store page: logo, bio, primary color, active offers. Legacy hero/FAQ/etc. not pushed in UI.
- `/dashboard/team` — Members, invites, roles (owner role not assignable via change-role). Team plan.
- `/dashboard/settings` — Org settings sections incl. **Commissions** plan, **Business units**, permissions matrix (owner), account-adjacent config.
- `/dashboard/account` — User profile.
- `/dashboard/stripe-connect` — Connect onboarding / status.

### 4.3 Public organization & purchase pages

- `/org/[slug]` — Minimal storefront (branding + offers + Buy).
- `/org/[slug]/buy/[offerId]` — Interstitial → Checkout Session.
- `/org/[slug]/form/[formId]` (or equivalent public form route) — Inbound form; honeypot + rate limit; thank-you / redirect.
- `/org/preview/...` — Owner preview.
- `/c/[coach]/[product]` — Short public URL into offer flow.
- `/order-success`, `/checkout` — Post-checkout / status.

### 4.4 Coached space (client portal)

- `/coached` — Home: orgs + programs.
- `/coached/[slug]/courses/[enrollment_product_id]` — Course + progress.
- `/coached/[slug]/coaching/[enrollment_product_id]` — Coaching pack + sessions.
- `/coached/coaches` — Orgs list (legacy route name; UI = organizations). Discover catalog deferred.
- `/coached/profile` — Profile (+ soft link to coach workspace when applicable).

---

## 5. Core domain entities (data model overview)

Detail and RLS contracts: **`docs/06-database.md`**.

### 5.1 Organization, team, permissions

- `organizations` — Brand, Stripe Connect, `mode` (`solo` | `team`), `commission_plan` jsonb, `owner_id` → profiles.
- `organization_members` — Roles; per-type default commission rates/fixed (sales / ambassador / coach).
- `organization_role_permissions` — Matrix role × capability; `bu_owner` row for BU-scoped caps.
- `profiles` — App profile (`user_id`); no email (email = `auth.users`).
- `business_units` — BU + `owner_member_id` + default BU Owner commission.

### 5.2 Catalog & content

- `products` — `course` | `coaching`.
- `product_modules` / `product_module_items` / `content_items` / `content_folders`.
- `product_coaching` — Delivery mode (commercial sessions/access live on `offers`).
- `offers` / `offer_products` / `offer_variants` — SKU, billing, Stripe IDs, `access_duration_months`, `sessions_count`, optional `business_unit_id`.

### 5.3 Purchases, sales, coaching delivery

- `enrollments` — Access; `buyer_email` / `user_id`; `expires_at`; Stripe ids nullable for manual; `stripe_checkout_session_id` idempotency.
- `enrollment_products` — Snapshot of offer products at purchase (trigger on INSERT).
- `organization_sales` — Cash events (`stripe` | `manual`); **`sold_at`**; `base_amount_cents` + installment fields; linked to enrollment / lead as applicable.
- `coaching_assignments` / `coaching_sessions` — Assign coach; optional session tracking.
- `course_lesson_progress` — Lesson completion.

### 5.4 CRM inbound

- `leads` — Pipeline; `owner_id` (ops); `business_unit_id`; `status` → `organization_lead_statuses`; `organization_sale_id` / `enrollment_id`; `commissions_activated_at`.
- `lead_attributions` — Pay roles (closer / setter / ambassador / head).
- `lead_field_values` / `crm_fields` / `crm_forms` / `crm_form_fields` / `crm_ambassador_links`.
- `organization_lead_statuses` — ≤10 statuses per org; system keys locked.

### 5.5 Commissions

- `commissions` — Always via `organization_sale_id` when money exists. Acquisition: `lead_id` + `attribution_id`. Delivery: `beneficiary_member_id` + optional enrollment. Status: `pending` | `paid` | `canceled` (cancel CRM = DELETE pending). Audit `paid_at` / `paid_by`; schedule via `due_at`.
- Views / RPCs: `v_commissions`, `commissions_summary_by_member`, `crm_sales_analytics`, `v_organization_sales`, `v_crm_leads`, `v_coaching_packs`, `v_coached_products`.

### 5.6 Clients (aggregated)

- `v_organization_clients` — Aggregates by client key (`user_id` or `buyer_email`); spend, enrollments, lifecycle. Detail enrollments queried separately (legacy `organization_client_enrollments` dropped).

---

## 6. Technical patterns & conventions (for AI)

- **Data access**: Supabase only in `lib/services/*`. Components → React Query hooks → services → Supabase.
- **Validation**: Zod schemas in `schemas/`.
- **Permissions**: capability matrix + RLS helpers; do not re-fetch role ad hoc per page.
- **UI patterns**: dashboard uses `SectionCard` (not shadcn Card); lists = RichListItem **or** table-in-SectionCard (never mix); filters via `FilterRefine`.
- **Copy**: no long dash `—` in UI strings; short labels.
- **DB truth**: `docs/06-database.md` + MCP Supabase; do not trust empty `supabase/migrations/`.
- **Product decisions**: `docs/04-decisions.md`. Feature backlog: `docs/03-features.md`.

---

## 7. Notable product rules (quick reference)

| Topic | Rule |
|-------|------|
| Stripe | Soft-gate: required to publish/sell, not for draft catalog |
| Storefront | Minimal store link, not a page builder |
| Buy links | CoachStack interstitial → Checkout Session (not raw Payment Links) |
| Owner vs pay | Lead Owner ≠ commission; money via attributions only |
| CA date | `organization_sales.sold_at` |
| Coms residual BU Owner | Via offer BU; after Sales & Ambassadors; coach on org margin |
| Offer delete | Forbidden; archive via Stripe-aware API |
| Role rename | Org role `member` → `staff` |
| Analytics packs | Pack mix removed from Sales analytics UI (products analytics later) |
| Marketing analytics | Separate page later (share links / ambassadors) |

This should give an AI enough context to understand what the application does, how major entities relate, and where to look (`app/`, `lib/services/`, `hooks/`, `schemas/`, `docs/`).
