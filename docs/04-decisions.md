# Decisions log (ADR léger)

Décisions **figées** (produit / archi). Implémentation détaillée → `docs/03`, `docs/06`, session → `docs/05`.  
Format : date · quoi · pourquoi (court) · conséquences.

---

## 2026-10 — Controls UX (Resend-like density)

- Dashboard controls share one atom: **`h-8` + `rounded-xl` + `px-3` + `gap-1` + `text-sm` + focus `ring-2`**.
- Primary CTA = `Button` default (`font-semibold` + border). Secondary / filters / combobox = `outline`. Select triggers = same height/radius, `font-normal`, `pr-2.5`.
- Tabs = pills sans track muted (actif = `bg-accent`), pas le style shadcn “segmented control”.
- Source de vérité : composants `components/ui/{button,input,select,tabs,input-group}` + `search-select`. Pas d’overrides page sauf cas touch / landing (`size="lg"`, `h-7` densité locale, etc.).

## 2026-10 — Offer editor (Overview TipTap + Pricing lock)

- Navigation latérale type Settings (`NavList`) : **Overview** · **Pricing** · **Settings**. Panneaux dans `components/dashboard/offers/`.
- Overview : name + description TipTap light + preview carte buy **sous** les détails. Plus de key features.
- Pricing : pleine largeur. **Base pricing** (access, price, interval/installments, sessions) + **Checkout links**. Base pricing **éditable seulement en draft** ; `active`/`archived` → lecture seule + reject `updateOffer`.
- **Business unit** : éditable dans Settings même si offre active (pas archivée).
- Variants = overrides + liens share, pas un second prix “source de vérité”.

## 2026-10 — Store page editor (Stan-simple + bio riche)

- Store reste un **store link** type Stan/Gumroad : logo, nom, bio, 1 couleur, offers actives, Buy. Pas de website builder, pas de layouts multiples, pas de sections drag & drop.
- **Bio** : éditeur riche **borné** (TipTap light) : gras, italique, liens, listes, alignement gauche/centre/droite. Pas de titres / images / embeds / couleurs dans le texte.
- Stockage bio : HTML sanitizé (ou JSON TipTap) dans branding ; rendu public + preview via le **même composant**.
- **Édition** : split contrôles (gauche) + **preview live** (droite) = **vraie page** telle qu’affichée (`/org/[slug]`), **offers incluses** (données org réelles, state local pour branding draft). Save explicite ; preview suit le draft sans save.
- Design refresh du template public possible ensuite, sans changer ce modèle.

---

## 2026-10 — Analytics, sales, commissions, CRM ops

### Naming : Business unit · BU Owner

- Entité = **Business unit**. Personne qui la gère / est payée dessus = **BU Owner** (UI partout ; plus de label “Head”).
- Code interne peut encore dire `head` / `viewer_mode=head` / slot plan `head` (= BU Owner).

### Analytics Sales/CRM + `sold_at`

- Page `/dashboard/analytics` ; cap dédiée **`analytics.view`** (≠ `sales.view`). Même cap pour la vue **Organization** de Overview. Défauts : **admin ✓**, **bu_owner ✓** (owner peut couper), autres ✗. Sans cap → pas d’accès Analytics / vue org Overview.
- **Deux modes seulement** (pas de vue perso sales) :
  - **Org** : owner/admin. CA org, coms coût, marge, team, pipeline. Filtre BU optionnel.
  - **BU Owner** (scope `bu`). Même page. Hero = **CA BU**. Coms = **BU Owner** (`attribution_type=business_unit`) + **Team** (sales/ambassador). **Pas de marge org**. Team + pipeline scopés BU. Chart coms = coms BU Owner.
  - Admin aussi BU Owner → reste en **vue org** ; filtre BU optionnel.
- 1 RPC INVOKER `crm_sales_analytics` (+ `p_viewer_mode`) ; pas d’agrégat client-side.
- **CA** = `organization_sales.sold_at`. **P&L** : coms accrues ; **Cash** : `paid_at`. Chart coms miroir (Paid + Due). Packs analytics = plus tard.
- **Marketing analytics** (même page `/dashboard/analytics`, switch Sales | Marketing) :
  - Lead marketing = `origin = form` **ou** `ambassador_link_id` set.
  - KPIs période : leads créés, converted (parmi eux), conv %, CA (`sold_at` des sales liées à ces leads).
  - Tables : share links (clicks = **lifetime** ; leads/converted/CA = période), ambassadors, forms. Pas de table “channels” (doublon du label link).
  - Chart : top share links by revenue ; tooltip = créateur + form.
  - Même cap `analytics.view` + filtre BU ; clicks non datés → pas de série clicks période.
- Colonne **`sold_at`** NOT NULL ; vue + expires_at enrollment manuel ancrés dessus.

### Lead Owner ≠ pay · statuses · filters

- `leads.owner_id` = ops (mail à l’assign) ; **pas** de com. € = `lead_attributions` seulement. Cap `crm.assign_sales` = assign owner. Pas d’auto-closer.
- BU + owner éditables tant que coms non activées ; Form ≠ BU.
- Statuses **par org** ≤10 ; système lockés `new` / `lost` / `converted` (seed = ces 3). Delete interdit si système ou used. `converted` = gate Record sale / Activate.
- Forms : **pas de `form_type`** ; `initial_status` ; `success_message` + `redirect_url` cumulables (soft redirect ~3.5s).
- Liste CRM = RPC `crm_leads_page` + EXISTS ; champs filtrables opt-in max **4** (select/multi/boolean).

### Record sale · Stripe cash · base coms

- Vente = `organization_sales`. Enrollment = delivery optionnel. Coms → **`organization_sale_id`**.
- Record sale : **Create** | **Link** | **Sale only**. Activate exige sale. Stripe ne lie pas le lead (raccord manuel).
- Stripe : `checkout.completed` + `invoice.paid` → sale idempotente ; renewals = nouvelles sales. Metadata sub toujours posée. Réconciliation job = plus tard.
- Sales = tréso (`price`) ; installment → `base_amount_cents` + index/count. Plan `acquisitionBasis` : **`on_deal`** (défaut) | **`on_payment`**.
- Enrollment manuel + `source=manual` (one_time). Drop `manual_sales`.
- Gap : Activate sans sale / sans offre produit — **fermer** (décidé 2026-10-10).

### BU Owner = settlement périodique (cible, ≠ closer)

Séparé des coms sales/ambassador/coach (event-driven). BU Owner = P&L de la BU, pas une 4ᵉ attribution deal.

- **Config par BU** (pas org-wide) : owner, %, cadence, base, **payout delay**.
- **Périmètre CA** : sales dont l’offre a `offers.business_unit_id` = cette BU (`sold_at` dans la période). Abos : chaque invoice/sale compte.
- **Offre sans BU** : hors settlement BU Owner (marge org).
- **Cadence** : v1 simple = **monthly**, close = fin de mois civil (période = calendrier). UI Settings → Business units.
- **Base** : par BU **`of_revenue`** (CA brut) | **`of_residual`** (CA − coms team acquisition **accrued** via `sold_at` − coms **delivery coach** accrues via `created_at` / assign, rattachées à la BU par l’offre du pack). Pas de rétrocession si assign après la période de vente.
- **Due date (simple)** : à la cloture de période, `due_at` = **début du mois suivant + `payout_delay_months`** (défaut **0** = exigible dès le 1er du mois suivant la perf). Ex. perf octobre → due 1 nov si delay 0 ; 1 déc si delay 1. Pas d’autres fréquences v1.
- **Matérialisation** : **1 settlement / BU / période**. Job mensuel (1er du mois ou cron). Statuts **`pending` | `paid`** ; overdue = pending + `due_at` passé (même logique que coms team). Unpay + audit comme coms.
- **Table dédiée** `bu_owner_settlements` (period_start/end, basis, revenue_cents, team_costs_cents, amount_cents, due_at, paid_at, paid_by, status…).
- **Analytics** :
  - **Org P&L / Cash** : détail **Team commissions** + **BU Owner settlements** (accrued période / `paid_at`) ; Net = CA − total coûts.
  - **Vue BU Owner** : préciser coûts team (accrued) vs net / settlement dû ; pas de “marge org”.
- **Lead BU** : filtre CRM ops seulement.
- **Supersède** : auto Stripe `ensureHeadCommissionForSale` + BU Owner Activate (retirés). Mock wipe OK.

### Commission pools · schedules · page payouts

- **Acquisition** (Activate) : sales/ambassador `of_base` seulement (plus de ligne BU Owner au Activate en cible). Plan org pour team + delivery.
- Slot plan `head` / residual BU Owner dans Settings Commissions → **migrer** vers config settlement BU (cadence + base).
- **Delivery** : trigger assign ; base = sale only (pas fallback offer) ; override %/fixe pack ; re-assign remplace pending ; solo = pas de com coach.
- `delayMonths` = offset 1ère échéance (One payment | Equal installments). Legacy `equal_deferred` → front_loaded + delay 1.
- Page coms : table + résumé member (RPC INVOKER) ; **pas** de side panel. Statuts `pending`|`paid` ; drop `validated`. Overdue = dérivé `due_at`. Unpay + audit `paid_by`. Cancel CRM = **DELETE** pending. PDF payout = plus tard.
- Label client liste : lead d’abord, sinon enrollment JOIN ; `enrollment_in_scope` accepte aussi caps commissions.

### Coaching change/remove

- Change / Remove si **0** session et **0** delivery paid. Remove = delete assignment + pending delivery. Lock après. RLS `coaching.assign` INSERT/DELETE delivery pending.

### Role `member` → `staff`

- Même caps ; wording ops sans sales/coach/ambassador.

---

## 2026-10-04 — Permissions · Solo/Team · Offer↔BU

### Permissions = capacité × scope

- Matrix owner-configurable par rôle : `admin` / `sales` / `ambassador` / `coach` / `staff`. Owner = tout. Pas de rôles custom / overrides membre en V1.
- Scope calculé : owner/admin → `org` ; sinon BU owner → `bu` ; sinon → `own`.
- **BU owner** ≠ invite : `business_units.owner_member_id` + colonne matrix `bu_owner` (caps scope BU, cumul rôle org).
- Enforcement : UX `can()` + RLS `has_org_capability` + helpers `*_in_scope`. Owner-only hors matrix : `org.billing`, `org.permissions`.

**Sous-actions (clés matrix)**  
Team: `team.invite|manage_roles|revoke` · Catalog: `catalog.manage` · Clients/sales: `clients.view|enroll_manual`, `sales.view`, `analytics.view` · CRM: `crm.leads.view_own|view|update_status|edit|delete`, `crm.assign_sales`, `crm.manage_attributions`, `crm.activate_commissions`, `crm.view_lead_commissions` · Forms: `forms.view|manage`, `forms.links.view_own|create_own|delete_own|manage_others` · Coaching: `coaching.view|assign`, `coaching.sessions.create|complete` · Coms/BU: `commissions.view_own|view_all|mark_paid`, `bu.manage` · Campaigns: `campaigns.manage` (général V1 : page + sync + segments) · Org: `org.settings` (domaine email reste ici).

**Defaults seed**

| Clé | admin | sales | ambassador | coach | staff |
|---|---|---|---|---|---|
| `team.*` / `catalog.manage` / `bu.manage` / `org.settings` / `campaigns.manage` | ✓ | — | — | — | — |
| `clients.view` / `enroll_manual` | ✓ | — | — | — | ✓ |
| `sales.view` / `analytics.view` | ✓ | — | — | — | — |
| `crm.leads.view_own` / `update_status` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `crm.leads.view` + edit/delete/assign/attributions/activate/view_coms | ✓ | — | — | — | — |
| `forms.view` + links `*_own` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `forms.manage` / `links.manage_others` | ✓ | — | — | — | — |
| `coaching.view` / sessions | ✓ | — | — | ✓ | — |
| `coaching.assign` | ✓ | — | — | — | — |
| `commissions.view_own` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `commissions.view_all` / `mark_paid` | ✓ | — | — | — | — |

**BU owner defaults** : invite, catalog, clients, sales.view, **analytics.view**, CRM ops (dont view_coms + attributions), forms/links, coaching packs offre→BU, commissions view/mark paid. Scope via `offers.business_unit_id`.

Règles structurelles : CRM manage full = admin/BU ; sales/analytics défaut = admin + bu_owner ; coaching assign = admin (+ packs assignés pour view/sessions).

### Overview Home (member | org | bu)

- Page `/dashboard` : snapshot **30j** (action + KPIs), pas un doublon Analytics.
- **Défaut = Member** pour tous.
- **Organization** : même cap qu’Analytics (**`analytics.view`**) + scope org.
- **Business unit** : si le membre est BU owner (statut, pas une permission). Même switch que Member / Organization.
- Vue org / bu : mêmes KPIs (Revenue / New leads / Converted / Active clients) ; `bu` filtre sur les BU owned. Recent sales + recent leads + top products + top forms (leads/converted 30j + clicks lifetime des links).
- Vue member : My leads / Converted / Commissions earned / Pending ; recent leads (status label/couleur) ; Share links = top 5 par clicks ; Coaching si data. Attention “Assigned to N new coaching” si assign ≤**3 jours**.
- “New leads” attention = statut pipeline `new` (pas une fenêtre de dates).
- RPC `dashboard_overview(org, viewer_mode)` modes `member`\|`org`\|`bu` ; source `scripts/dashboard-overview.sql`.

### Solo vs Team · Offer BU

- `organizations.mode` = `solo`|`team` (existantes → team ; create → solo). Solo : hide attributions/assign CRM+coach ; Team/Coms/BU derrière TeamPlanGate (upgrade billing todo).
- Solo auto-assign coach = trigger DB sur `enrollment_products`.
- `offers.business_unit_id` nullable ; clients BU via offer (pas enrollment). 1 offre = 1 BU.

### Domaine

- Produit = **`coachstack.co`** ; coached = **`app.coachstack.co`** (DNS/cookies prod encore todo).

### Sidebar dashboard (IA nav)

Groupes (source `lib/permissions/dashboard-nav.ts`, sidebar + mobile) :
- **Home** : Overview, Analytics
- **Pipeline** : CRM, Forms, Campaigns (`campaigns.manage`), Sales, Payouts
- **Delivery** : Clients, Coaching
- **Catalog** : Offers, Products, Content, Store page
- **Organization** : Team, Settings

### Devise org (décidé, build = plus tard)

- **1 devise / org** (`eur` | `usd` | `gbp`…), source de vérité pour offres, Checkout Stripe, ventes manuelles, commissions, analytics, settlements.
- Tous les clients de l’org sont encaissés **dans cette devise** (la banque du payeur convertit éventuellement). Pas de multi-devise parallèle, pas de FX v1.
- Sale / session Stripe ≠ devise org → **reject / quarantine** (pas de SUM silencieux cross-currency).
- Aujourd’hui : `currency` existe déjà sur offre/sale, mais analytics & settlements somment des cents sans garde. Build ultérieur : champ org + enforcement + formatters.

### Marketing / integrations

- **Outbound events** (todo) : `lead.created|updated`, `call.booked`, `client.converted` → Zapier/Make. Utile même avec Resend natif.

### Marketing email (Resend) — décidé 2026-10-12

- CoachStack = vérité CRM (leads, clients, filtres, consent). **Resend** = envoi (transactionnel existant + **Broadcast** campagnes). Switch ESP possible plus tard si scale.
- **Compte plateforme** unique CoachStack (pas BYOK). Domaines org créés/vérifiés via API Resend multi-tenant ; factu volume = CoachStack.
- **Audience** = leads **et** clients. Segments = query CRM chez nous → sync contacts vers segment Resend au send (Resend segments = sacs, pas query builder).
- **Templates** = **React Email** (déjà en place). Éditeur riche possible via `@react-email/editor` (TipTap) plus tard ; pas d’éditeur Resend Dashboard comme source de vérité.
- **Pas** Resend Automations. Séquences (welcome pack J1/J3, nurture conditionnel) = **phase 2**, orchestrées chez nous (Inngest / Trigger.dev ou équivalent) + envoi transactionnel Resend.
- **V1 scope** : domaine custom org (DNS guidé) · consent/topics/unsub · sync contacts · campagnes Broadcast · templates React Email · webhooks bounce/complaint/unsub. Séquences auto = plus tard.
- Domaine envoi org : sous-domaine recommandé (`mail.` / `send.`) pour isoler la réputation.
- **Étape 1 (2026-10-12)** : Settings → **Email** ; table `organization_sending_domains` ; API create / verify / refresh / remove via Resend Domains (compte plateforme). Cap `org.settings`.
- **Étape 2 consent (2026-10-13)** :
  - Form public : case **décochée** mais **obligatoire** pour soumettre + copy `I agree that {orgName} may keep my contact details to get in touch with me.` → lead form toujours opt-in true.
  - Tables `campaign_contacts` (unique org+email lower) + `campaign_topics` (1× Marketing / org).
  - FKs soft : `lead_id` + `enrollment_id` (SET NULL on delete). Delete lead ≠ delete contact.
  - Clients (enrollment) + lead **manuel** CRM : `marketing_opt_in = true` auto. Pas de toggle CRM.
  - Interim mock : **tous** leads + `campaign_contacts` opt-in true (default DB + backfill 2026-10-13).
  - Topic local seedé à la création org ; `resend_topic_id` attaché à l’enregistrement du sending domain (`attachResendCampaignTopic`).
  - Sync audience locale = **triggers DB** (`leads` / `enrollments` → `campaign_contacts`).
  - **Étape 3 sync Resend (2026-10-13)** : sync **à la demande** via Pipeline → **Campaigns** → **Sync audience** (pas de soft-sync à chaque lead). Service upsert Contact + topic org ; `resend_contact_id`. Sync auto au Send Broadcast = plus tard. Quota contacts = à décider en fin de V1. Compte plateforme = 1 contact Resend / email ; isolation = topics par org.
  - **Étape 4 segments (2026-10-13)** :
    - Table `campaign_segments` : `filter_json` (AST AND/OR/NOT) = vérité CoachStack ; Resend segment = sac.
    - Conditions v1 : `lead_status`, `lead_origin`, `form_field`, `is_client`, `offer`, `product`, `business_unit`, `lead_created_at` (entrée CRM), `enrollment_created_at` (inscription client).
    - UI filtre = un bloc **Match all / any** ; exclusions via opérateurs (`is none of`, `Is client = No`, etc.).
    - **Pas** de bouton Sync segment : **Sync audience** sync les contacts pending **puis** réconcilie chaque segment (resolve filtre → add/remove memberships Resend).
    - Cap **`campaigns.manage`** (admin défaut) : nav Campaigns, APIs sync/segments, RLS contacts/segments. Domaine Resend reste `org.settings`.
    - Indexes sync : partial `(organization_id, id) WHERE marketing_opt_in AND resend_contact_id IS NULL` + opted-in / synced.
    - Preview count en local sans Resend.

---

## 2026-07 — Reprise (baseline produit)

### Mémoire · Stripe soft-gate · Coaching v1

- Mémoire vivante = `docs/` + `AGENTS.md` + rules ; `APP_OVERVIEW` = routes longues.
- Stripe Connect obligatoire seulement publish/sell/checkout (pas draft catalogue).
- Coaching v1 = packs + assign (`enrollment_products` + assignments) ; pas booking/payouts auto. Accès/séances commerciaux = **sur l’offre**.

### Storefront · checkout · RLS

- Page org = **store link** minimal (logo, bio, 1 couleur, offers, Buy). Cut hero/FAQ/stats/testimonials (legacy lecture OK).
- Éditeur store 2026-10 : TipTap light bio + preview live = vraie page (offers) — section ci-dessus.
- Buy = store boutons Stan → page buy (logo org + ligne partenariat CoachStack discrète + détail offre) → Continue → **Checkout Session**. Success → `/order-success` ; cancel = retry buy.
- Orgs SELECT = owner | membre | enrolled. Offers manage = membres actifs. Lesson progress = own-row. Matrix catalogue fine = suite permissions (faite 2026-10).

### CRM inbound · offre · rachat · portail

- Hub Forms : Forms | Fields | Statuses | Share links. **BU = Settings** (pas Forms). Sidebar Forms ≠ CRM.
- Share links : tout membre + label canal ; doublon email = create + badge ; clicks GET ; honeypot + rate limit ; hidden fields gardés. Coms ≠ règles “si champ CRM”.
- Offre : composition éditable si 0 vente sinon nouvelle + archive ; `access_duration_months` + `sessions_count` sur offer. Base pricing figé après publish (voir section Offer editor 2026-10).
- Rachat = expire-then-insert (`active|paused`) ; idempotence `stripe_checkout_session_id` ; cron `expire_due_enrollments` sur `expires_at` only.
- Portail : routes `enrollment_product_id` ; edge session dashboard/coached ; `v_coached_products` security_invoker + revoke anon ; Discover retiré.

### Commissions (spec d’origine — encore vraie)

- Trigger = bouton Activate / Annuler sur lead converted (pas auto au statut). Soft-lock attributions après Activate.
- Base = % / fixe pack brut ; equal installments = étalement du % total. Deux pools (acquisition puis delivery). Defaults % invite + BU. 1 coach / pack. Visibilité own / BU / all.
- Détail slots / schedules / sale_id → sections 2026-10 ci-dessus.

---

## Baseline pré-pause (Q1)

- Vertical = CRM + vente + delivery coaching (pas LMS seul) ; 3 surfaces.
- Stack = Next App Router + Supabase RLS + React Query + Stripe Connect ; services `lib/services`.
- Offres : archive Stripe-aware, pas delete. Produits : delete draft non lié seulement ; archive bloquée si sur offre.

---

### À décider (ne pas pivoter sans accord)

- [ ] Positionnement “tous coachs” vs recentrer (ex. sport) ?
- [ ] Surface à simplifier en priorité pour MVP relancé ?
- [ ] Must vs cut backlog (hors coaching / commissions / sales / marketing Resend déjà tranchés)
- [x] ESP = Resend Broadcast, compte plateforme (2026-10-12)
