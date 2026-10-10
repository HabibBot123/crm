# Database (Supabase live)

**Source de vérité schéma / contrats DB** pour CoachStack.

Ne pas se fier à `supabase/migrations/` (vidé volontairement — incomplet et trompeur).  
Vérifier / enrichir via **MCP Supabase** (projet **CRM Sport**) quand le doute reste.

Projet ref (MCP) : `qhytcxblwdyrcqeekkbk` — ne pas y mettre de secrets.

---

## Comment maintenir ce fichier

- Découverte via MCP (tables, fonctions, triggers, vues) → **documenter ici** dans la même session.
- Pas de dump SQL complet : contrats (rôle, quand ça tourne, qui appelle).
- À terme : décrire toutes les tables (colonnes clés, relations, notes RLS).

---

## Tables (`public`)

Inventaire live (2026-07-23). Détail colonnes = à compléter progressivement.

### Core org / auth app

| Table | Rôle (court) |
|-------|----------------|
| `organizations` | Orgs coach ; branding JSON ; Stripe Connect. **`owner_id` → `profiles(user_id)`**. **`mode`** = `solo` \| `team`. **`commission_plan`** jsonb (overrides slots acquisition + coach ; null = defaults code) |
| `organization_role_permissions` | Matrix org × rôle (`admin`/`sales`/`ambassador`/`coach`/`staff`/**`bu_owner`**) × capacité. `bu_owner` = statut BU (pas invite), scope BU. Owner non stocké (= tout). Seed auto + RLS member read / owner write. |
| `organization_sales` | Encaissements (Stripe / manuel). + **`sold_at`** (date métier CA) ; `created_at` = insert. + `base_amount_cents`, `installment_index`, `installment_count`. Uniques Stripe. **`source`** = `stripe` \| `manual` |
| `organization_members` | Membres / rôles ; defaults com **par type** : `default_commission_rate/fixed_{sales,ambassador,coach}`. **`user_id` → `profiles(user_id)`** |
| `profiles` | **Profil app actif** (PK `user_id` = `auth.users.id`) — `full_name`, avatar, onboarding, `signup_source`. **Pas d’email.** Cible FK publique pour org/members/enrollments. |

> `public.users` **supprimée** (2026-10-01). Ne plus la référencer.

### Identité & emails (audit 2026-10-01)

| Source | Contient email ? | Quand écrit | Quand lu |
|--------|------------------|-------------|----------|
| `auth.users` | **Oui** (source de vérité compte) | Signup / Auth Supabase | Session app (`user.email`) ; RPC `get_user_id_by_email` (webhook, **service_role**) |
| `public.profiles` | Non | Trigger `on_auth_user_created` → `handle_new_user` ; upsert `signup_source` dans `app/auth/callback` | Joins display name (coaching, clients, `v_coached_products`) |
| `enrollments.buyer_email` | Oui (dénormalisé achat) | Webhook Stripe checkout (lowercased) | Clients CRM, coaching ops, rachat, link guest, `v_coached_products.user_mail` |
| `organization_sales.buyer_email` | Oui | Webhooks ventes | Agrégats clients / link guest |
| `leads.email` | Oui | Submit form CRM (lowercased) | Pipeline CRM / commissions |
| `organization_members.email` | Oui | Invite team | `v_organization_members` / team UI |

Flux guest → compte : checkout pose `buyer_email` (+ `user_id` si compte existant via `get_user_id_by_email`) → login/signup → `link_guest_purchases_to_user(user_id, email)` depuis auth callback (admin).

**Sécurité / compliance notes (pas encore corrigé)** :
- `link_guest_purchases_to_user` est `SECURITY DEFINER` et **exécutable par `anon` + `authenticated`** → risque d’attacher des enrollments guest à un compte arbitraire si on connaît l’email. Doit être **REVOKE** sauf `service_role`.
- `profiles` : policy SELECT `true` pour tout `authenticated` (trop large — noms/avatars globaux).
- Email compte = `auth.users` ; ne pas re-dupliquer dans `profiles`. Clients = `buyer_email` ; team = `organization_members.email`.

### Catalogue & vente

| Table | Rôle (court) |
|-------|----------------|
| `products` | `course` \| `coaching` |
| `product_modules` / `product_module_items` | Structure cours |
| `product_coaching` | Pack coaching delivery (`delivery_mode`). `sessions_count` / `period_months` = **legacy** ; source de vérité commerciale = `offers` |
| `content_folders` / `content_items` | Bibliothèque média |
| `offers` | SKU commercial (prix, billing, Stripe IDs, **`access_duration_months`**, **`sessions_count`**, **`business_unit_id`** nullable → scope BU ; enrollments héritent via `offer_id`) |
| `offer_products` | M:N offre ↔ produits (bundle) — éditable seulement si 0 enrollment |
| `offer_variants` | Variantes prix / installments (même composition) |

### Achat & delivery

| Table | Rôle (court) |
|-------|----------------|
| `business_units` | BU org ; **`owner_member_id`**, **`default_commission_rate/fixed`** |
| `enrollments` | Achat / accès ; `user_id` nullable ; `buyer_email` ; `expires_at` ; Stripe IDs nullable (manuel OK) ; **`stripe_checkout_session_id`** (idempotence checkout Stripe) |
| `enrollment_products` | **Snapshot** produits de l’offre au moment de l’INSERT enrollment |
| `coaching_assignments` | Coach assigné sur un `enrollment_product_id` (1 coach ; coms delivery à l’assign ; change/remove tant que 0 session + 0 paid) |
| `coaching_sessions` | Tracking séances |
| `course_lesson_progress` | Progression leçons |
| `coached_invoices` | Factures côté coached |
| `commissions` | Argent via **`organization_sale_id`**. Acquisition : + `lead_id` + `attribution_id`. Delivery : + `beneficiary_member_id` (+ enrollment optionnel). |
| `leads` | + `organization_sale_id` (Activate) ; `enrollment_id` optionnel (delivery) |
| `commission_documents` | Stub factures/statements (v1 sans UI fiscale) |
| `leads` | + `commissions_activated_at/by`, `sale_source` ; soft-lock attributions si activé |
| `crm_forms` | Forms publics ; **`success_message`** |
| `crm_form_fields` | Champs du form ; **`visibility`** visible\|hidden |
| `crm_ambassador_links` | Share links (tout membre) ; label canal ; **`default_field_values`** ; **`business_unit_id`** ; clicks |

> Commissions wave 1 live (2026-07-27). Defaults member **sales / ambassador / coach** (un membre peut cumuler sales+ambassador). Delivery coach = wave 2.

### CRM inbound

| Table | Rôle (court) |
|-------|----------------|
| `leads` / `lead_status` / `lead_field_values` / `lead_attributions` | Pipeline leads ; `leads.owner_id` → `organization_members` (ops owner, pas pay role) ; `leads.business_unit_id` nullable + trigger same-org ; `leads.status` = text key FK `(organization_id, status)` → `organization_lead_statuses` |
| `organization_lead_statuses` | Catalogue status org (≤10) ; seed `new`/`lost`/`converted` (trigger org insert) |
| `crm_fields` / `crm_forms` / `crm_form_fields` | Formulaires ; `crm_forms.initial_status` ; `crm_fields.filterable` (max 4) ; **plus de `form_type`** |
| `crm_ambassador_links` | Liens ambassadeur |

---

## Vues (`public`)

| Vue | Notes |
|-----|--------|
| `v_coached_products` | Accès **portail** coached. **`security_invoker=true`**. Filtre status vivant + expiry. `completion_total` coaching ← `offers.sessions_count`. |
| `v_coaching_packs` | Accès **ops** `/dashboard/coaching`. Même grain que ci-dessus, **sans** filtre status/expiry (historique). Display client : `profiles.full_name` → `buyer_name` → `buyer_email`. `security_invoker=true` ; pas `anon`. |
| `v_organization_clients` | Clients org (agrégats enrollments ; `client_email` ← `buyer_email` ; noms ← `profiles`) |
| `v_organization_members` | Membres enrichis (`om.email` + `profiles.full_name`) |
| `active_students` | Étudiants actifs |
| `v_crm_leads` / `v_crm_forms` / `v_crm_ambassador_link_stats` | CRM inbound ; `v_crm_leads` : `owner_id` / `owner_name` (+ `organization_sale_id`) |
| `v_commissions` | Liste / search commissions ; `security_invoker` ; flux = `pending\|paid` (enum garde `canceled` legacy ; cancel CRM = DELETE pending). `lead_name` = lead → profile → `enrollments.buyer_name` ; `lead_email` = lead → `buyer_email`. |
| `commissions_summary_by_member(...)` | Agrégat pending/overdue par bénéficiaire + `pending_ids` pour pay-all ; SECURITY INVOKER |
| `crm_sales_analytics(org, from, to, bu_id?, preset?)` | Analytics Sales/CRM : KPIs (P&L + Cash coms) + `revenue_series` + `commission_series` (paid history + forecast miroir) + members/packs/BUs/funnel ; CA sur `sold_at` ; SECURITY INVOKER ; gate `sales.view` |
| `v_organization_sales` | Liste Sales : offer/lead + sum coms ; + `offer_id`, `payment_kind`, **`sold_at`** ; `security_invoker` |

> `organization_client_enrollments` **droppée** (2026-10-01) — remplacée par `v_organization_clients` + query `enrollments` détail.

## Fonctions / RPC (contrats)

| Fonction | Rôle |
|----------|------|
| `link_guest_purchases_to_user(p_user_id, p_email)` | **Reconcile post-achat** : set `user_id` sur `enrollments` + `organization_sales` où `user_id IS NULL` et email = `buyer_email`. Appelée depuis `app/auth/callback/route.ts` (admin RPC). |
| `get_user_id_by_email(p_email)` | Lookup `auth.users` (SECURITY DEFINER). Webhook checkout. |
| `handle_new_user()` | Trigger auth : insert `profiles` seulement (pas le link enrollments). |
| `enrollment_products_fill()` | Trigger : copie `offer_products` → `enrollment_products` à l’INSERT enrollment. |
| `dashboard_overview(p_organization_id)` | Metrics dashboard (RPC). `unassigned_coaching_count` / `active_enrollments` / `active_students` alignés sur accès vivant : status + `expires_at` (même logique que `v_coached_products`). |
| `is_org_owner` / `is_org_member` / `is_org_enrolled` | Helpers RLS (évite récursion policies). |
| `has_org_capability(org, cap)` | Enforcement : owner **ou** matrix rôle invite **ou** (`is_bu_owner` ∧ row `role=bu_owner` allowed). Settings lit la table. Branché dans RLS dashboard (step 6). |
| `can_update_crm_lead(org)` | OR des caps lead mutate (`update_status` / `edit` / `assign_sales` / `manage_attributions` / `activate_commissions`). |
| `crm_leads_page(...)` | Liste CRM filtrée + paginée (SECURITY INVOKER) ; members via owner/attributions ; champs perso via `EXISTS` `lead_field_values`. |
| `crm_sales_analytics(..., p_preset?)` | Payload jsonb analytics ; `p_preset` pilote la fenêtre forecast miroir (7d/30d/month/year/custom). Scope via `lead_in_scope` / `sales_row_in_scope` / `commission_in_scope`. |
| `bu_owner_grants_capability(org, cap)` | Lookup matrix `bu_owner` (plus de liste hardcodée). |
| `org_permission_scope(org)` | `org` \| `bu` \| `own` (owner/admin → org ; sinon BU owner → bu ; sinon own). |
| `lead_is_own` / `lead_visible_to_caller` / `lead_in_scope` | Leads : `view_own` **ou** (`view` ∧ scope org/bu/own). Own = `owner_id` / created_by / attributions / share link. |
| `ambassador_link_in_scope` / `enrollment_in_scope` / `sales_row_in_scope` / `commission_in_scope` / `offer_in_bu_scope` | Filtres ligne RLS step 7. `enrollment_in_scope` : `clients.view` **ou** `commissions.view_all` (même scope org/bu) **ou** `commissions.view_own` (enrollments liés à mes coms) **ou** `coaching.view`. |
| `current_org_member_role` / `current_org_member_id` / `is_bu_owner` / `is_bu_owner_of` | Contexte membre courant. |
| `seed_organization_role_permissions(org)` | Seed / backfill matrix. |
| `set_updated_at()` | Touch `updated_at`. |

---

## Triggers (contrats)

| Trigger | Table | Event | Effet |
|---------|-------|-------|--------|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user()` → profile |
| `enrollment_products_fill_trigger` | `enrollments` | AFTER **INSERT** only | Snapshot produits ; **pas** sur UPDATE/repurchase |
| `enrollment_products_solo_auto_assign_coach_trigger` | `enrollment_products` | AFTER **INSERT** | Si org `mode=solo` + produit `coaching` → insert `coaching_assignments` vers le member owner (`ON CONFLICT DO NOTHING`). Couvre manuel + Stripe. |
| `organizations_seed_role_permissions_trigger` | `organizations` | AFTER **INSERT** | Seed matrix `organization_role_permissions` (defaults docs/04). |
| `*_updated_at` | orgs, members, profiles, users | UPDATE | `set_updated_at` |

Pas de `pg_cron` / job d’auto-expiry enrollment constaté (2026-07-23).

---

## Flux critiques (référence)

### Achat guest → compte

1. Checkout Stripe → webhook crée `enrollments` (`buyer_email`, `user_id` null si pas de compte).
2. Trigger remplit `enrollment_products`.
3. Signup/login → auth callback → `link_guest_purchases_to_user`.
4. Portail : `v_coached_products` + services coached (certains matchent aussi `buyer_email` en secours).

### Bundle multi-produits

- Composition commerciale : `offer_products`.
- À l’achat : snapshot figé dans `enrollment_products`.
- Delivery / assign / progress : grain = `enrollment_product_id`.

### Accès & expiry

- `offers.access_duration_months` → webhook pose `enrollments.expires_at` (NULL = lifetime).
- `offers.sessions_count` → quota séances coaching du SKU.
- Portail : `v_coached_products` exclut les enrollments expirés.
- Legacy `product_coaching.period_months` / `sessions_count` : ne plus écrire depuis l’UI produit.
- **Rachat** : expire-then-insert (manuel + Stripe). Unique vivant = `(offer_id, user_id)` where `active|paused`. Idempotence webhook via `stripe_checkout_session_id`.
- **Job** : `expire_due_enrollments()` + cron `expire-due-enrollments` (03:15 UTC) ; critère = `expires_at < now()` seulement (`NULL` = lifetime / abo ouvert).

### Gaps connus (ne pas “réparer” sans décision)

- Snapshot trigger INSERT-only (OK tant que composition non mutée après vente).
- Colonnes legacy encore présentes sur `product_coaching` (à dropper plus tard).
- Migrations repo absentes → évolution DB via MCP + note ici.
