# Decisions log (ADR léger)

Format : date · décision · pourquoi · conséquences.

---

### 2026-10-10 — Analytics P&L vs Cash + commission forecast

- **Toggle P&L | Cash** sur le bloc marge (default **P&L**).
- **P&L** : coms = toutes lignes non `canceled` rattachées aux ventes `sold_at` ∈ période (marge économique de la vente).
- **Cash** : coms = `status=paid` et `paid_at` ∈ période. CA reste sur `sold_at` (encaissement enregistré).
- **Chart commissions** : timeline **miroir** selon le preset. Séries **Paid** (`paid_at`) + **Due** (`pending` / vraie `due_at`, y compris overdue dans le passé). Trait **Today** = début de la fenêtre à venir. 7d/30d/custom = même durée après `to` ; Month = mois suivant ; Year = +3 mois. Pas de libellé “Forecast”.
- **Hors scope** : charges hors coms ; KPI Overdue séparé.

### 2026-10-09 — Analytics Sales/CRM (V1)

- **Page** : `/dashboard/analytics` (Sales/CRM). Marketing (share links / ambassadors) = **page séparée plus tard**.
- **Accès** : cap **`sales.view`** (réutilise l’existant). Admin/org + **BU owner** (scope BU). Sales / staff / coach / ambassador **ne voient pas** la page.
- **Données** : 1 RPC SECURITY INVOKER (`crm_sales_analytics` ou nom proche) · période + `business_unit_id` nullable · pas d’agrégat client-side.
- **CA période** : filtre sur **`organization_sales.sold_at`** (date métier). `created_at` = audit insert. Manuel : date choisie à l’enregistrement (Record sale / enrollment). Stripe : `sold_at = now()` à l’insert webhook.
- **€ rapportés** = **CA du deal** (`organization_sales.price`). **Commissions = coût** (PnL light = CA − coms acquisition − coms delivery).
- **Owner vs pay roles** : argent toujours via attributions seulement (Owner ≠ ligne com). **Analytics members** : Owner **et** Closer/Setter ont les **mêmes colonnes** : leads suivis / touchés, converted, taux, **CA rapporté**. (Owner = leads `owner_id` ; Closer/Setter = attributions + CA des deals liés.)
- **V1 UI** : période + BU · KPIs (leads, converted, conv %, CA, coms, marge) · courbe CA · table members (Owner + pay roles) · table **packs** (best sellers, CA, qty, prix moyen) · table BU si ≥1 BU · funnel statuses (nice).
- **Hors V1** : Marketing analytics, charges hors coms, comparo N vs N-1, drill-down listes.

### 2026-10-09 — `organization_sales.sold_at`

- **Décision** : colonne **`sold_at`** (timestamptz, NOT NULL, default now). UI date sur création manuelle de sale (CRM Record sale create/sale_only/link-create + Add enrollment).
- **Pourquoi** : analytics CA par période + backdate ventes manuelles. Stripe inchangé (sold_at à l’insert = now).
- **Conséquence** : `v_organization_sales` expose `sold_at` ; expires_at enrollment manuel ancré sur `sold_at` si durée limitée.

### 2026-10-09 — Org role `member` → `staff`

- **Décision** : rôle org/invite `member` renommé **`staff`** (DB + UI). Même caps qu’avant (clients view/enroll, etc.).
- **Pourquoi** : “Member” trop flou ; Staff = ops sans rôle sales/coach/ambassador.
- **Conséquence** : check constraints + seed permissions + types TS. Pas de migration de valeur partielle : update `organization_members` / `organization_role_permissions`.

### 2026-10-09 — Two commission pools (acquisition ≠ coach residual)

- **Décision** : residual Head / BU owner = **après coms acquisition seulement** (Sales, Ambassador `of_base`). **Coach delivery n’entre pas** dans ce residual.
- **Pourquoi** : Activate CRM et Assign coach sont des triggers séparés ; le coach n’est souvent pas connu à l’Activate.
- **Conséquence** : com coach = coût delivery pris sur la **marge org** après coup. Pas de recalc Head à l’assign. Pas d’estimation coach à l’Activate. UI Base Head : “Pack minus Sales & Ambassadors (excl. Coach)”.
- **Hors scope V1** : Head “après coach” (recalc pending à l’assign) = itération future si besoin métier réel.

### 2026-10-09 — Change / remove coach (pre-session lock)

- **Décision** : tant qu’il n’y a **aucune** `coaching_sessions` sur le pack **et** aucune com delivery **paid**, on peut **Change** (modal preview) ou **Remove** coach.
- **Remove** : DELETE assignment + DELETE coms delivery `pending`. **Change** : upsert + replace pending (comme assign).
- **Lock** après 1ère session ou 1er paid — pas de crédit manuel v1.
- **RLS** : `coaching.assign` peut INSERT/DELETE coms `pool=delivery` (pending pour delete).

### 2026-10-09 — Commission list client label = enrollment_in_scope

- **Décision** : affichage coms = **lead d’abord**, sinon client enrollment (JOIN). Pas de colonnes dénormalisées ni helper DEFINER dédié.
- **RLS** : `enrollment_in_scope` accepte aussi `commissions.view_all` (même scope org/bu) et `commissions.view_own` (enrollments liés à mes coms).
- **Pourquoi** : `v_commissions` security_invoker ; sans ça le JOIN enrollment est vide pour qui a coms sans `clients.view`.

### 2026-10-08 — Commissions page (no panel, drop validated, member summary)

- **Décision** : page commissions = table + **toggle résumé par member** ; **pas de side panel**. Statuts ligne = `pending` | `paid` | `canceled` (**drop `validated`**). Unpay `paid→pending`. Audit paiement = `paid_at`/`paid_by` (déjà en DB). PDF facture de paiement = **plus tard**.
- **Résumé member** : RPC `commissions_summary_by_member(...)` **SECURITY INVOKER** (même esprit que `crm_leads_page`) — pas une vue seule ni agrégat client.
- **Pourquoi** : vue SQL = filtres/RLS/pay-all IDs pénibles ; client-side = faux dès que paginé ; RPC renvoie agrégats + ids pending pour « Pay all ».
- **Conséquence** : enum/check status à migrer ; UI couleurs pending/paid/overdue ; mark paid / unpay gardent `paid_by`.

### 2026-10-08 — Lead Owner ≠ pay roles

- **Décision** : `leads.owner_id` (ex-`assigned_sales_id`) = **qui suit le lead** (ops). Pas de commission liée. Les € passent uniquement par `lead_attributions` (closer / setter / ambassador / head).
- **Lead Owners UI** : BU (`leads.business_unit_id`, nullable) + owner éditables ensemble (admin / BU owner via caps) **tant que les commissions ne sont pas activées**. Form ≠ BU (BU vient surtout du share link).
- **Assign owner** : action dédiée ; envoie un mail (détail lead + réponses form si dispo). Unassign = pas de mail. **Pas** d’auto-création closer.
- **Pourquoi** : ownership ops et splits $ sont des jobs différents ; auto-closer mélangerait les deux.
- **Conséquence** : UI « Owner » séparée de « Team & pay » ; cap `crm.assign_sales` garde la clé (assigne l’owner).

## Baseline figées (pré-pause — héritées)

### 2026-Q1 (approx) — Vertical coaching SaaS
- **Décision** : CRM + vente + delivery pour coachs/orgs, pas LMS seul.
- **Pourquoi** : besoin unifié catalogue, clients, paiements, portail.
- **Conséquence** : 3 surfaces (dashboard / org public / coached).

### 2026-Q1 — Stack Next + Supabase + Stripe Connect
- **Décision** : App Router, React Query, services `lib/services`, RLS.
- **Pourquoi** : auth/DB/storage unifiés + Connect pour multi-vendeurs.
- **Conséquence** : pas de Stripe “compte plateforme seul” pour les coachs.

### 2026-Q1 — Offres non supprimables
- **Décision** : archiver (Stripe-aware) plutôt que delete.
- **Pourquoi** : historique paiements / enrollments.
- **Conséquence** : UI et API doivent passer par archive.

### 2026-Q1 — Produits liés = contraintes delete/archive
- **Décision** : delete draft uniquement si non lié ; archive bloquée si sur offre.
- **Pourquoi** : intégrité catalogue / offres actives.

---

## Reprise 2026-07 — en cours

### 2026-07-15 — Mémoire agent structurée
- **Décision** : `docs/` + `AGENTS.md` + rule `project-memory.mdc` comme mémoire vivante.
- **Pourquoi** : reprise après pause + discussions vision multi-sessions.
- **Conséquence** : MAJ docs à chaque décision ; `APP_OVERVIEW.md` reste référence routes longue.

### 2026-07-19 — Stripe deferred until sell/publish
- **Décision** : Stripe Connect n’est plus un hard-block pour products / content / offers draft. Obligatoire seulement pour publish offer (`create-price`), génération de prix variants, et checkout live.
- **Pourquoi** : réduire le churn onboarding (KYC trop tôt).
- **Conséquence** : message UX “Build your offer first. Connect Stripe when you're ready to sell.” sur offer draft ; guards `requireStripe` retirés des pages catalogue.

### 2026-07-19 — Coaching v1 = packs + assign (org-first)
- **Décision** : Garder type produit `course` | `coaching`. Coaching ops v1 = **packs vendus + assignation coach↔étudiant** (`enrollment_products` + `coaching_assignments`). Garder KPI unassigned + page `/dashboard/coaching`.
- **Pourquoi** : 1er client = org multi-coach qui assigne puis paiera les coachs selon volume. Couper l’assignation casserait ce besoin.
- **Hors scope v1** : booking/calendrier/dispos type Calendly ; payouts coach automatiques.
- **Config produit coaching** : `delivery_mode` (delivery). Volume séances + durée d’accès = **sur l’offre** (voir 2026-07-23).
- **Séances** = tracking optionnel (preuve / futur payout), secondaire vs assignation.
- **Garder** `enrollment_products` (snapshot multi-produits par achat) — pas de complexité inutile.

### 2026-07-21 — RLS: orgs related-only + offers members + lesson progress
- **Décision** : `organizations` SELECT limité à owner / membre actif / enrolled (plus de `USING true` global). Offers (+ products links/variants) gérables par **tout membre org actif** (aligné products). `course_lesson_progress` : policies own-row.
- **Pourquoi** : views coached continuent de joindre orgs sans exposer toutes les orgs + `stripe_account_id` ; catalogue cohérent en attendant matrix rôles.
- **Roadmap** : permissions catalogue **par rôle** (admin définit qui crée/édite products & offers) — UI + RLS plus fines.

### 2026-07-21 — Storefront branding (Stan/Gumroad style), not mini-site
- **Décision** : La page publique org = **store link** minimal (identité + liste d’offers + buy). Pas un page builder / landing multi-sections.
- **Canaux** : vente possible hors CoachStack via **buy links** ; **delivery** (vidéos / packs / portail coached) reste chez nous.
- **Branding v1 keep** : logo, nom (org), bio courte, 1 couleur primaire, liste offers actives, CTA buy.
- **Branding cut / freeze** : hero image, secondary color, credentials, stats, testimonials, FAQ, about long, footer CTA, featured complexity — ne plus pousser dans l’UI ; données legacy OK en lecture si présentes.
- **Pourquoi** : ICP multi-persona (pas de site vs site existant) ; setup rapide > vitrine premium.

### 2026-07-21 — External sales = CoachStack interstitial → Stripe Checkout Session
- **Décision** : Pour coachs avec site externe, le lien de vente n’est **pas** un Payment Link Stripe brut. C’est un **lien CoachStack court** qui ouvre une **Checkout Session** (même moteur metadata / variants / installments qu’aujourd’hui).
- **UX** : écran d’attente court (EN) — “{Org} partners with CoachStack…” + auto-redirect ~2.5s + CTA “Continue to checkout” (pas de formulaire email/nom ; Stripe collecte).
- **Return URLs** :
  - **success** → toujours CoachStack `/order-success` → signup coached (même email) — **jamais** le site du coach (lier paiement → compte → delivery).
  - **cancel** → même `/org/{slug}/buy/{offerId}` (retry) — pas d’URL externe arbitraire (open redirect).
- **Store / Buy** : même flow interstitial.
- **Offer key features** : non nécessaires.
- **Pourquoi** : friction proche de “site → Stripe”, sans perdre metadata / variants / installments.

### 2026-07-23 — CRM IA : hub Forms vs pipeline

- **Hub** `/dashboard/crm/forms` : Forms | Fields | Statuses | Share links (sous-nav).
- **Business units** : Settings (`?section=business-units`), pas Forms. Pipeline CRM peut raccourcir vers Settings.
- Redirects : `/dashboard/crm/settings` → fields ; `/dashboard/crm/ambassador` → share links.
- Sidebar : entrée **Forms** séparée de **CRM**.
- **Pourquoi** : construire l’inbound vs qualifier les leads — moins d’éclatement settings/ambassador.

### 2026-07-23 — CRM forms / share links / BU (chantier)

- **Qui partage** : tout membre de l’org (pas seulement rôle ambassador). Lien = `member_id` + **label canal** libre (“partage insta”, “tiktok…”) pour comparer les canaux.
- **Doublon email** : on **crée quand même** le lead ; **pas de colonne dédiée** — ligne CRM en rouge clair + badge “déjà connu”.
- **Post-submit** : configurable par form (message de succès, redirect URL, etc.).
  - ~~Redirect URL uniquement pour `form_type = default`~~ → **supersédé 2026-10-08** (plus de `form_type` ; message + redirect cumulables).
  - Si redirect : écran merci + lien affiché + auto-redirect ~3.5s (pas de jump immédiat).
- **Clics** : compter au GET du form public (par lien).
- **Anti-spam** : honeypot + rate limit sur POST public (phase chantier).
- **Email confirmation prospect** : non pour l’instant.
- **Prefill / champs cachés** : **gardés** — valeurs injectées via le lien (et/ou query allowlistée), non affichées si `hidden`, stockées en `lead_field_values` (complément aux Business Units, pas un substitut).
- **BU / splits** : **ne pas** fonder les commissions futures sur des règles génériques “si champ CRM = X”. → introduire une entité légère **Business Unit** (first-class) avant la feature paiements/splits ; le champ CRM peut servir de bridge temporaire pour le filtrage, mais l’argent s’attachera à `business_unit_id` (ou équivalent) sur le lead/lien.
- **Colonne BU dans le CRM** : affichée **seulement** si l’org a ≥1 business unit active (évite de polluer les coaches solo).
- **Pourquoi** : attribution personne + canal + contexte BU sans casser le CRM flexible ; splits $ exigent une identité stable, pas des options de select renommables.

### 2026-07-23 — Rachat = nouveau contrat

- **Décision** : chaque checkout payé crée un **nouvel** `enrollment` (courses et coaching).
- **Expire-then-insert** : expire d’abord les `active`/`paused` du même offer + buyer, **puis** INSERT (manuel + Stripe). Évite le reject si l’ancien contrat a encore 1–2 jours.
- Unique `(offer_id, user_id)` **seulement** si `status IN ('active','paused')` : historique `expired` OK.
- Idempotence : `enrollments.stripe_checkout_session_id` unique (retries webhook).
- Effet : nouveau `enrollment_product_id` → progress / séances / assign coach repartent à zéro ; l’ancien reste en historique.
- **Pourquoi** : un paiement = un contrat de delivery clair ; pas de chevauchement d’accès actifs.
- **Job** : `expire_due_enrollments()` (cron quotidien) passe en `expired` si `expires_at < now()`. Abos lifetime = `expires_at` null (inchangés ; statut via webhooks).

### 2026-07-23 — Offer composition + commercial terms on offer
- **Composition** : éditable si **0 enrollment** ; si déjà vendue → créer une nouvelle offre + **archiver** l’ancienne (pas de mutation rétroactive).
- **Accès** : `offers.access_duration_months` (`NULL` = lifetime, `N` = mois depuis l’achat). Plus de durée commerciale sur `product_coaching.period_months`.
- **Séances coaching** : `offers.sessions_count` (total inclus dans le SKU). Plus de `sessions_count` commercial sur le produit ; produit coaching garde surtout `delivery_mode`.
- **Checkout** : refuser si aucun produit lié / actif.
- **Accès portail** : `v_coached_products` filtre aussi `expires_at IS NULL OR expires_at > now()`.
- **Pourquoi** : offre = promesse commerciale (prix, durée, volume séances) ; produit = delivery.

### 2026-07-23 — Coach ↔ Coached access hardening (prioritized)
- **#1 Guards** : UX client OK, mais **edge** doit exiger une session sur `/dashboard/*` et `/coached/*` (hors login/signup/landing). RLS reste la vérité data.
- **#2 `v_coached_products`** : passer en `security_invoker` + **REVOKE** `SELECT` pour `anon` (plus de bypass RLS via vue owner).
- **#3 / #9 Rôles coaching ops** : **plus tard** (matrix owner/admin/coach/sales).
- **#4 Routes coached** : **done** — URLs `/coached/.../courses|coaching/[enrollment_product_id]`.
- **#5 Guest sans compte** : déjà indiqué côté coaching (“Waiting for client to sign up”) — garder ; améliorer link login si besoin.
- **#6 Dual rôle** : **done** — CTAs soft dashboard (student area vs create org) + lien “Open coach workspace” sur profil coached.
- **#7 Vocabulaire portail** : **done** — Programs ; coach = personne assignée ; nav/listes = Organizations.
- **#8 Empty states / dead ends** : **done** — actionnables ; Discover retiré tant que pas de catalog.
- **#10 Design Card coached** : **done** — page coaching pack hors shadcn `Card` (bordures plates).
- **Pourquoi** : split 3 surfaces conservé ; durcir sécu + clarté avant scale multi-coach.

### 2026-10-09 — Equal installments + delayMonths (start offset)

- `delayMonths` = mois jusqu’à la **première** échéance pour **tous** les schedules (One payment et Equal installments).
- Equal : due_at = anchor + delayMonths, puis +1 mois par part. UI = 2 options (One payment | Equal installments) + stepper mois.
- Legacy `equal_deferred` (ex-+1 hardcodé) : normalisé au read → `equal_front_loaded` + `delayMonths: 1` si delay était 0.

### 2026-10-07 — Commission calc modes + schedules (org-global)

Complète la spec 2026-07-27. Vocab client « Mentor » = notre **coach** (delivery), pas un type d’attribution CRM.

#### Slots acquisition (Activate CRM)
| Slot | Source | Calcul défaut | Échéancier défaut |
|------|--------|---------------|-------------------|
| sales | attributions closer / setter | `of_base` = HT × % | **1× immédiat** |
| ambassador | attribution ambassador | `of_base` | **1× immédiat** |
| head | **BU owner** auto (`business_unit` attribution) | **`of_residual`** = (HT − Σ of_base) × % | **1× immédiat** |

- Head = BU owner (pas un rôle d’invite séparé).
- `of_residual` = défaut Head ; **Settings → Commissions** peut basculer Head en `of_base` + schedules par slot.
- Plan stocké : `organizations.commission_plan` (jsonb) ; null = défauts code (1× immédiat).
- Ordre calcul : toutes lignes `of_base` → puis `of_residual`.
- Marge org = HT − Σ commissions (affichage, **pas** de ligne commission owner/associés en V1).
- `commissions.due_at` pour l’échéancier.

#### Slot delivery (hors Activate)
- **Coach** : pool `delivery`, trigger = assign (`coaching_assignments`) après enrollment.
- **UI** : bouton Assign coach → modal (SearchSelect coach + preview com + override % ou fixe € pour **ce pack**). Prefill = defaults member coach.
- Calcul `of_base` sur HT de la **sale** (`organization_sales.price`) × %/fixe (override modal ou `default_commission_*_coach`) ; échéance via plan org (défaut 1× immédiat).
- **Pas de fallback** sur `offers.price` : sans sale (ou prix ≤ 0) → assign OK, **aucune** commission ; warning dans le modal.
- Ligne commission : `beneficiary_member_id` = coach ; `attribution_id` null ; `lead_id` si lead lié à l’enrollment ; `organization_sale_id` requis.
- Re-assign : cancel pending delivery du même enrollment, recrée.
- Solo : pas de commission coach (inchangé).

### 2026-07-27 — Commissions / splits (spec figée)

Feature de suivi des commissions (acquisition + delivery) sur le **prix brut du pack**. Pas de plafond plateforme : le coach fixe ses %.

#### Trigger & cycle
- Lead `converted` → bouton CRM **Activer commissions** / **Annuler commissions** (validation admin/org).
- Statuts ligne : **`pending` ↔ `paid`**. **`validated` retiré**. **Overdue = dérivé** (`pending` + `due_at` < now) — pas de statut DB ni cron (évite drift / jobs).
- Page commissions : **uniquement** mark paid / unpay (`paid → pending`). Pas d’action “cancel” ici.
- **Annuler commissions** (CRM) : **DELETE** des lignes `pending` du lead + unlock attributions. Les `paid` bloquent l’annulation. Réactivation = nouvelles lignes. (Plus de soft-status `canceled` en flux.)
- Marquage **paid** = `commissions.mark_paid` ; audit = `paid_at` + `paid_by`.
- Refund Stripe : **pas** d’auto-void ; l’org annule manuellement (CRM ou page commissions).
- Soft-lock attributions : après activation, attributions **verrouillées** (trigger DB). Pour changer sales/ambassadeur : **Annuler commissions** → corriger → **Réactiver**.
- **Preview obligatoire** avant Activate : dialog avec lignes (slot, membre, %), échéances `due_at`, total commissions + marge org.
- Page commissions UX : **pas de side panel** ; table (clic ligne = select) + **vue résumé par member** (pay all) ; pending jaune / paid vert / due overdue rouge ; filtre Overdue plus tard ok.
- **PDF facture de paiement** : plus tard (après event log / export).

#### Base de calcul
- % (ou fixe) du **prix pack brut** pour slots `of_base` ; Head peut être `of_residual` (voir 2026-10-07).
- Installments commissions = **étalement du même % total** (ex. 10 % sur 3 mois → ~3,33 % × 3), pas un 10 % × 3.

#### Deux sources de vente
- **On-platform** : lier lead ↔ enrollment (match **email** si possible ; sinon choix manuel pack/enrollment). Liaison auto **corrigeable** si mauvaise.
- **Off-platform** : plus de table `manual_sales` (drop 2026-10-07). Vente économique = `organization_sales` ; Activate CRM peut encore créer des coms sur `lead_id` sans sale (gap à fermer — voir « CRM vs ventes »).

#### Pools (même pot = brut pack)
1. **Acquisition** : ambassador / setter / closer + **BU** (même base %).
2. **Delivery** : coach assigné (plus tard / 2e temps produit, même pot).
- Pas de plafond système.

#### Defaults & override
- % **par personne** défini à l’**invitation** team member (éditable ensuite).
- % **default par BU**.
- Override possible sur attribution lead (déjà partiel en UI) et sur règles offer.

#### Coach / solo
- Commission coach déclenchée à l’**assign** (`coaching_assignments`).
- Solo : auto-assign + **pas de commission coach**.
- **1 coach** par pack/lead pour l’instant.

#### Échéancier commissions
- Admin définit des règles **globales** + défauts **par offer** (appliqués auto) ; override possible **par offer** (et preview à l’activation deal).

#### UI / droits
- Page suivi commissions (dues / payées / par pack-lead).
- v1 = **suivi dettes + marquage payé + export** (pas de facture fiscale PDF).
- DB **préparée** pour factures PDF plus tard (numérotation / docs).
- Visibilité : member → **ses** commissions ; BU owner → commissions de **sa BU** + peut marquer payé ; admin/owner → **tout** + payer.

#### Conséquences schéma (à implémenter)
- Defaults commission **par type de rôle** sur `organization_members` (`sales` / `ambassador` / `coach`) + sur `business_units` (+ `owner_member_id` BU pour droits). Un membre peut être sales et ambassador en même temps → 2 % distincts.
- ~~`manual_sales`~~ droppé ; assouplir lien commission ↔ enrollment / sale unifiée.
- Attribution types / pool delivery (`coach`) ; schedule fields (installments count, start rule).
- Tables futures factures (stubs) sans UI fiscale v1.

### 2026-10-01 — Manual enrollment + sale (`source`)
- **Décision** : un coach peut créer un enrollment + `organization_sales` hors Stripe (`source=manual`, `billing_type=one_time` sur la sale). Accès via `expires_at` depuis `offers.access_duration_months` (lifetime si null).
- **Pourquoi** : ventes cash / off-platform avec delivery + assign, sans Customer Portal.
- **UI** : `/dashboard/clients` → Add enrollment.
- **Plus tard** : gérer abonnements manuels + lier une txn Stripe si possible ; job qui passe les enrollments `expires_at` dépassée en `status=expired` (vues filtrent déjà la date).

### 2026-10-07 — Record sale + page Sales (figé)

**Décision** : une vente = `organization_sales`. Enrollment = delivery CoachStack **optionnel**. CRM = pipeline + attributions. Commissions = argent → rattachées à la **sale**, pas à l’enrollment.

**Rattachement commissions**
- FK principale : `commissions.organization_sale_id` → `organization_sales`.
- `enrollment_id` sur commission = dénormalisé / optionnel (utile delivery + navigation), **pas** la source de vérité argent.
- Acquisition Activate bloqué sans sale liée au lead.
- Delivery coach : toujours via assign ; **exige** une sale sur l’enrollment (sinon 0 com ; plus de fallback offer).

**Record sale — 3 modes**
1. **Create enrollment + sale** — formation chez nous.
2. **Link existing** enrollment (Stripe / Clients) → rattache aussi sa sale.
3. **Sale only** — cash / formation hors CoachStack : `organization_sales` avec `enrollment_id` null ; pas de client delivery / pas de com coach.

**Flux**
1. Lead Converted → Record sale (un des 3 modes).
2. Attributions OK → Activate (preview) — exige sale liée.
3. Page Sales : `organization_sales` + enrollment (si présent) + coms.

**Pourquoi sale_id > enrollment_id** : enrollment = accès/produit ; sale = encaissement. Formations externes = sale sans enrollment ; enrollments sans vente (essais) ne doivent pas inventer des coms.

**État / dette**
- Auto-link email lead↔sale/enrollment = nice-to-have.

### 2026-10-07 — Stripe → `organization_sales` garanti (couches 1+2)

**Décision** : tout paiement Stripe Connect aboutit à une ligne `organization_sales` (idempotent).

**Écriture**
1. `checkout.session.completed` + `payment_status=paid` + `amount_total>0` → upsert sale sur `stripe_checkout_session_id`.
2. `invoice.paid` → upsert / attach sur `stripe_invoice_id` ; si une sale checkout existe déjà pour le même enrollment/session → **update** `stripe_invoice_id` (pas de double comptage 1er paiement).
3. Renouvellements (`subscription_cycle`) → nouvelle sale (invoice id).

**Résolution invoice** (ordre) : `stripe_subscription_id` → customer+org → metadata `organization_id`.
Metadata Checkout **toujours** copiée sur `subscription_data.metadata` (pas seulement installments).

**Hors scope (couche 3)** : job de réconciliation Stripe ↔ sales — plus tard.

**Pourquoi** : enrollment et sale étaient découplés ; `invoice.paid` pouvait ne pas résoudre l’enrollment (race vs checkout, customer seul, filtre `billing_reason`).

### 2026-10-07 — Sales = tréso ; base coms = deal ; `on_deal` | `on_payment`

**Décision**
- `organization_sales` = **encaissements** (`price`). Sur installment (sub + `cancel_at`) : + `base_amount_cents`, `installment_index`, `installment_count`.
- **Pas** de table “contract”. Prix de base = `base_amount_cents` (ou variant → offre → `proposed_amount`).
- Org plan : `acquisitionBasis` = **`on_deal`** (défaut) | **`on_payment`**.
  - `on_deal` : Activate une fois sur le **prix de base** ; sale liée = ancre.
  - `on_payment` : Activate (1er) puis **chaque nouvel encaissement** crée des coms sur le `price` de cette sale.
- Stripe n’a pas de “pack en N fois” hors abo + fin après N cycles — on continue ce pattern.

**Pourquoi** : éviter coms sur 1k au lieu de 3k ; clarifier UI tréso vs base ; choix org sans 2ᵉ entité.

### 2026-10-04 — Org mode Solo vs Team (UX)
- **Décision** : `organizations.mode` = `solo` \| `team`. Orgs existantes → **team**. Nouvelles → **solo**.
- **Solo** : masquer colonnes/attributions CRM acquisition, assign sales, assign coach ; pages Team / Commissions / Business units restent accessibles avec **TeamPlanGate** + CTA Upgrade (stub todo billing).
- **Team** : UX complète actuelle.
- **Pourquoi** : simplifier solopreneurs sans casser l’ICP multi-coach ; monétisation upgrade plus tard.
- **Impl** : flags via `useOrgCapabilities().mode` ; pas de changement RLS.
- **Solo auto-assign coach** : trigger DB `enrollment_products_solo_auto_assign_coach` (pas app-only) — invariant sur tous les chemins d’insert. Commission coach delivery reste « pas en solo » (quand ce pool sera branché).

### 2026-10-04 — Offer → Business unit
- **Décision** : `offers.business_unit_id` nullable (FK `business_units`, same-org trigger). `NULL` = org-wide.
- Enrollments / clients BU scope via `enrollment.offer_id → offers.business_unit_id` (pas de BU sur enrollment — un achat Stripe ne pourrait pas être rattaché proprement sinon).
- **Trade-off accepté** : une offre = une BU ; multi-BU ⇒ dupliquer l’offre.
- UI : create/edit offer → select BU. Default matrix `bu_owner.clients.view` = on.

### 2026-10-04 — Permissions org = capacité × scope (owner-configurable)
- **Décision** : l’owner configure une **matrix par rôle org**. Rôles : `admin` / `sales` / `ambassador` / `coach` / `staff` (`owner` = tout, non éditable). Pas de rôles custom ni overrides par membre en V1. (Historique : `member` → `staff`, 2026-10-09.)
- **Nouveau rôle `coach`** : par défaut **rien** sauf coaching (packs où il est assigné) + capacités **own** (leads attribués, share links à lui, `commissions.view_own`).
- **Deux axes** : (1) capacité matrix (2) scope calculé `org` | `bu` | `own`.
- **BU owner ≠ rôle d’invite** : `business_units.owner_member_id` + colonne matrix configurable `bu_owner` (caps **scope BU only**, cumul avec le rôle org).
- **Résolution scope** : owner/admin → `org` ; sinon BU owner → `bu` ; sinon → `own`.

#### Règles structurelles (defaults produit — au-delà d’une case on/off naïve)
- **CRM view** : tout rôle → ses leads `own` (attribué). BU owner → tous les leads de sa BU. Admin/owner → tous.
- **CRM manage** : tout rôle → **update status** de ses leads `own` seulement (**pas delete**). Admin + BU owner → manage complet dans leur scope (edit/delete/etc.).
- **CRM assign_sales / manage_attributions** : admin ou BU owner (scope BU).
- **sales.view** : admin (org) ou BU owner (sa BU) — pas sales/ambassador/staff/coach par défaut.
- **clients.view / enroll_manual** : admin + **staff** seulement (pas sales).
- **forms.view** : tout le monde.
- **forms.manage** : admin (org) ; BU owner pour les forms de **sa BU** (qu’il gère pour la BU).
- **forms.manage_links** : tout le monde → créer/voir **ses** links (`own`). Admin + BU owner → voir / ajouter / supprimer links dans leur scope (org / BU).
- **Coaching** (`view` / `manage_sessions`) : admin **ou** le member **assigné** sur le pack. `coaching.assign` : admin seulement (solo = auto-assign owner).
- **Owner only (hors matrix)** : `org.billing`, `org.permissions`.

#### Sous-actions = clés réelles de la matrix
Les groupes UI (`CRM`, `Forms`…) agrègent ces clés. Scope `org|bu|own` s’applique **en plus** (sauf coaching assigné = scope pack).

**Team**
- `team.invite` — inviter
- `team.manage_roles` — changer rôle
- `team.revoke` — révoquer / cancel invite

**Catalogue**
- `catalog.manage` — create/edit products & offers

**Clients / sales**
- `clients.view` — liste clients / enrollments
- `clients.enroll_manual` — add enrollment manuel
- `sales.view` — voir ventes / revenue (scope org ou BU)

**CRM leads**
- `crm.leads.view_own` — voir ses leads (attribué / créé / share link)
- `crm.leads.view` — voir tous les leads dans le scope (`org` / `bu`)
- `crm.leads.update_status` — changer stage/statut seulement
- `crm.leads.edit` — éditer champs / notes / détails (pas delete)
- `crm.leads.delete` — supprimer un lead
- `crm.assign_sales` — assigner l’**owner** du lead (pas les rôles commission)
- `crm.manage_attributions` — attributions / %
- `crm.activate_commissions` — activer / annuler commissions
- `crm.view_lead_commissions` — voir bloc commissions + attributions dans le détail lead

**Forms**
- `forms.view` — voir forms / fields (catalogue forms de l’org ou BU selon scope)
- `forms.manage` — create/edit/archive forms (+ fields) dans le scope
- `forms.links.view_own` — voir ses share links
- `forms.links.create_own` — créer ses share links
- `forms.links.delete_own` — supprimer ses share links
- `forms.links.manage_others` — voir / créer / supprimer links **des autres** dans le scope (org ou BU)

**Coaching** (hors scope org/bu/own classique : **admin = tous packs** ; sinon **packs où `coaching_assignments` = moi**)
- `coaching.view` — voir packs
- `coaching.assign` — assigner / réassigner coach
- `coaching.sessions.create` — créer une séance
- `coaching.sessions.complete` — marquer séance done / undo

**Commissions / BU**
- `commissions.view_own`
- `commissions.view_all` (ou scope BU si BU owner)
- `commissions.mark_paid`
- `bu.manage`

**Org**
- `org.settings` — branding / général  
- Hors matrix owner-only : `org.billing`, `org.permissions`

#### Defaults matrix (✓ = on au seed)

| Clé | admin | sales | ambassador | coach | staff |
|---|---|---|---|---|---|
| `team.invite` | ✓ | — | — | — | — |
| `team.manage_roles` | ✓ | — | — | — | — |
| `team.revoke` | ✓ | — | — | — | — |
| `catalog.manage` | ✓ | — | — | — | — |
| `clients.view` | ✓ | — | — | — | ✓ |
| `clients.enroll_manual` | ✓ | — | — | — | ✓ |
| `sales.view` | ✓ | — | — | — | — |
| `crm.leads.view_own` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `crm.leads.view` | ✓ | — | — | — | — |
| `crm.leads.update_status` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `crm.leads.edit` | ✓ | — | — | — | — |
| `crm.leads.delete` | ✓ | — | — | — | — |
| `crm.assign_sales` | ✓ | — | — | — | — |
| `crm.manage_attributions` | ✓ | — | — | — | — |
| `crm.activate_commissions` | ✓ | — | — | — | — |
| `crm.view_lead_commissions` | ✓ | — | — | — | — |
| `forms.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `forms.manage` | ✓ | — | — | — | — |
| `forms.links.view_own` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `forms.links.create_own` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `forms.links.delete_own` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `forms.links.manage_others` | ✓ | — | — | — | — |
| `coaching.view` | ✓ | — | — | ✓ | — |
| `coaching.assign` | ✓ | — | — | — | — |
| `coaching.sessions.create` | ✓ | — | — | ✓ | — |
| `coaching.sessions.complete` | ✓ | — | — | ✓ | — |
| `commissions.view_own` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `commissions.view_all` | ✓ | — | — | — | — |
| `commissions.mark_paid` | ✓ | — | — | — | — |
| `bu.manage` | ✓ | — | — | — | — |
| `org.settings` | ✓ | — | — | — | — |

**BU owner** : colonne matrix `bu_owner` (éditable Settings). Defaults : invite members, catalog, clients view/enroll, sales.view, CRM lead ops (dont `view_lead_commissions` + `manage_attributions`), forms/links, **coaching view/assign/sessions** (packs dont l’offre est sur sa BU), commissions view/mark paid. Scope données = BU via `offers.business_unit_id` (RLS/queries étape 6–7).

- **Enforcement** : UI (matrix fetch + provider rôle) + RLS `has_org_capability` **(step 6)** + scope row filters `org|bu|own` **(step 7)** via `*_in_scope` helpers. Settings = table directe.
- **Hors V1** : rôles custom, overrides individuels, matrix dupliquée “version BU”.

### 2026-10-03 — Domaine final = `coachstack.co`
- **Décision** : domaine produit = **`coachstack.co`**. Espace coached = **`app.coachstack.co`** (DNS/CNAME + Vercel + cookies Auth encore à finaliser en prod).
- **Pourquoi** : tranché par Habib ; plus “à confirmer”.
- **Conséquence** : env prod / Stripe return URLs / docs infra pointent vers ce domaine ; storefront orgs restent `/{slug}` ou sous-domaines org selon setup existant.

### 2026-10-07 — Marketing automation = ESP externe via API (pas DIY deliverability)

- **Décision** : CoachStack reste **source de vérité CRM** (leads, PERSONA, URGENCY, CALL_STATUS, CLIENT_STATUS, attribution). L’envoi marketing (welcome, nurture evergreen, campagnes, segments) passe par un **ESP externe** piloté **via API** depuis CoachStack — pas une UI ESP comme cerveau, et **pas** d’orchestration email marketing DIY sur Resend seul.
- **Pourquoi** :
  - Resend = email **transactionnel** déjà en stack ; insuffisant pour segments dynamiques / nurtures / campagnes / deliverability marketing à l’échelle.
  - DIY “CoachStack envoie tout” implique deliverability lourde : warming IP/domaine, SPF/DKIM/DMARC, réputation, bounces/complaints, suppression lists, envoi **au nom de** l’org (domaine custom par tenant) — coût ops élevé vs valeur produit.
  - ESP gère l’infra d’envoi ; CoachStack orchestre *quand* / *qui* / *quels attributs* / *sortie marketing au booking*.
- **Conséquence** :
  - Choisir un ESP **API-first** (candidats : Brevo, Customer.io, MailerLite — arbitrage prix vs features pause-nurture / exit event).
  - Sync attributs CRM → contacts ESP ; events CoachStack (`call_booked`, `client_status=client`, …) pilotent exit / pause.
  - Resend reste pour transactionnel app (auth, receipts, etc.) sauf décision contraire.
  - Brief EDGE (form → persona → welcome → nurture → campagne hebdo → exit au call booked) = use-case cible de cette archi ; implémentation pas démarrée.

### 2026-10-07 — Outbound CRM events (fondation integrations)

- **Décision** : **mettre en place l’envoi d’events outbound** depuis CoachStack (webhooks / event stream par org). C’est la **fondation** avant (ou en parallèle d’) un connecteur ESP natif.
- **Pourquoi** : permet au client de brancher Zapier, Make, n8n, Brevo, etc. sans attendre un connecteur dédié ; pattern générique multi-org ; le connecteur ESP reste un add-on UX (“tout depuis CoachStack”), pas le seul chemin.
- **Events cibles (v1 à préciser au build)** : au minimum `lead.created`, `lead.updated` (champs / attributs marketing), `call.booked` (ou équivalent CALL_STATUS), `client.converted` / changement `CLIENT_STATUS` — payload stable + secret / signature.
- **Conséquence** : feature à builder (Settings org : URL webhook + secret ; émission fiable côté services CRM). Connecteur Brevo/ESP = phase suivante optionnelle, pas un prérequis pour automatiser.

### 2026-10-08 — CRM list filters via RPC + custom field filters

- **Décision** : liste CRM (`crm_leads_page`) = **RPC + `EXISTS`** (status/origin/members/BU/champs perso). Pas de resolve d’IDs côté app.
- **Champs filtrables** : opt-in `crm_fields.filterable` ; max **4** / org ; types `select` | `multi_select` | `boolean` uniquement.
- **Pourquoi** : pagination/`count` corrects ; multi_select via split CSV côté SQL ; index `(field_def_id, value)`.
- **Conséquence** : `fetchLeadsPage` appelle le RPC ; Fields UI toggle Filter ; FilterRefine dynamique.

### 2026-10-08 — Lead statuses org-level + forms sans `form_type`

- **Décision** : les status CRM sont **par organisation** (catalogue ≤ **10**), avec 3 status **système** toujours présents et **non supprimables** : `new`, `lost`, `converted`.
- **Defaults seed** (création org / migration data test) : uniquement ces 3. Plus de `booked` / `deadline` / `contact_later` / `failed` en catalogue par défaut (`failed` → **`lost`**).
- **Custom** : l’org peut **ajouter** des status (nom + couleur) jusqu’au plafond de 10 (incluant les 3 système). Label max **24** chars ; clé dérivée = label lower + `_` pour espaces. Sur les 3 système : **label + clé figés** ; couleur éditable. Custom : clé figée à la création ; couleur (+ label display) éditables.
- **Delete** : interdit sur système ; interdit sur tout status **encore utilisé** par un lead (ou historique à trancher au build — a minima leads courants).
- **Sémantique** : `converted` reste le gate Record sale / commissions ; `new` = entrée pipeline / défaut DB ; `lost` = perdu.
- **Migration** : pas de couche de transition — pas en prod ; **adapter les lignes test** existantes vers le nouveau modèle.
- **Forms** :
  - **Supprimer `form_type`** (`default` / `webinar` / `freegiveaway`) pour l’instant — réintroductible plus tard si besoin.
  - Chaque form définit le **status d’arrivée** du lead (parmi le catalogue org ; défaut raisonnable = `new`).
  - Post-submit : **`success_message` et `redirect_url` cumulables** (merci + soft-redirect si URL renseignée — plus de blocage selon type).
- **Pourquoi** : pipeline adaptable sans casser conversion/commissions ; forms plus simples.
- **Remplace** (partiel) : règle 2026-07-23 « redirect seulement si `form_type = default` ».
- **Conséquence** : abandon enum global `lead_status_enum` au profit d’un catalogue org (table/FK ou équivalent) ; UI Settings statuses ; badges couleur org ; public form POST pose le status du form.

### À décider (ne pas coder de pivot avant)

- [ ] Garder le positionnement “tous types de coachs” vs recentrer (ex. sport) ?
- [ ] Quelle surface simplifier en priorité pour un MVP relancé ?
- [ ] Ce qui reste “must” vs “coupable” dans le backlog features (hors coaching / commissions déjà tranchés)
- [ ] Ordre de build commissions : acquisition-only d’abord vs acquisition+delivery ensemble ?
- [x] UX vente↔CRM : **Record sale** depuis lead + page Sales — figé 2026-10-07
- [x] Outbound CRM events — **à mettre en place** (fondation) — figé 2026-10-07
- [ ] Quel ESP API-first (Brevo vs Customer.io vs MailerLite / autre) — critère : prix + segments attributs + pause/reprise nurture + webhooks events
