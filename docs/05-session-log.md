# Session log

Entrées courtes (3–6 lignes). Plus récent en haut.

---

## 2026-10-10 — APP_OVERVIEW sync as-built

- `APP_OVERVIEW.md` réécrit : CRM inbound, sales, analytics (P&L/Cash), commissions, BU, permissions, coaching ops, store minimal, sold_at.
- Aligné sur `docs/03`–`06` + nav dashboard ; `docs/` reste source de vérité décisions/DB.

## 2026-10-10 — Analytics filters: segment + FilterRefine

- Presets 7d / 30d / Month / Year en segmented muted (comme P&L|Cash).
- Custom range + BU dans `AnalyticsFiltersPopover` (`FilterRefine`).

## 2026-10-10 — Forecast coms: vraie due_at

- Plus de rollup overdue sur le 1er jour ; pending sur leur `due_at` (y compris dans la fenêtre history).

## 2026-10-10 — Analytics: drop Pack mix UI

- Pack mix retiré de `/dashboard/analytics` ; chart commissions à côté du CA.
- Analytics produits / packs = plus tard.

## 2026-10-10 — Commission chart miroir (preset)

- Forecast = fenêtre miroir du preset (7d→+7j, month→mois suivant, year→+3 mois).
- Zones Paid | Forecast séparées ; RPC `p_preset` + `commission_series.bucket/zone`.

## 2026-10-10 — Analytics P&L / Cash + forecast coms

- Toggle P&L vs Cash (coms accrues vs `paid_at`) ; CA toujours `sold_at`.
- RPC `crm_sales_analytics` : `commissions_paid_cents`, `commission_series`.

## 2026-10-10 — Seed demo Coaching Calisthenics

- Fake data réaliste (`*@seed.calisthenics.test`) : 21 deals fév→oct, pipeline leads, coms activées, share link clicks.
- Script : `scripts/seed-calisthenics-analytics.sql` (idempotent).

## 2026-10-09 — Analytics UX v2

- Courbe plus basse + pie packs (hover qty/avg) ; team Closers/Setters/Owners vs période -1 ; deltas KPIs + BU.

## 2026-10-09 — Analytics UX décision

- Hero Revenue + margin/coms % ; courbe jour/mois (trous à 0) ; top closers/packs en barres ; pipeline sans zéros ; BU si ≥2.

## 2026-10-09 — Analytics Sales/CRM page

- Page `/dashboard/analytics` + nav (`sales.view`).
- RPC `crm_sales_analytics` (INVOKER, jsonb) : KPIs, série CA (`sold_at`), members owner/closer/setter, packs, BUs, funnel.
- Service + hook + Zod ; filtres période (7d/30d/month) + BU.

## 2026-10-09 — organization_sales.sold_at

- Colonne `sold_at` + vue ; date UI sur Record sale CRM + enrollment manuel.
- Analytics : CA sur `sold_at` ; Owner & Closer/Setter = leads + conv + CA.

## 2026-10-09 — Analytics Sales/CRM spec

- Page `/dashboard/analytics` ; cap `sales.view` ; BU scope ; pas pour sales/staff alone.
- CA = `sold_at` ; € rapportés = CA deal ; coms = coût. Packs best sellers V1. Marketing = plus tard.

## 2026-10-09 — Role member → staff

- DB + seed + check constraints : `member` → `staff`.
- UI Team / Permissions / sidebar labels : Staff.

## 2026-10-09 — Two pools coms (Head residual ≠ Coach)

- Figé : residual BU owner après Sales/Ambassador seulement ; coach hors residual (marge org).
- Pas de recalc Head à l’assign. Copy Settings clarifié (excl. Coach).

## 2026-10-09 — Schedule delayMonths for equal installments

- `dueDatesForSchedule` : equal parts respectent `delayMonths` (1ère due).
- UI : One payment | Equal installments + stepper mois toujours.
- Legacy `equal_deferred` → `equal_front_loaded` + delay 1 au read.

## 2026-10-09 — Settings commissions UI

- Plan : When (radio) + table unique Payouts (Trigger CRM/Coaching).
- Schedule labels = échéancier d’une com (Equal installments), pas split entre rôles.
- Exemple chiffré retiré (bruit UI).

## 2026-10-09 — BU → Settings

- Business units sortis de Forms ; Settings `section=business-units` ; copy simplifiée.

## 2026-10-09 — Expire job = expires_at only

- `expire_due_enrollments` : plus de skip `stripe_subscription_id` ; abos lifetime restent `expires_at` null.

## 2026-10-09 — Manual enrollment email lookup

- Dialog : lookup **org-only** via `buyer_email` ; name + enrollments vivants.

## 2026-10-09 — Coaching display name

- `v_coaching_packs.user_full_name` : profile → `buyer_name` → `buyer_email`.

## 2026-10-09 — Coaching UI align Sales

- Table packs + FilterRefine (coach + enrollment status) ; sessions sheet align SaleDetail.
- Vue `v_coaching_packs` (historique, pas de filtre expiry) ; portail reste `v_coached_products`.

## 2026-10-09 — Rachat expire-then-insert + cron expired

- Unique enrollments vivant only (`active|paused`) ; expire puis insert (manuel + Stripe).
- Cron `expire_due_enrollments` (skip Stripe subs).

## 2026-10-09 — Coaching change/remove coach

- Change / Remove si 0 session + 0 delivery paid ; remove delete pending coms.
- RLS : `coaching.assign` insert/delete delivery coms (pending).

## 2026-10-09 — Commissions → client label via enrollment_in_scope

- `enrollment_in_scope` : + `commissions.view_all` / `view_own` (plus de helper DEFINER).
- `v_commissions` : lead d’abord, sinon JOIN enrollment (nom / buyer_email).

## 2026-10-09 — Assign coach modal + preview

- Bouton Assign → modal : coach + preview com + override %/fixe (pack only).
- Delivery : sale required (no offer fallback) ; sans sale = warning, assign sans com.

## 2026-10-09 — Delivery coms = sale only

- `syncDeliveryCommissionOnAssign` : plus de fallback `offers.price` ; sans sale → 0 com.

## 2026-10-09 — Coaching assign = SearchSelect

- Assign coach sur packs : Popover+Search custom → `SearchSelect` (même UX que CRM owner).

## 2026-10-09 — Clients search + FilterRefine

- Barre search pleine largeur + filtre (status active/expired, total spent, first joined).
- Filtres branchés sur `v_organization_clients` via `fetchClientsPage`.

## 2026-10-08 — Commissions overdue UX

- Overdue dérivé de `due_at` (filtre + badge) ; pas de cron/statut DB.
- By member : Pay overdue + Pay all (`overdue_ids` dans RPC).

## 2026-10-08 — Commissions page polish

- Drop enum `validated` (+ cols) ; unpay `paid→pending` ; audit `paid_at`/`paid_by`.
- Page coms = paid/unpay seulement ; Annuler CRM = **DELETE** pending (puis réactiver recrée).
- Table + By member (RPC) ; overdue = pending + due passé.

## 2026-10-08 — Commissions UX decisions

- Pas de side panel ; drop `validated` ; unpay + audit `paid_by` ; PDF payout plus tard.
- Résumé par member + pay all → RPC INVOKER (pas vue seule).

## 2026-10-08 — Lead Owners (BU + owner)

- Side panel : section **Owners** (BU + owner) dans une carte grise.
- Édition admin / `crm.leads.edit` (BU) + `crm.assign_sales` (owner) ; null BU OK.
- Lock dès `commissions_activated_at` ; trigger same-org sur `leads.business_unit_id`.

## 2026-10-08 — Cap view lead commissions

- Nouvelle capa `crm.view_lead_commissions` : affiche/masque le bloc Commissions + attributions dans le détail lead.
- Defaults : admin ✓, bu_owner ✓, autres — ; seed + backfill matrix.
- UI side panel gated sur `can("crm.view_lead_commissions")` (team mode).

## 2026-10-08 — Lead sheet layout

- Ordre : header + status/Update → Answers → Owner → Commissions → Activity.
- Pay roles éditables (edit/remove) tant que commissions non activées.
- Bloc sale/activate clarifié (étapes 1/2, labels séparés).

## 2026-10-08 — Lead Owner (rename + mail)

- DB : `leads.assigned_sales_id` → `owner_id` ; view/RPC/RLS helpers alignés.
- Produit : Owner = ops (mail à l’assign avec détail + form answers) ; pas d’auto-closer.
- Cap `crm.assign_sales` assigne l’owner ; pay roles restent `lead_attributions`.

## 2026-10-08 — Commissions FilterRefine

- Page commissions : bouton filtre dans la search (comme CRM/Sales) ; chips amovibles.
- Filtres status, role, amount (€), due date ; `FilterRefine` gagne le type `date-range`.
- `fetchCommissions` : statuses / attributionTypes / amount cents / due_at range.

## 2026-10-08 — CRM filters RPC + champs filtrables

- RPC crm_leads_page (EXISTS field values / members) ; plus de resolve IDs côté app.
- crm_fields.filterable max 4 (select/multi/boolean) ; toggle Fields + FilterRefine.

## 2026-10-08 — Implémentation statuses org + forms

- Table organization_lead_statuses + seed trigger ; leads.status text + FK ; remap data test.
- Hub Statuses ; badges/filters dynamiques ; forms sans orm_type + initial_status + redirect/message.

## 2026-10-08 — Décision : statuses org + forms

- Status CRM org-level ≤10 ; système lockés `new` / `lost` / `converted` (seed = ces 3).
- Delete interdit si système ou si utilisé ; data test à adapter (pas de couche transition).
- Forms : drop `form_type` ; status d’arrivée ; message + redirect cumulables — `docs/04`.

## 2026-10-08 — CRM FilterRefine

- Page CRM : search full-width + `CrmFiltersPopover` (status / origin / assigned sales).
- Chips amovibles ; multi-select aligné sur `CrmLeadsFilters` (`.in`).

## 2026-10-08 — Tables : scroll horizontal confiné

- Layout dashboard : `min-w-0` + `overflow-x-hidden` sur la zone contenu.
- `TableScroll` + `SectionCard` `min-w-0` ; CRM / Sales / Clients / Coms / Offers / Forms.

## 2026-10-08 — FilterRefine réutilisable

- `components/dashboard/filter-refine.tsx` : Popover desktop / Sheet mobile.
- Field types : `checkbox`, `search-select` (multi), `range` (min/max).
- Sales branché via thin wrapper `sales-filters-popover.tsx`.

## 2026-10-07 — Sales search + filters

- Page Sales : search buyer/lead/offer + filtres payment / source / offer.
- Vue `v_organization_sales` : colonnes `offer_id`, `payment_kind`.

## 2026-10-07 — Zod row schemas → /schemas

- Migré hors `lib/services/` : sales, lead-sales, commission-compute, crm form/ambassador rows.
- Fichiers : `schemas/sales.schema.ts`, `lead-sales.schema.ts`, `commission-compute.schema.ts` + ajouts `crm.schema.ts`.

## 2026-10-07 — Sale detail sheet (CRM-style)

- Sheet aligné LeadSidePanel : sections Sale / Client / Lead / Commissions.
- Fetch related via `fetchSaleSheetRelated` ; liens “Open in …” seulement si entité trouvée.
- `findClientByEmail` + filter `organizationSaleId` sur `fetchCommissions`.

## 2026-10-07 — Sales page UX

- Table: commissions en € only, drop enrollment, colonne Payment (Subscription / Direct payment / Installment plan + detail).
- Row → `SaleDetailSheet` ; liens Clients / CRM / Commissions avec `?search=` email buyer.
- Clients, CRM, Commissions lisent `search` depuis l’URL. Footer `SectionCard` densifié (`px-4 py-2`).

## 2026-10-07 — Outbound CRM events (à builder)

- Décision : **mettre en place l’envoi d’events** (webhooks org) comme fondation Zapier/Make/ESP.
- Events v1 cibles : `lead.created`, `lead.updated`, `call.booked`, `client.converted`.
- Connecteur ESP natif = phase suivante ; events d’abord.
- Noté `04-decisions` + feature `03` todo.

## 2026-10-07 — Marketing ESP via API (archi)

- Brief EDGE : form → CRM → welcome → nurture persona → campagne hebdo → exit marketing si call booked.
- Décision : **ESP externe API-first** ; CoachStack orchestre attributs/events. Pas DIY IP/spam/domaine sur Resend.
- ESP exact (Brevo / Customer.io / MailerLite…) encore à trancher sur prix + pause nurture + exit events.
- Noté dans `04-decisions` + feature `03` revisit.

## 2026-10-07 — v_organization_sales + v_commissions

- `v_organization_sales` : offer/lead + sum coms ; fetch Sales = 1 query paginée.
- `v_commissions` : lead/member + attribution_type ; list/search paginé.

## 2026-10-07 — Fix CRM sale link display

- `v_crm_leads` manquait `organization_sale_id` → Zod default null ; panel CRM ne voyait pas la sale.
- Page Sales : lookup lead aussi via `organization_sale_id` (sale-only).

## 2026-10-07 — base_amount + on_deal / on_payment

- Sales : `base_amount_cents`, `installment_index/count` (installments).
- Plan org : `acquisitionBasis` on_deal | on_payment ; Activate base ≠ cash.
- Webhook + Settings + page Sales labels.

## 2026-10-07 — Stripe sales guarantee (1+2)

- `checkout.completed` écrit `organization_sales` (paid + amount_total).
- `invoice.paid` attach/upsert invoice ; pas de double 1er paiement.
- Metadata sub toujours posée ; docs/04 figé.

## 2026-10-07 — Commissions ↔ sale_id + sale-only

- Figé + impl : `commissions.organization_sale_id` + `leads.organization_sale_id`.
- Record sale : Create / Link / **Sale only** ; Activate exige sale (prix = sale).
- Enrollment optionnel (delivery) ; coms = argent via sale.

## 2026-10-07 — Delivery coach + Settings link

- Bouton Settings sur page Commissions → `/dashboard/settings?section=commissions`.
- Assign coach : crée coms `pool=delivery` (`beneficiary_member_id`) ; skip solo ; remplace pending à re-assign.
- `attribution_id` / `lead_id` nullable pour delivery.

## 2026-10-07 — Settings commission plan

- Colonne `organizations.commission_plan` ; Settings → Commissions (Head calc + schedules + coach).
- Preview/Activate lisent le plan org (plus seulement les defaults code).

## 2026-10-07 — Record sale + page Sales (build)

- API `record-sale` : create (enrollment+`organization_sales`) ou link enrollment → lead.
- Panel lead : Record sale → Review & activate ; Activate exige `enrollment_id`.
- Page `/dashboard/sales` + nav (`sales.view`).

## 2026-10-07 — Record sale + page Sales (décision)

- Figé : Record sale (créer/lier enrollment+sale) puis Activate ; page Sales dashboard.
- Create = enrollment+sale **one-shot** depuis le lead ; Link existing = option. Pas d’obligation Clients d’abord.
- Webhook Stripe **ne** lie **pas** le lead CRM (enrollment seul) — raccord aujourd’hui manuel.

## 2026-10-07 — Drop `manual_sales`

- Drop colonne `commissions.manual_sale_id` + table `manual_sales` + check enrollment|manual.
- Activate ne crée plus de vente parallèle ; gap produit noté (CRM vs `organization_sales`) dans `docs/04`.

## 2026-10-07 — Preview Activate + défauts immédiats

- Défauts plan : sales / ambassador / head / coach = **1× immédiat** (`single_delayed` +0).
- `previewLeadCommissions` + dialog Review & activate (lignes, due, marge org).
- Activate réutilise `buildAcquisitionCommissionPreview` ; `due_at` déjà en DB.

## 2026-10-07 — Commissions residual + schedules (spec)

- Mentor client = **coach** (delivery). Head = BU owner, défaut `of_residual`.
- Acquisition activate : of_base puis residual ; échéanciers org-global ; `due_at` à ajouter.
- Coach coms = assign + M+3 (wave delivery). Pas de ligne “reste owner”.

## 2026-10-05 — Transfer ownership backlog

- Noté `todo` : transfer org ownership (pas via change role) — `docs/03-features`.

## 2026-10-05 — Nav + page access by capability

- Sidebar/mobile : items filtrés via `lib/permissions/dashboard-nav.ts` (catalog, CRM, clients, coaching, forms, commissions, store, team).
- Pages sans cap → `NoAccessState` (offers/products/content/branding/commissions/forms) ; plus de read-only bouton par bouton catalogue.

## 2026-10-05 — CRM view_own + cancel commissions fix

- Cap `crm.leads.view_own` (defaults: tous) vs `crm.leads.view` (admin/BU only).
- Cancel/activate commissions : UI + service + RLS (`activate_commissions`) ; plus via `update_status`.

## 2026-10-04 — API capability gates (admin bypass)

- Helper `assertOrgCapability` → RPC `has_org_capability`.
- Branché : enroll manuel, clients GET, team invite, upload logo, product cover ; team service mutations (invite/roles/revoke).

## 2026-10-04 — Permissions step 7 (scope filters)

- Helpers `lead_in_scope` / `ambassador_link_in_scope` / `enrollment_in_scope` / `sales_row_in_scope` / `commission_in_scope`.
- RLS : `org` | `bu` | `own` sur leads (+ children), share links, enrollments/clients, sales, commissions ; coaching assign = packs assignés.
- Own lead = assigned / created_by / attributions / mon share link. App links UI : filtre `bu` via `ownedBusinessUnitIds`.

## 2026-10-04 — Permissions step 6 (RLS capabilities)

- Policies dashboard branchées sur `has_org_capability` (catalogue write, CRM, forms/links, coaching, commissions, BU, team, org.settings, clients/sales read).
- Helper `can_update_crm_lead` pour UPDATE leads multi-caps. Enrollments SELECT = `clients.view` ∨ `coaching.view`.
- Scope ligne BU/own = encore step 7. Storefront / coached policies inchangées.

## 2026-10-04 — Permissions step 5 (UX can())

- Pages branchées sur `useOrgCapabilities().can` : team, coaching, clients, CRM, links, commissions, products/offers.
- Rôle invite `coach` ajouté UI + API. RLS/scope data = steps 6–7.

## 2026-10-04 — BU owner defaults élargis

- `bu_owner` : + invite, catalog, clients enroll, coaching.* (packs offre→BU).
- Orgs existantes updatées ; seed sync pour nouvelles orgs.

## 2026-10-04 — Offer ↔ Business unit

- `offers.business_unit_id` + trigger same-org ; UI create/edit offer.
- Scope clients BU via offer (pas enrollment). `bu_owner.clients.view` default on.

## 2026-10-04 — BU owner permissions configurables

- Pseudo-rôle matrix `bu_owner` (DB + colonne Settings, label “BU scope only”).
- `has_org_capability` / app `can()` lisent la table (plus de hardcode).
- Attention : filtre **row-level** scope BU encore à brancher (étapes 6–7) — today cap OK, isolation BU partielle.

## 2026-10-04 — Permissions step 4 (Settings UI)

- Settings → Permissions (owner only) : matrix rôles × sous-actions, toggle → update row + invalidate.
- Steps 5–7 encore : brancher UX pages, RLS, filtres scope.

## 2026-10-04 — Permissions steps 1–3

- DB matrix + helpers (`has_org_capability` unifié).
- App : `lib/permissions/capabilities.ts`, service `org-permissions`, hook `useOrgCapabilities` → `can()` / `scope` / `isBuOwner` (React Query, 1×/org).
- Rôle TS `coach` ajouté ; UI Settings / wire pages = steps suivants.

## 2026-10-04 — Permissions steps 1–2 (DB)

- Table `organization_role_permissions` + seed/trigger/backfill (4 orgs × 145 rows).
- Helpers : `has_org_capability` (matrix + owner + BU grants), `org_permission_scope`, `is_bu_owner*`, `current_org_member_*` (RLS only).

## 2026-10-04 — Permissions org (décision)

- Matrix = **sous-actions** (`crm.leads.update_status|edit|delete`, `forms.links.*_own|manage_others`, `coaching.sessions.*`…).
- Rôle `coach` ; scope `org|bu|own` ; BU owner = admin-like BU (liste dans `04`).
- Defaults seed figés ; impl todo.

## 2026-10-04 — Solo auto-assign coach (DB trigger)

- Trigger AFTER INSERT `enrollment_products` : si org solo + produit coaching → `coaching_assignments` = member owner.
- Backfill packs solo déjà sans assign. Choix DB (pas app) pour couvrir manuel + Stripe.

## 2026-10-04 — Dashboard coaching assign vs page vide

- Cause : 2 enrollments coaching org 2 encore `active` mais `expires_at` passé → exclus de `v_coached_products`.
- `dashboard_overview.unassigned_coaching_count` ne filtrait ni status ni expiry → fausse notif.
- Fix RPC : count + active_* alignés sur status + `expires_at > now()`.

## 2026-10-04 — Org mode solo / team

- DB : `organizations.mode` ; existantes → `team` ; create-org → `solo`.
- Capabilities `useOrgCapabilities().mode` ; gate `TeamPlanGate` (Upgrade stub) sur Team / Commissions / BU.
- Solo : hide CRM closer/setter/ambassador/sales assign + lead Team & pay + coaching assign.

## 2026-10-04 — CRM lead sheet UX

- Sheet lead : header = contact ; sections Pipeline / Team & pay / Details / Activity.
- Attributions en badge rôle + % ; plus de résumé Ambassadors redondant.
- Commissions panel compact (`embedded`) dans Team & pay.

## 2026-10-03 — Domaine final `coachstack.co`

- Figé : produit = `coachstack.co` ; coached = `app.coachstack.co`.
- Docs `04` / `01` / `03` mis à jour ; infra DNS/Vercel/cookies toujours todo.

## 2026-10-01 — Manual enrollment + `organization_sales.source`

- DB : `organization_sales.source` (`stripe`\|`manual`, default stripe). Webhook invoice pose `source=stripe`.
- API `POST .../enrollments/manual` + service : enrollment sans Stripe + sale `manual`/`one_time` ; `expires_at` depuis offre ; supersede prior même offer+buyer.
- UX : `/dashboard/clients` → Add enrollment (email, offer, montant).
- Roadmap notée : subs manuels + link Stripe txn ; drop `manual_sales` ; job status expired sur `expires_at`.

## 2026-10-01 — Drop `public.users` + FK → `profiles`

- Drop vue morte `organization_client_enrollments` (plus appelée ; clients = `v_organization_clients` / `buyer_email`).
- FK `organizations.owner_id` + `organization_members.user_id` repointées vers `profiles(user_id)` (préflight 0 orphelin).
- Drop table `public.users`. Pas de fichier `.sql` repo ; migration MCP `drop_public_users_repoint_fks_to_profiles`.
- Docs `06` mis à jour. Gap sécu restant : REVOKE `link_guest_purchases_to_user` (anon/authenticated).

## 2026-10-01 — Audit identité email (users vs profiles)

- Décision enrollment/portail : garder contrat `enrollment_products` + agrégation UI (pas figé ADR à la demande Habib).
- Emails : `auth.users` (compte) ; `buyer_email` / `leads.email` / `organization_members.email` (métier). `profiles` sans email.
- Gap noté : `link_guest_purchases_to_user` exécutable anon/authenticated.

## 2026-07-27 — CRM closer/setter + auto commission rates

- Colonnes CRM Closer / Setter (noms + % si défini) ; Ambassadors affichent aussi le %.
- Side panel attribution : % auto depuis defaults member à la sélection (éditable).
- Submit form `?ref=` : attribution ambassador créée avec `% ambassador` du member si défini.

## 2026-07-27 — Member commission defaults per role type

- DB : `organization_members` → `% sales / ambassador / coach` (legacy single rate migré vers sales).
- Activation acquisition : fill null rates via type d’attribution (closer/setter→sales, ambassador→ambassador).
- Team : invite 3 %, dialog « Change role & commissions » + bouton Edit commission defaults.

## 2026-07-27 — Commissions wave 1 (acquisition)

- DB : defaults member/BU, BU owner, lock lead, manual_sales, commission_documents stub, enrollment_id nullable.
- Activate/Cancel sur lead converted ; soft-lock attributions ; page `/dashboard/crm/commissions`.
- Delivery coach = wave suivante.

## 2026-07-27 — Spec commissions figée

- Trigger : bouton Activer/Annuler sur lead `converted` (pas auto au statut seul).
- Base = % brut pack ; installments = étalement du % ; on-platform link email/manuel ; off-platform = `manual_sale`.
- Pools acquisition (+BU) puis delivery (coach à l’assign ; solo = pas de com coach).
- Defaults % à l’invite + par BU ; droits member / BU owner / admin ; v1 suivi A, DB prête pour factures B.
- Détail : `docs/04-decisions.md`.

## 2026-07-24 — Messagerie Unipile (backlog)

- Feature notée `todo later` dans `03` : email/WhatsApp via Unipile, user connecte ses comptes.
- Pricing ciblé : add-on par siège/connexion (pas crédits) ; aligné coût Unipile.

## 2026-07-23 — Form post-submit soft redirect

- Thank-you + lien + redirect ~3.5s (pas de jump immédiat).
- `redirect_url` UI + enforce service : seulement `form_type=default`.

## 2026-07-23 — BU copy + colonne CRM conditionnelle

- Panel BU : explication (branches, share links, splits futurs ; skip si solo).
- Table CRM : colonne Business unit seulement si l’org a ≥1 BU active.

## 2026-07-23 — CRM IA hub Forms

- Hub `/dashboard/crm/forms` : Forms, Fields, BU, Share links.
- CRM pipeline garde raccourcis Fields / BU ; redirects settings + ambassador.
- Sidebar + mobile : entrée Forms séparée.

## 2026-07-23 — CRM share links / BU / hidden / doublon

- DB : `business_units`, form `visibility` + `success_message`, link defaults/BU, lead `is_duplicate`.
- Public form : clicks GET+ref, honeypot + rate limit, prefill hidden, thank-you configurable.
- Share links : tout membre + label canal + BU + hidden defaults ; CRM doublon = row rouge + badge.

## 2026-07-23 — Spec CRM forms / share / BU

- Tout membre org peut créer un lien (label canal + tracking member).
- Doublon email = nouveau lead ; UI = ligne rouge clair + badge (pas de colonne).
- Thank-you configurable ; clicks + anti-spam oui ; hidden fields gardés.
- BU first-class avant commissions ; pas de split engine sur champs CRM.

## 2026-07-23 — Rachat = nouveau contrat

- Webhook checkout : expire anciens active/paused (même offer+buyer) puis INSERT.
- Colonne `stripe_checkout_session_id` (unique) pour idempotence.
- Docs `04` / `06` à jour.

## 2026-07-23 — Coached portal #4–#8 / #10

- Routes programmes = `enrollment_product_id` (plus de dédup / lien par `product_id`).
- Copy : Organizations + Programs ; coach = personne assignée ; Discover retiré.
- Dual-rôle soft : CTAs dashboard + “Open coach workspace” profil.
- Page coaching pack : hors shadcn Card (bordures plates).

## 2026-07-23 — Access hardening #1+#2

- Edge : session requise `/dashboard/*` et `/coached/*` (hors login/signup/landing).
- `v_coached_products` : `security_invoker` + revoke `anon` SELECT.
- #3/#9 rôles plus tard ; #4–8/#10 backlog figé dans `04-decisions`.
- #5 : UI “Waiting for client to sign up” déjà en place.

## 2026-07-23 — Offre = composition + accès + séances

- Composition éditable si 0 vente ; sinon nouvelle offre + archive.
- `access_duration_months` + `sessions_count` sur `offers` ; plus sur produit coaching (UI).
- Webhook expiry depuis l’offre ; `v_coached_products` filtre expires_at.
- Checkout refuse offre sans produits actifs.

## 2026-07-23 — docs/06-database.md + purge migrations locales

- Nouveau `docs/06-database.md` : tables, vues, RPC, triggers (live MCP).
- Supprimé `supabase/migrations/*.sql` (incomplets / trompeurs) ; README pointe vers `docs/06-database.md`.
- AGENTS + project-memory mis à jour.

## 2026-07-21 — Docs Stripe webhooks + ngrok

- Dev : `ngrok http 3000` → endpoint `/api/webhooks/stripe-connect`.
- Prod : remplacer URL ngrok + secret `STRIPE_CONNECT_WEBHOOK_SECRET` (voir `01-tech-stack.md`).

## 2026-07-21 — Checkout interstitial shipped

- `/org/.../buy/...` : partnership screen → auto Stripe (~2.5s) + CTA.
- `create-checkout` : email optionnel (Stripe collecte).
- Return : success → `/order-success` ; cancel → même buy link (pas d’URL externe).

## 2026-07-21 — External checkout = interstitial → Stripe Session

- Pas de Payment Link brut pour sites externes.
- Lien CoachStack → interstitial EN → Checkout Session.
- Key features offre = non nécessaires.
- Return URLs figées (success CoachStack / cancel = retry buy).

## 2026-07-21 — Storefront UI shipped

- Dashboard `/dashboard/branding` → “Store page” (logo, bio, 1 couleur, copy link).
- Public `/org/[slug]` + preview : liste offers + Buy (plus hero/FAQ/stats…).
- API public : toutes les offers actives (ignore `visible_offer_ids`).
- Nav sidebar : label “Store page”.

## 2026-07-21 — Branding = storefront simple

- Décision : Stan/Gumroad/Linktree-like (pas mini-site).
- Vente multi-canal (buy links) ; delivery chez CoachStack.
- Keep/cut figés dans `04-decisions.md`.

## 2026-07-21 — Fix RLS recursion organizations

- Cause : policy orgs lisait `organization_members`, policy owner members relisait `organizations`.
- Fix : helpers `is_org_owner/member/enrolled` SECURITY DEFINER + policies mises à jour.

## 2026-07-21 — RLS harden + offers members

- Orgs SELECT : owner | membre | enrolled (views OK, plus de leak global).
- Offers / offer_products / variants : manage par membre org (comme products).
- `course_lesson_progress` : RLS own-row ; fix fetch sur `enrollment_product_id`.
- Roadmap : matrix rôles catalogue.

## 2026-07-19 — Coaching v1 figé (org-first)

- Gardé : packs + assign coach + KPI unassigned + `enrollment_products`.
- Config produit coaching = détails commerciaux du pack (pas scheduling).
- Séances = tracking secondaire ; booking / payouts = plus tard.
- UI : copy produit + page coaching recentrée sur assignation.

## 2026-07-19 — Fix create product slug

- Cause : `createProduct` insertait `slug: null` alors que `products` n’a pas de colonne `slug` (PGRST204).
- Fix : retiré `slug` de l’insert.

## 2026-07-19 — Bug create-org multi-membership

- Cause : `/create-organization` redirige vers dashboard si `organizations.length > 0` (ex. sales déjà membre d’une org).
- Fix : autoriser création d’une org supplémentaire (aligné Account / org switcher).

## 2026-07-19 — Stripe soft-gate

- Retiré hard-block Stripe sur products/offers (draft OK sans Connect).
- Stripe obligatoire à publish offer / generate price / checkout live.
- Banner + redirect sur offer draft si Stripe non connecté.
- Suite : continuer le découpage features (vision keep/cut).

## 2026-07-15 — Nettoyage rules

- Supprimé rules inutiles : `lessons.mdc` (vide), `pm-project.mdc`, `project-dev.mdc`, `gemini-design-mcp.mdc`.
- Conservé : `project-memory.mdc`, `general-rules.mdc`, `design-system-ux.mdc`.
- Nettoyé refs mortes dans `AGENTS.md` / `general-rules` / `project-memory`.

## 2026-07-15 — Setup mémoire projet

- Créé `AGENTS.md`, `docs/00–05`, `.cursor/rules/project-memory.mdc`.
- Injecté le contexte CoachStack depuis overview Habib + scan repo (Next 16, Supabase, Stripe, React Query).
- Status produit : **pause reprise** ; vision à discuter avant refonte.
- Suite : session vision/product (ICP, coupe/simplifie, priorité) → remplir `00-overview` + `04-decisions` + éventuelles lignes `03-features`.
- Ne pas lancer de gros chantier code tant que vision non accordée.
