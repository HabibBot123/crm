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
| Manual enrollment + sale | done | Dialog Add enrollment ; lookup email → name + enrollments vivants ; `source=manual` |
| Products list + CRUD course/coaching | done | Course = content ; coaching = pack commercial + ops assign |
| Content library upload | done | `/dashboard/content`, tus |
| Offers + variants + billing types | done | Overview = name + TipTap desc + preview buy ; Pricing = base (lock si active) + checkout links/variants ; plus de key features |
| Offer archive via Stripe Connect | done | pas de delete offre |
| Branding / store page | done | Logo, TipTap bio, 1 couleur, offers + Buy. Editor split + preview live (`StorefrontView`) — `docs/04` |
| Public buy links | done | Interstitial → Stripe Checkout Session ; share links sur offre |
| Headless checkout API docs / embed | todo | Moins prioritaire si redirect Session suffit |
| Stripe Connect onboarding | done | Requis pour **publish/sell** seulement (plus pour draft catalogue) |
| Team invites / members | done | `/dashboard/team`, `/invite/team` ; rôle `owner` non assignable via change role |
| Transfer org ownership | todo | Flow dédié : sync `organizations.owner_id` + rôles membres (pas via select rôle) |
| Coaching packs + assign coach | done | `/dashboard/coaching` table + sheet ; FilterRefine (coach + status) ; historique via `v_coaching_packs` |
| Coaching sessions (create/complete) | partial | Create + complete + note ; quota `sessions_count` → status `completed` ; pas de booking avancé |
| Coach payouts by volume | todo | Après assign ; pas en v1 |
| Enrollment auto-expire job | done | `expire_due_enrollments()` + cron 03:15 UTC ; base = `expires_at` only ; rachat = expire-then-insert |
| Manual sub + link Stripe txn | todo | Étendre enrollment manuel : abonnements off-platform / rattacher une transaction Stripe existante |
| Unify sales / drop `manual_sales` | done | Table + `commissions.manual_sale_id` droppés ; ventes = `organization_sales` seulement. Activate CRM manuel ne crée plus de sale parallèle (gap produit — voir `docs/04`) |
| Org mode Solo vs Team | partial | `organizations.mode` ; hide/gate UX ; Upgrade CTA stub (billing todo) |
| Solo → Team upgrade billing | todo | CTA “Upgrade to Team” (TeamPlanGate) — pas encore branché |
| Org role permissions (owner matrix) | done | Matrix Settings + UX `can()` + RLS + scope ; sidebar/mobile filtrés ; pages sans cap → No access — `docs/04` |
| Account + settings | done | `/dashboard/account` : même UI Profile/Security que `/profile` (Signed in with ; reset si email) ; `/settings` |

## CRM inbound (forms / leads)

| Feature | Status | Notes |
|---------|--------|-------|
| Pipeline leads + side panel | partial | `/dashboard/crm` ; **Owner** (`owner_id`, mail à l’assign) ≠ pay roles ; colonnes Closer/Setter/Ambassadors |
| CRM filters (RPC + custom fields) | done | `crm_leads_page` ; status/origin/members/BU ; champs filtrables ≤4 — `docs/04` |
| Org lead statuses (≤10, nom+couleur) | done | Hub Statuses ; système `new`/`lost`/`converted` ; custom add ; no delete if used — `docs/04` |
| Commission calc of_base / of_residual + schedules | partial | Team/coach via Settings + Activate ; BU Owner → settlement périodique (backlog ci-dessous) — `docs/04` |
| Forms hub (inbound) | done | `/dashboard/crm/forms` : Forms, Fields, Statuses, Share links |
| CRM fields + form builder | partial | hub Fields + form editor ; hidden + success message ; drop `form_type` ; `initial_status` |
| Public form `/org/.../form/...` | done | clicks `?ref=`, honeypot, rate limit ; thank-you + redirect cumulables ; status d’arrivée form |
| Share links (tout membre + label canal) | partial | `/dashboard/crm/forms/links` (+ redirect ambassador) |
| Dedup email (lead + badge) | done | `is_duplicate` ; UI row + badge |
| Clicks tracking + anti-spam POST | done | GET+ref / honeypot + rate limit |
| Business Units first-class | done | Settings → Business units ; colonne CRM si ≥1 BU ; owner + % default |
| BU Owner settlement (périodique) | backlog | Voir section backlog ci-dessous — `docs/04` |
| Commissions (acquisition + delivery) | partial | Team + coach ; page payouts ; BU Owner sorti vers settlement — `docs/04` |
| Record sale depuis lead CRM | partial | Create / Link / **Sale only** ; sale = tréso + `base_amount` installment — `docs/04` |
| Page Sales (dashboard) | done | `/dashboard/sales` ; cap `sales.view` ; enrollment + lead + coms |
| Analytics Sales/CRM | done | `/dashboard/analytics` ; cap `analytics.view` ; modes org / BU Owner ; presets 7d/30d/Month/Quarter/Year ; RPC `crm_sales_analytics` ; P&L/Cash ; `docs/04` |
| Analytics Marketing | done | Switch Sales/Marketing ; KPI partagés (Revenue/Leads/Conv) puis lens Inbound \| Campaigns ; inbound = RPC `crm_marketing_analytics` ; campaigns = sent in period + delivery funnel (`campaign_delivery_stats`) — `docs/04` |
| Overview Home (member / org / bu) | done | `/dashboard` : défaut Member ; Organization = `analytics.view` ; Business unit = statut BU owner ; KPIs 30j + attention — `docs/04` |
| Analytics Products / packs | todo later | Best sellers / mix packs (sorti de Sales analytics) |
| Devise org (1 currency) | todo later | 1 devise / org ; Checkout + sales + coms + analytics + settlements dans cette devise ; reject Stripe ≠ org — `docs/04` |
| Booking Nylas | todo | phases ultérieures |
| Messagerie prospect (email / WhatsApp) | todo later | Via Unipile (user connecte ses comptes). Inbox + historique sur lead. Billing : **add-on par siège / connexion**, pas crédits (coût Unipile = compte connecté). WhatsApp officiel Meta / crédits = éventuelle phase 2. |
| Outbound CRM events (webhooks) | todo | Fondation integrations : émettre events (`lead.created`, `lead.updated`, `call.booked`, `client.converted`…) vers URL org → Zapier / Make / ESP. À mettre en place — `docs/04`. |
| Marketing : domaine custom org (DNS) | partial | Settings → Email ; create/verify/refresh/remove via Resend Domains API ; table `organization_sending_domains` — `docs/04` |
| Marketing : sync contacts → Resend | partial | Webhook DB `campaign_contacts` → Inngest → properties org-scopées Resend ; Sync audience manuel encore là ; dirty catch-up au Send — `docs/04` |
| Marketing : quota contacts **par org** | todo | **Avant sortie app** : plafond produit CoachStack (indépendant du quota Resend plateforme). Bloquer opt-in / sync au-delà. Pas d’UI limite V1 sync. — `docs/04` |
| Marketing : segments CRM → Resend | partial | `campaign_segments.filter_json` (AND/OR/NOT) ; resolve local ; membership mise à jour au Sync audience — `docs/04` |
| Marketing : campagnes (Campaign + templates) | partial | Templates + Campaigns pages dédiées. Edit / test / send OK. Hub tabs Campaigns | Templates (+ segments) | Audience. Suite Étape 6 UI stats — `docs/04`. |
| Marketing : stats campagne / emails | partial | Tables + webhook + RPC + hub tabs + détail/sheet livrés. Brancher `RESEND_WEBHOOK_SECRET` + endpoint Resend pour events live. `docs/04` Étape 6. |
| Marketing : consent / topics | partial | Form case + `marketing_opt_in` ; opt-out via `/unsubscribe` (confirm) → topic `opt_out` ; sync triggers ; topic Resend à l’ajout domaine — `docs/04` |
| Marketing : séquences auto (welcome pack, nurture) | todo later | Phase 2 ; orchestration CoachStack (Inngest/Trigger…), **pas** Resend Automations — `docs/04` |

## Public & vente

| Feature | Status | Notes |
|---------|--------|-------|
| Page publique `/org/[slug]` | done | storefront minimal (identité + offers + Buy) |
| Checkout buy flow | done | Interstitial EN → Stripe ; success `/order-success` ; cancel = retry buy |
| Preview org pages | done | `/org/preview/...` |
| Short URL `/c/[coach]/[product]` | done | |
| Order success / checkout pages | done | |

## Espace coached / Community (Circle-like)

Direction produit : `docs/04` (2026-10-15). Build order : **shell org→space d’abord**, puis feeds / DM / stats.

| Feature | Status | Notes |
|---------|--------|-------|
| Auth membre | done | `/login` + `/signup` sur host `app.*` (coach = mêmes paths sur `localhost`) |
| Org switcher (logo) | done | Trigger marque ; sheet mobile / dropdown desktop ; hub cards logo |
| Home programmes + orgs (flat) | done | `/home` ; shell org + spaces |
| Courses list + detail | done | Nav `/courses` ; player `/courses/[id]` : PageHeader + nav curriculum (style Spaces) + Contents sheet mobile |
| Coaching list (client + coach) | done | `/coaching` + Home via `useOrgCoachingInbox` (client enrollments ∪ assignments coach) |
| Coaching pack workspace | done | Detail `/coaching/[id]` : onglets Sessions + Chat DM embarqué ; create/edit séances client/coach |
| Organizations list | done | Switcher org / hub (plus `/coached/coaches`) |
| Discover coaches | deferred | retiré jusqu’à vrai catalog |
| Profile coached (+ avatar) | done | `/profile` : NavList Profile/Security/Billing ; `AccountProfileCard` + `SecuritySection` partagés avec dashboard ; reset password seulement si signed-in with email |
| Hosts `app.*` + `{slug}.app.*` | partial | Proxy parse OK ; DNS wildcard `*.app.coachstack.co` + cookies encore todo |
| Shell org → multi-spaces | partial | Host `{slug}.app.*` ; hub auto-org ; paths `/home` `/courses` `/coaching` `/s/…` ; dashboard Community |
| Membership rules offer→space | done | Create/Edit (dashboard + app membre) ; `remove_on_expire` ; empty = all living ; add/remove sur `/s/…/members` + dashboard sheet |
| Multi-feeds / space | done | Shell `/s` : feeds nested sous le space actif (nav PC) ; seed Announcements/General ; CRUD sur `/s/…/settings` |
| Space settings (member) | done | `/s/[slug]/settings` (`community.manage`) : name/desc + offer rules + add/edit/archive feeds |
| Posts feed V1 | done | `community_posts` ; composer + liste ; soft delete auteur **ou** staff ; cursor “Load older” |
| Post likes + comments | done | Like toggle ; comments flat paginés par post ; soft delete auteur/staff |
| Caps `community.*` | done | manage / moderate / view_stats + matrix Settings |
| Directory org (admin) | done | Dashboard Community → Members ; RPC `org_access_directory_page` ; cap `community.manage` |
| Directory space (peers) | done | `/s/…/members` cards + search + pagination ; Message → DM (`/messages?c=`) |
| Profile avatar (Bunny) | done | Upload signup (si session) + `/profile` + dashboard account → `profiles.avatar_url` |
| DM peer-to-peer | done | `/messages` 1:1 ; Realtime INSERT ; open depuis Member card |
| Community threads / salon | todo | Après shell + feed |
| Admin manage (posts, modération) | partial | CRUD spaces OK ; delete post staff UI OK |
| Stats suivi formations (admin space) | todo | Progress cours, sessions coaching, activité |
| Coaching membre (chat + séances) | done | Detail : chat DM embarqué + create/edit session client/coach |

## Qualité / ops (backlog historique)

| Feature | Status | Notes |
|---------|--------|-------|
| Bloquer delete produit/offre/content si déjà utilisé | todo / revisit | `todo.txt` ligne 1 — vérifier couverture réelle |
| Inactiver `offer_variants` | todo | `todo.txt` |
| Durcir règles métier archive/delete | revisit | partiellement fait côté products/offers |

## Backlog — BU Owner settlement (décidé 2026-10-10)

Cible produit figée dans `docs/04`. Projet pas live : mock data wipeable.

| Item | Status | Notes |
|------|--------|--------|
| Schema `bu_owner_settlements` | done | RLS view_all/view_own + mark_paid |
| Config **par BU** | done | `%`, `settlement_basis`, `payout_delay_months` ; Settings Business units |
| Job settlement | done | `settle_bu_owner_month` + cron `settle-bu-owner-previous-month` (1er du mois 03:40 UTC) |
| Payouts UX | done | Nav **Payouts** ; tabs Team / BU Owners ; expand calcul settlement |
| Analytics org + BU Owner | done | RPC lit settlements ; UI settlement/team |
| Retirer Stripe auto + Activate Head | done | Wipe legacy ; Activate team-only |
| Seed / wipe mock | done | Offers org1 liées BU ; backfill fév–sept 2026 |
| Slot plan `head` Settings Commissions | done | UI retirée ; JSON legacy conservé |
| Cron mensuel auto | done | pg_cron `settle-bu-owner-previous-month` ; mois précédent ; script `scripts/settle-bu-owner-cron.sql` |

## Vision reprise (vide jusqu’à discussion)

| Feature / idée | Status | Notes |
|----------------|--------|-------|
| _(à remplir après alignement vision)_ | revisit | Ne pas coder de gros pivots avant `04-decisions.md` |
