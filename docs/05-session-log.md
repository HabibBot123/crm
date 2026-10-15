# Session log

Entrées courtes, plus récent en haut. Décisions durables → `docs/04` ; schéma → `docs/06`.  
Règle : 1 entrée = 1 thème livré (pas chaque polish UI).

---

## 2026-10-15 — Cron settlement BU (déjà live)

- pg_cron `settle-bu-owner-previous-month` déjà actif (`40 3 1 * *`). Docs 03/06 + script `scripts/settle-bu-owner-cron.sql`.

## 2026-10-15 — Docs : coaching pack + directory Message done

- Coaching pack workspace + Directory space Message marqués done (`docs/03`).

## 2026-10-15 — Account/Security UI partagée

- `AccountProfileCard` + `SecuritySection` (Signed in with ; reset password seulement si provider email).
- `/profile` (member) et `/dashboard/account` partagent la même UI Profile + Security.

## 2026-10-15 — Marketing Campaigns stats enrichies

- Résumé type Brevo (campaigns, recipients, opens/clicks/unsub + rates, bounce, CTO, complaints).
- Table campagne : from/subject/date + delivered/failed/bounce/open/click/CTO/unsub/spam. Pas de Δ% (envoi unique). → `docs/04`.

## 2026-10-15 — Marketing analytics : lens Campaigns

- KPI partagés en haut (Revenue / Leads / Converted / Conv %). Switch Inbound | Campaigns sous les KPI.
- Campaigns : delivery KPI + table campagnes envoyées dans la période. Cap `campaigns.manage`. → `docs/03` / `04`.

## 2026-10-15 — useOrgCoachingInbox (Home + Coaching)

- Hook unique `asClient` + `asCoach` ; rows partagés. Home affiche aussi les packs as coach.

## 2026-10-15 — Member routes /courses/[id] /coaching/[id]

- Retiré `/programs/{slug}/…`. Details sous `/courses/[id]` et `/coaching/[id]` (org = host). Pas de redirect legacy.

## 2026-10-15 — Course player UI align shell

- Player cours : plus de full-bleed/FAB ; PageHeader + progress compact ; sidebar nested type Spaces ; Contents header mobile ; LessonNav densifié.

## 2026-10-15 — Password reset via auth/callback

- `resetPasswordForEmail` redirectTo → `/auth/callback?next=/login/reset-password` (profile, account, forgot). PKCE code exchange avant le formulaire.

## 2026-10-15 — Profile page UI align + inline name

- `/profile` : SectionCard / PageHeader ; crayon inline full name ; retire Edit dialog, coach workspace, email/push toggles.

## 2026-10-15 — Space settings page + feeds in left nav

- Shell `/s` PC : feeds nested sous le space actif dans la nav gauche (pas tabs au-dessus des posts).
- `/s/[slug]/settings` : space + rules + CRUD feeds. Edit → page settings.

## 2026-10-15 — Community dashboard tabs + space members UX

- Dashboard Community : tabs Spaces | Members (annuaire org) ; Open/Edit/Archive ; plus Sync/Members sheet.
- Space members app : back, remove icon + confirm dialog. Nav `/members` retirée de l’app membre.

## 2026-10-15 — Feed likes + comments + cursor pagination

- Tables `community_post_likes` / `community_post_comments` + RPC engagement.
- Feed : pages cursor 20 + Load older ; comments expand + load more. → `docs/03` `06`.

## 2026-10-15 — Add space member by email lookup

- Plus de dump clients/team 100. Look up email → propose team/client avec compte ; no_account / not_found explicites.

## 2026-10-15 — Member app: space rules + members manage

- Create/Edit space (app membre) : offer rules + `remove_on_expire`.
- `/s/…/members` : add/remove si `community.manage`. Shared `SpaceOfferRulesFields`.

## 2026-10-15 — Drop legacy `/coached*` routes

- Retiré redirects proxy + dossiers `app/coached`, `coached-login`, `coached-signup`. `/coached-landing` gardé (rewrite hub).

## 2026-10-15 — Offer → space membership rules V1

- Table `community_space_membership_rules` + sync/create/add/remove RPCs + enrollment trigger.
- Empty rules = all living enrollments ; `remove_on_expire` ; manual soft-remove (option A) ; staff via caps.
- Dashboard : create dialog offers ; Members sheet add/remove. → `docs/03` `04` `06`.

## 2026-10-15 — Delivery completed at product level

- `enrollment_products.completed_at` (plus enrollment.status=completed pour delivery). Sync par ligne course/coaching. UI badges via `deliveryStatus()`. → `docs/06`.

## 2026-10-15 — Delivery completed (course + coaching)

- (supersédé) sync enrollment-level. Remplacé par product-level.

## 2026-10-15 — Quota séances → enrollment completed

- Trigger : `completed_at` count ≥ `offers.sessions_count` → `enrollments.status=completed` (revert si undo).
- `v_coached_products` garde `completed` visible (accès historique). Add session bloqué au quota. Edit séance : coach + client. → `docs/06`.

## 2026-10-15 — Sessions edit / note / complete / delete

- `notes` HTML sur `coaching_sessions` ; client UPDATE own pack ; coach DELETE via `sessions.create`.
- UI pack : edit (client+coach), note TipTap + complete (les deux), delete (coach). → `docs/06`.

## 2026-10-15 — Coaching pack tabs Sessions | Chat

- Detail pack : onglets (plus split 2 colonnes). Chat polish partagé. → `docs/04`.

## 2026-10-15 — Coach contact dénorm + bandeau pack

- `coaching_assignments.coach_user_id` / `coach_email` (trigger) : client lit le contact sans SELECT `organization_members`.
- Detail coaching : bandeau interlocuteur (avatar, mail, pack, dates). → `docs/06`.

## 2026-10-15 — Courses / Coaching membre + org member commu

- Nav : Courses + Coaching (plus Programs). Detail pack = séances bilatérales + chat DM embarqué.
- `is_community_org_member` += `organization_members` actifs (pas d’obligation space pour staff). → `docs/03` `04` `06`.

## 2026-10-15 — Delete staff UI + DM V1

- Feed : delete visible si auteur **ou** `is_community_space_staff`.
- DM 1:1 : tables + RPC + `/messages` + Realtime ; Message depuis cards. → `docs/03` `06`.

## 2026-10-15 — Suite community + coaching UX

- Roadmap : rules → stats ; puis coaching membre (chat + séances). → `docs/03` `04`.

## 2026-10-15 — Directories + avatar Bunny

- Avatar Bunny : API `/api/profile/upload-avatar` ; signup + `/profile` + account.
- Space members : cards + search + pagination.
- Org `/members` admin : RPC directory + table ; nav Members si `community.manage`. → `docs/03` `04` `06`.

## 2026-10-15 — Fix soft-delete posts RLS

- Cause : SELECT exigeait `deleted_at is null` → UPDATE soft-delete refusé.
- SELECT : membre voit non-deleted ; auteur/staff voient aussi soft-deleted. → `docs/06`.

## 2026-10-15 — Hub auto-org (localStorage)

- Dernière org en `coachstack-last-coached-org-slug` ; `/home` hub redirect ; `?pick=1` = picker.
- Programs retiré du nav hub ; `/programs` hub → org. → `docs/04`.

## 2026-10-15 — Fix redirect login → localhost

- Cause : `request.url` / `nextUrl` = `localhost` alors que Host = `app.lvh.me`.
- Fix : `requestPublicOrigin` / `requestPublicUrl` dans auth callback + proxy + middleware session. → `docs/04`.

## 2026-10-15 — Edit space + UI `/s`

- Titre space + sous-titre org retirés (nav + header suffisent) ; description seule.
- Edit name/description si `community.manage` (slug inchangé). → `docs/03`.

## 2026-10-15 — Spaces shell type Settings

- `/s` : NavList spaces (Select mobile) + feed pleine largeur ; query `?space=` ; `/s/[slug]` redirect.
- Posts V1 inchangés. → `docs/03`.

## 2026-10-15 — Spaces UI + posts feed V1

- DB `community_posts` + helpers post/staff. → `docs/06`.

## 2026-10-15 — RLS org SELECT pour membres community

- `is_community_org_member(org)` + policy `organizations_select_related` élargie (branding/logo sans enrollment). Script `organizations-select-community-members.sql`. → `docs/06`.

## 2026-10-15 — Org switcher marque (logo + sheet mobile)

- Trigger logo / initiale + nom ; dropdown desktop, bottom sheet mobile ; 1 org = lien brand sans menu.
- Branding (`logo_url`, `primary_color`) dans `fetchCoachedCommunityOrgs`. Header mobile visible. → `docs/03`.

## 2026-10-15 — Auth host-aware : fin `coached-login`

- `/login` + `/signup` selon host (`isMemberAppHost`) ; pages `coached-login` / `coached-signup` supprimées (redirect proxy).
- Cookie org retiré ; local membre = `*.lvh.me` only. → `docs/04`.

## 2026-10-15 — Local `app.lvh.me` validé (session hub↔org)

- Login hub → org sans re-login (`Domain=.lvh.me`). Plain `localhost` = coach.

## 2026-10-15 — Strip `/coached` paths + no org-level members table

- Routes membre : `/home` `/programs` `/s` `/members` `/messages` `/profile` ; redirects legacy `/coached/*`.
- Pas de `community_members` V1 (space members + enrollment suffisent). → `docs/04`.

## 2026-10-15 — Local coached: cookie org (pas subdomain) [supersédé si expérience OK]

- Bug: session `localhost` ≠ `*.app.localhost` → login loop + `/?code=` hors callback.
- Fix alors: rester sur `localhost:3000`, org via cookie. → expérience hosts ci-dessus.

## 2026-10-15 — Hosts app membre + shell Circle

- Store `{slug}.coachstack.co` ; hub `app.*` ; membre `{slug}.app.*`. Proxy + switcher + programs org-scoped.
- Commu = membership (expire ≠ kick) ; `/coached/o/` retiré → `/coached/s/…`. → `docs/04`.

## 2026-10-15 — Community shell V1 (spaces)

- DB : `community_spaces` / `members` / `feeds` + caps `community.*` + RPCs create/sync. Script `community-shell.sql`.
- Dashboard `/dashboard/community` ; coached `/coached/o/[org]/s/[space]` (feed/messages placeholders, programs, members).
- Suite : posts feed, DM Realtime, rules offer→space. → `docs/03` / `04` / `06`.

## 2026-10-15 — Vision Community Circle-like (coached)

- Pivot : org → **N spaces** ; multi-feeds ; peers visibles ; DM all-to-all ; shell first.
- Tech DM V1 = **Supabase Realtime + tables** (pas vendor chat).
- Enter/exit = **rules org-configurable** ; caps **`community.*`** ; seed feeds. → `docs/00` / `03` / `04`.

## 2026-10-15 — Sending domain : tracking open/click par défaut

- Create domaine Resend : `openTracking` / `clickTracking` + subdomain `links`. DNS Tracking dans la table existante. Pas de backfill. → `docs/04`.

## 2026-10-15 — Unsub funnel : query `c` + event recipient

- Lien broadcast : `…/unsubscribe?t={{{contact.cs_unsub_N}}}&c={campaignId}`. Confirm écrit `campaign_email_events` / `unsubscribed_at` sur ce recipient seulement (pas de fallback). → `docs/04`.

## 2026-10-15 — Merge tags Resend : préfixe `contact.`

- Broadcast avait `{{{cs_fn_1|there}}}` / `{{{cs_unsub_1}}}` → fallback / vide. Syntaxe Resend = `{{{contact.<key>|…}}}`. Fix inject + unsub URL. → `docs/04`.

## 2026-10-14 — Sync audience via Inngest + properties org

- Properties Resend `cs_fn_{orgId}` / `cs_ln_{orgId}` (+ `cs_unsub_`). Trigger lead aussi sur first/last name. Webhook Supabase `campaign_contacts` → Inngest. Colonnes `provider_properties_synced_at` / `provider_sync_error`. Quota **par org** = todo avant launch. Checklist prod (repoint Inngest + trigger SQL + Resend/Stripe) dans `docs/01`. Dev = Sync Inngest sur ngrok OK. → `docs/01` / `03` / `04` / `06`.

## 2026-10-14 — Opt-out CoachStack `/unsubscribe`

- Lien campagne = page confirm CoachStack (plus Resend unsub URL). Token HMAC + prop Resend `cs_unsub_{orgId}`. Confirm → opt-out org + topic. → `docs/04`.

## 2026-10-14 — Campaigns : How it works

- Dialog 4 étapes (Audience → Library → Campaign → Delivery) via `?` à côté du titre + empty state. `PageHeader.titleAside`.

## 2026-10-14 — Audience tab : liste contacts

- Vue `v_campaign_audience_contacts` (pas RPC : colonnes V1 fixes). Table First/Last/Email/Origin/Consent/Sync + search/filters/pagination. → `docs/06` / `03`.

## 2026-10-14 — Leads first_name / last_name

- Colonnes + backfill + trigger `full_name`. Inputs CRM + form public. Sync campagne Resend sur first/last. Lectures restent sur `full_name`. → `docs/04` / `06`. Re-sync audience pour pousser les noms Resend.

## 2026-10-14 — Sheet recipient : HTML Resend lazy

- Ouverture sheet → `GET …/recipients/:id/sent-email` → `resend.emails.get(provider_recipient_id)`. Affiche HTML/texte seulement si Resend renvoie un body. Pas de fallback snapshot local.

## 2026-10-14 — Hub Campaigns switcher + rename hook

- `use-marketing-campaigns` → `use-campaigns`. Switcher Campaigns / Templates / Audience en haut (style Analytics) + icônes. Click : edit tant que pas `sent`, sinon delivery view.

## 2026-10-14 — Campaigns hooks → services

- Segments / templates / campaigns CRUD lecture + audience stats via services (plus fetch API). API gardée : send/cancel/test/sync + deletes Resend. Backfill delivery retiré.

## 2026-10-14 — Étape 6 : stats + hub (build)

- Tables `campaign_recipients` / `campaign_email_events` + RPC `campaign_delivery_stats`. Webhook `POST /api/webhooks/resend`. Materialize recipients au send. Hub tabs + détail post-send + sheet events. Configurer `RESEND_WEBHOOK_SECRET` + endpoint Resend (ngrok). → `docs/04` / `06` / `01`.

## 2026-10-14 — Étape 6 : contrat stats (webhooks + tables)

- Stockage interne via webhooks Resend (pas poll UI). `campaign_recipients` (funnel timestamps + last_status) + `campaign_email_events` (audit/sheet). Stats RPC funnel. Hub tabs Campaigns | Templates(+segments) | Audience. → `docs/04` / `06` / `03`.

## 2026-10-13 — Next : stats campagne + UI hub (Étape 6)

- Send réel OK. Prochaine séance : stats globales + par email (Resend), hub résumé → détail contacts → sheet CRM-like, revoir UI page Campaigns. Contrat → `docs/04` Étape 6 / `docs/03`.

## 2026-10-13 — Campaign Recipients : segment + colonnes conditions

- Segment editable aussi sur Recipients (reste sur Details). Preview table : colonnes dérivées des conditions du filtre (status, origin, form fields, offers…). Save en header.

## 2026-10-13 — Campaign pages (body override + recipients)

- Pages `/campaigns/new` + `/campaigns/[id]` (plus de dialog). Body copié du template, éditable. Recipients preview. Test + Send now / Schedule. Colonnes `body_html`/`body_json` sur `campaigns`. → `docs/04` / `06`.

## 2026-10-13 — Templates email : baseline figée

- TipTap maison livré (pas Maily). Font size inline (plus de H1–H3). Subject : insert vars (Braces). Form : 1 card Name/Subject/Body + Preview ; Save bas.
- **Map fichiers + contrats** → `docs/04` Étape 5 « Éditeur template » (pour reprises).

## 2026-10-13 — Campaign Button / BubbleMenu / chips / lists

- Button node + BubbleMenus + chips If empty + toolbar mousedown. Détail → `docs/04`.

## 2026-10-13 — Templates : pages dédiées

- Create/edit : `/dashboard/campaigns/templates/new` + `[templateId]`. Liste sur Campaigns.

## 2026-10-13 — Resend SDK upgrade

- `resend` 6.9.4 → **6.32.1** (plugin = latest, min ≥ 6.14). Cancel / delete scheduled : `broadcasts.remove` (stop + delete). `cancel` = garder un draft Resend ; pas notre cas.

## 2026-10-13 — Étape 5 Campaigns : build V1

- Tables `campaign_email_templates` + `campaigns`. APIs CRUD + send/schedule/cancel/test. UI Templates + Campaigns. Editor `@react-email/editor` + variables. Sync names first/last au Resend. → `docs/04`, `06`.

## 2026-10-13 — Étape 5 Campaigns : contrat V1 figé

- Naming Campaign (pas Broadcast UI). Templates + `@react-email/editor`. Schedule/cancel, from/reply-to, preview, test send, variables Resend, confirm N, garanties send, unsub only (pas footer légal). → `docs/04`.

## 2026-10-13 — Pause session Marketing

- Suite = **Étape 5 Campaigns** (contrat `docs/04`). Sync UI inchangé jusqu’au Send. Fix TS : `NoAccessState` title + drop `visibility` topic Resend.

## 2026-10-13 — Campaigns : sync UI reporté au Broadcast

- Pas d’auto-sync à l’arrivée page. Jargon / bouton Sync à revoir quand Send Broadcast matérialise le sync. → `docs/04`.

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
