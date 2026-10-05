# Session log

Entrées courtes (3–6 lignes). Plus récent en haut.

---

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
