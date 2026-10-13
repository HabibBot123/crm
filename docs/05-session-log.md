# Session log

Entrées courtes, plus récent en haut. Décisions durables → `docs/04` ; schéma → `docs/06`.  
Règle : 1 entrée = 1 thème livré (pas chaque polish UI).

---

## 2026-10-13 — Campaigns : cap + indexes sync

- Cap `campaigns.manage` (admin) : nav, APIs, RLS. Indexes partial pending/opted-in/synced sur `campaign_contacts`. → `docs/04`, `06`.

## 2026-10-13 — Campaigns : segments (filtre AST)

- `campaign_segments` + builder AND/OR/NOT (status, form fields, client/offer/product, dates lead/enrollment). Sync audience réconcilie Resend. → `docs/04`.

## 2026-10-13 — Design system : KPIs = Overview, pas StatCard

- Directive UX : KPIs plats dans `SectionCard` (Overview). `StatCard` déprécié. PageHeader actions = `children`. → `.cursor/rules/design-system-ux.mdc`.

## 2026-10-13 — Campaigns : page Sync audience

- Soft-sync retiré. Page Campaigns (Pipeline, sous Forms) + Sync audience. Quota plus tard. → `docs/04`.

## 2026-10-13 — Marketing : sync contacts Resend (étape 3)

- Service upsert Contact + topic org ; sync à la demande (pas write-path). → `docs/04`.

## 2026-10-13 — Marketing : case form obligatoire

- Case consent form : décochée par défaut, submit bloqué tant que non cochée. → `docs/04`.

## 2026-10-13 — Marketing : pas de toggle CRM

- Toggle “Can receive campaigns” retiré. Lead manuel + enrollment → opt-in true. Form public garde la case. → `docs/04`.

## 2026-10-13 — Marketing : triggers sync + seed topic

- Seed `campaign_topics` Marketing à l’INSERT org. Triggers lead/enrollment → `campaign_contacts`. `attachResendCampaignTopic` au create sending domain. Upserts app retirés. → `docs/04`, `docs/06`.

## 2026-10-13 — Controls UX densifiés (style Resend)

- Button / Input / Select / Tabs / InputGroup / SearchSelect : `h-8`, `rounded-xl`, padding/gap Resend. Override test Add lead retiré. → `docs/04`, design-system-ux.

## 2026-10-13 — Marketing : consent + campaign_contacts (étape 2)

- Form case décochée + copy org. Tables `campaign_contacts` / `campaign_topics`. Toggle CRM. Clients enrollment → opt-in true temporaire. → `docs/04`.

## 2026-10-12 — Marketing : sending domain (étape 1)

- Settings → Email : ajout domaine Resend, table DNS copy, verify/refresh/remove. Table `organization_sending_domains` + API. Cap `org.settings`.

## 2026-10-12 — Marketing email : Resend Broadcast (décisions)

- ESP = Resend (Broadcast + transactionnel). Compte plateforme (pas BYOK). Audience leads + clients. Templates React Email. Pas d’Automations Resend ; séquences = phase 2 (Inngest/Trigger…). → `docs/04`, backlog `docs/03`.

## 2026-10-12 — Offer editor : Overview TipTap + Pricing

- Nav latérale type Settings (Overview / Pricing / Settings). Panneaux découpés. Desc TipTap + preview sous details. Base pricing lock si active. Key features retirés. → `docs/04`.

## 2026-10-12 — Store editor : TipTap + preview live

- `/dashboard/branding` : TipTap bio (bold/italic/link/lists) + preview `StorefrontView` avec offers actives. Bio HTML sanitizé.

## 2026-10-12 — Store public : design refresh

- Boutons Stan → page buy (logo org, partenariat CoachStack discret, détail) → Continue → Stripe. Pas de timer auto.

## 2026-10-12 — Store page : TipTap + preview vraie page

- Décidé : store Stan-simple ; bio TipTap light (bold/italic/links) ; editor split avec preview = `/org/[slug]` réelle (offers incluses). Pas de builder. → `docs/04`.

## 2026-10-11 — Payouts BU Owner : détail calcul

- Colonne **See details** (HoverCard) sur tab BU Owners : Revenue − coûts team/coach → base → × % → settlement.

## 2026-10-11 — Overview org/bu : leads + forms

- Vue org/bu : recent leads + top forms (30j) en plus de sales / products.
- SQL à rejouer : `scripts/dashboard-overview.sql`.

## 2026-10-10 — Overview : vue Business unit

- Switch Member \| Organization \| Business unit. Org = même cap qu’Analytics (`analytics.view`) ; BU = statut BU owner.
- Cap `overview.view_org` retirée (SQL à appliquer : `dashboard-overview.sql` + `remove-overview-view-org.sql`).
- RPC `bu` scope owned BUs ; Share links = top 5 par clicks ; status lead = label/couleur.

## 2026-10-10 — Overview member panels + coaching created_at

- `coaching_assignments.created_at` + trigger re-assign ; seuil “new coaching” = 3j.
- Vue Member : recent leads ; cards Share links / Coaching si data ; plus de shortcuts.

## 2026-10-10 — Overview Home member / org

- Cap `overview.view_org` (admin + bu_owner) ; switch Member \| Organization (défaut Member).
- RPC `dashboard_overview` jsonb 30j ; scope BU en vue org ; Top products conservé.

## 2026-10-10 — Sidebar : regroupement métier

- Nav : Home (Overview + Analytics) → Pipeline (CRM, Forms, Sales, Payouts) → Delivery → Catalog → Organization. Caps inchangées.

## 2026-10-10 — Devise org (décision, build plus tard)

- 1 devise / org ; tout l’encaissement + reporting dans cette devise ; reject cross-currency. Pas de FX v1. — `docs/04`, `docs/03`.

## 2026-10-10 — Funnel Marketing : couleurs + Lost

- Funnel : Clicks orange, Leads bleu, Converted vert, Lost rouge.
- RPC `crm_marketing_analytics` : KPI `lost` (`status = lost`).

## 2026-10-10 — Analytics Marketing v1 (décision + build)

- Switch Sales | Marketing sur `/dashboard/analytics`.
- Lead marketing = form / share link ; KPIs + tables links / ambassadors / forms. Clicks = lifetime.
- UI : deltas vs période préc. ; funnel ; revenue by share link (pas channels).

## 2026-10-10 — CRM leads : tri par `created_at`

- `crm_leads_page` : `ORDER BY created_at DESC, id DESC` (plus `status_at`).

## 2026-10-10 — Analytics org : détail BU Owner P&L/Cash

- Vue org : lignes Team commissions + BU Owner settlements (accrued / paid).
- RPC expose `head_*` / `team_*` aussi en mode org.

## 2026-10-10 — Residual BU Owner : − delivery coach (`created_at`)

- `of_residual` = CA − team acquisition (`sold_at`) − delivery (`created_at` / assign), BU via offre du pack.
- RPC `settle_bu_owner_month` MAJ ; re-backfill pending fév–sept 2026 (15 rows). Docs `04`/`06`.

## 2026-10-10 — BU Owner settlement (implémentation)

- App : schemas/service/hooks settlements ; Settings BU (basis/delay/%) ; Payouts tabs Team/BU Owners ; plan `head` retiré UI ; Activate team-only.
- Analytics RPC : coûts BU Owner = `bu_owner_settlements` ; script `crm-sales-analytics-viewer-modes.sql`.
- Backfill : offers org1 → BU ; `settle_bu_owner_month` fév–sept 2026 (15 rows). Cron auto encore todo.

## 2026-10-10 — BU Owner = settlement périodique (décision)

- Config **par BU** ; monthly calendar ; base revenue|residual (team accrued) ; `due_at` = 1er mois suivant + delay_months (défaut 0).
- Payouts : pending/paid/overdue comme coms. Analytics org P&L + coûts Head ; vue BU Owner = coûts team détaillés.
- Table dédiée ; backlog `docs/03` ; wipe mock OK. Supersède Stripe auto + Activate BU Owner.

## 2026-10-10 — Naming UI : Head → BU Owner

- Label produit unique **BU Owner** (analytics, coms, Settings). Code `head` / `bu_owner` inchangé.

## 2026-10-10 — Head com Stripe auto

- `ensureHeadCommissionForSale` sur checkout + invoice.paid ; acquisition sans lead (`beneficiary_member_id`).
- Activate skip Head si déjà sur la sale. Settings BU : copy “How Heads earn”.
- DB : contrainte pool + `commission_in_scope` + `v_commissions` + analytics Head Stripe.

## 2026-10-10 — Head com via offre (code)

- Activate/preview : Head upsert depuis `offers.business_unit_id` ; `commissions.business_unit_id` = BU offre.
- Sale only / create / link posent `leads.target_offer_id`. Sans offre → Activate refuse. Sans BU offre → pas de Head.

## 2026-10-10 — Analytics preset Quarter

- Preset `quarter` : QTD (grain month) + forecast trimestre suivant ; UI + RPC `crm_sales_analytics`.
- Source SQL : `scripts/crm-sales-analytics-viewer-modes.sql`.

## 2026-10-10 — Fix Head analytics CA = 0

- Cause : RLS `sales_row_in_scope` ne voyait que `offers.business_unit_id` (souvent null).
- Fix : scope BU aussi via lead lié à la sale/enrollment ; gate + `analytics.view`.

## 2026-10-10 — Analytics: cap + modes org/head

- Cap `analytics.view` (≠ sales.view) ; défauts admin + bu_owner ; pas de vue perso.
- Mode Head : CA BU, coms Head + Team, pas de marge (BU owner auto). Org = filtre BU, pas de toggle Head.
- RPC `p_viewer_mode` ; matrix seed/backfill.

## 2026-10-10 — Docs cleanup (session + decisions)

- `05-session-log` condensé (~618 → ~80).
- `04-decisions` condensé (~519 → ~160) : merge thèmes, drop supersédé, matrix + règles métier gardées.

## 2026-10-10 — Analytics Sales/CRM (ship)

- Page `/dashboard/analytics` (`sales.view`) ; RPC `crm_sales_analytics` ; CA sur `sold_at`.
- Toggle P&L (coms accrues) vs Cash (`paid_at`) ; chart coms miroir (Paid + Due/`due_at`).
- Presets segmentés 7d/30d/Month/Quarter/Year + FilterRefine (custom/BU) ; pack mix UI retirée (plus tard).
- Seed demo : `scripts/seed-calisthenics-analytics.sql`.
- `APP_OVERVIEW.md` resync as-built (CRM / sales / coms / analytics / permissions).

## 2026-10-09 — Coaching ops + enrollments + coms plan

- Coaching : table `v_coaching_packs` + FilterRefine ; assign modal (preview/override) ; change/remove si 0 session + 0 paid ; delivery coms = sale only.
- Rachat expire-then-insert ; cron `expire_due_enrollments` sur `expires_at` only ; lookup enrollment manuel org-only.
- Residual Head = après Sales/Ambassador (coach hors residual) ; Settings coms UI (When + Payouts) ; equal installments + `delayMonths`.
- BU sortis de Forms → Settings ; rôle `member` → `staff` ; Clients FilterRefine.
- Colonne `organization_sales.sold_at` (UI Record sale / enrollment).

## 2026-10-08 — CRM pipeline + commissions page

- Lead Owner (`owner_id`, mail assign) ≠ pay roles ; panel Owners (BU+owner) lock si coms activées ; cap `crm.view_lead_commissions`.
- Statuses org (`organization_lead_statuses`, ≤10, système new/lost/converted) ; forms sans `form_type` + `initial_status`.
- RPC `crm_leads_page` + champs filtrables ≤4 ; `FilterRefine` partagé ; TableScroll dashboard.
- Commissions : drop `validated` ; table + by-member (RPC) ; overdue = `due_at` ; unpay + audit `paid_by` ; cancel = DELETE pending.

## 2026-10-07 — Sales + Activate + Stripe cash

- Record sale (Create / Link / Sale only) → Activate ; page `/dashboard/sales` + sheet détail ; coms via `organization_sale_id`.
- Drop `manual_sales` ; `commission_plan` org ; acquisition of_base/residual + schedules ; delivery coach à l’assign.
- Stripe : `checkout.completed` + `invoice.paid` → `organization_sales` ; `base_amount` / on_deal|on_payment.
- Vues `v_organization_sales` / `v_commissions` ; Zod rows → `/schemas`.
- Backlog figé : outbound CRM events + ESP externe API-first (`docs/04`).

## 2026-10-04 → 10-05 — Permissions org + solo/team

- Matrix `organization_role_permissions` + `has_org_capability` / scope `org|bu|own` ; UX `can()` ; RLS + helpers `*_in_scope` ; nav gated + No access.
- Pseudo-rôle `bu_owner` configurable ; `offers.business_unit_id` ; API `assertOrgCapability`.
- `organizations.mode` solo|team ; TeamPlanGate ; solo auto-assign coach (trigger).
- Fix `dashboard_overview` unassigned = status + expiry alignés portail.
- Todo : transfer ownership (`docs/03`).

## 2026-10-01 — Identité + enrollment manuel

- Drop `public.users` ; FK → `profiles` ; drop vue morte `organization_client_enrollments`.
- Emails : compte = `auth.users` ; métier = `buyer_email` / leads / members. Gap : REVOKE `link_guest_purchases_to_user`.
- Enrollment manuel + `organization_sales.source` (`stripe`|`manual`) ; UI Clients → Add enrollment.

## 2026-07-27 — Commissions wave 1 (acquisition)

- Activate/Cancel sur lead converted ; page commissions ; defaults % member/BU ; closer/setter colonnes.
- Delivery coach = wave suivante. Spec détaillée → `docs/04`.

## 2026-07-23 — CRM inbound + offre/accès + docs DB

- Hub Forms (Forms/Fields/Share links) ; BU first-class ; share links tout membre + label canal ; doublon = badge ; form public honeypot/rate limit.
- Offre = composition + `access_duration_months` / `sessions_count` ; rachat = expire puis INSERT (+ `stripe_checkout_session_id`).
- Portail coached : routes `enrollment_product_id` ; Discover retiré ; edge session dashboard/coached.
- Créé `docs/06-database.md` ; purge `supabase/migrations` locales trompeuses.
- Backlog : messagerie Unipile (add-on siège).

## 2026-07-21 — Storefront + checkout + RLS

- Branding = store minimal (logo/bio/1 couleur/offers) ; interstitial buy → Checkout Session (pas Payment Link brut).
- RLS orgs related-only + helpers anti-récursion ; offers manage membres ; lesson progress own-row.
- Notes webhooks Stripe / ngrok → `docs/01`.

## 2026-07-19 — Coaching v1 + Stripe soft-gate

- Coaching = packs + assign (pas booking) ; Stripe requis seulement publish/sell.
- Fixes : create-org multi-membership ; create product sans colonne `slug`.

## 2026-07-15 — Setup mémoire projet

- `AGENTS.md`, `docs/00–05`, rules memory/general/design-system ; purge rules mortes.
- Reprise post-pause : vision avant gros pivots.
