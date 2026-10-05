# Decisions log (ADR léger)

Format : date · décision · pourquoi · conséquences.

---

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

- **Hub** `/dashboard/crm/forms` : Forms | Fields | Business units | Share links (sous-nav).
- **Pipeline** `/dashboard/crm` : travail leads ; raccourcis Fields / Business units / Forms hub.
- Redirects : `/dashboard/crm/settings` → fields ; `/dashboard/crm/ambassador` → share links.
- Sidebar : entrée **Forms** séparée de **CRM**.
- **Pourquoi** : construire l’inbound vs qualifier les leads — moins d’éclatement settings/ambassador.

### 2026-07-23 — CRM forms / share links / BU (chantier)

- **Qui partage** : tout membre de l’org (pas seulement rôle ambassador). Lien = `member_id` + **label canal** libre (“partage insta”, “tiktok…”) pour comparer les canaux.
- **Doublon email** : on **crée quand même** le lead ; **pas de colonne dédiée** — ligne CRM en rouge clair + badge “déjà connu”.
- **Post-submit** : configurable par form (message de succès, redirect URL, etc.).
  - Redirect URL **uniquement** pour `form_type = default` (webinar / freegiveaway restent sur le thank-you — accès contenu plus tard).
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
- Après INSERT réussi : expire les autres enrollments `active`/`paused` du même offer + buyer (`user_id` ou `buyer_email`) → `status=expired`, `expires_at=now()` (sauf le nouvel id).
- Idempotence : `enrollments.stripe_checkout_session_id` unique (retries webhook).
- Effet : nouveau `enrollment_product_id` → progress / séances / assign coach repartent à zéro sur le nouveau cycle ; l’ancien reste en historique.
- **Pourquoi** : un paiement = un contrat de delivery clair ; pas de chevauchement d’accès actifs.

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

### 2026-07-27 — Commissions / splits (spec figée)

Feature de suivi des commissions (acquisition + delivery) sur le **prix brut du pack**. Pas de plafond plateforme : le coach fixe ses %.

#### Trigger & cycle
- Lead `converted` → bouton CRM **Activer commissions** / **Annuler commissions** (validation admin/org).
- Statuts ligne : `pending` → `validated` → `paid` (marquage **paid** = admin/owner, et **BU owner** pour sa BU).
- Refund Stripe : **pas** d’auto-void ; l’org annule manuellement (CRM ou page commissions).
- Soft-lock attributions : après activation, attributions **verrouillées** (trigger DB). Pour changer sales/ambassadeur : **Annuler commissions** → corriger → **Réactiver**.

#### Base de calcul
- % (ou fixe) du **prix pack brut**.
- Installments commissions = **étalement du même % total** (ex. 10 % sur 3 mois → ~3,33 % × 3), pas un 10 % × 3.

#### Deux sources de vente
- **On-platform** : lier lead ↔ enrollment (match **email** si possible ; sinon choix manuel pack/enrollment). Liaison auto **corrigeable** si mauvaise.
- **Off-platform** : entité **`manual_sale`** (prix, offer/pack, mode paiement, échéancier déclaré). `commissions.enrollment_id` devra devenir nullable *ou* pointer via deal unifié — aujourd’hui NOT NULL bloque le hors-plateforme.

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
- `manual_sales` (ou deal unifié) ; assouplir lien commission ↔ enrollment.
- Attribution types / pool delivery (`coach`) ; schedule fields (installments count, start rule).
- Tables futures factures (stubs) sans UI fiscale v1.

### 2026-10-01 — Manual enrollment + sale (`source`)
- **Décision** : un coach peut créer un enrollment + `organization_sales` hors Stripe (`source=manual`, `billing_type=one_time` sur la sale). Accès via `expires_at` depuis `offers.access_duration_months` (lifetime si null).
- **Pourquoi** : ventes cash / off-platform avec delivery + assign, sans Customer Portal.
- **UI** : `/dashboard/clients` → Add enrollment.
- **Plus tard** : gérer abonnements manuels + lier une txn Stripe si possible ; unifier / drop `manual_sales` ; job qui passe les enrollments `expires_at` dépassée en `status=expired` (vues filtrent déjà la date).

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
- **Décision** : l’owner configure une **matrix par rôle org**. Rôles : `admin` / `sales` / `ambassador` / `coach` / `member` (`owner` = tout, non éditable). Pas de rôles custom ni overrides par membre en V1.
- **Nouveau rôle `coach`** : par défaut **rien** sauf coaching (packs où il est assigné) + capacités **own** (leads attribués, share links à lui, `commissions.view_own`).
- **Deux axes** : (1) capacité matrix (2) scope calculé `org` | `bu` | `own`.
- **BU owner ≠ rôle d’invite** : `business_units.owner_member_id` + colonne matrix configurable `bu_owner` (caps **scope BU only**, cumul avec le rôle org).
- **Résolution scope** : owner/admin → `org` ; sinon BU owner → `bu` ; sinon → `own`.

#### Règles structurelles (defaults produit — au-delà d’une case on/off naïve)
- **CRM view** : tout rôle → ses leads `own` (attribué). BU owner → tous les leads de sa BU. Admin/owner → tous.
- **CRM manage** : tout rôle → **update status** de ses leads `own` seulement (**pas delete**). Admin + BU owner → manage complet dans leur scope (edit/delete/etc.).
- **CRM assign_sales / manage_attributions** : admin ou BU owner (scope BU).
- **sales.view** : admin (org) ou BU owner (sa BU) — pas sales/ambassador/member/coach par défaut.
- **clients.view / enroll_manual** : admin + **member** seulement (pas sales).
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
- `crm.assign_sales` — assigner closer/setter
- `crm.manage_attributions` — attributions / %
- `crm.activate_commissions` — activer / annuler commissions

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

| Clé | admin | sales | ambassador | coach | member |
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

**BU owner** : colonne matrix `bu_owner` (éditable Settings). Defaults : invite members, catalog, clients view/enroll, sales.view, CRM lead ops, forms/links, **coaching view/assign/sessions** (packs dont l’offre est sur sa BU), commissions view/mark paid. Scope données = BU via `offers.business_unit_id` (RLS/queries étape 6–7).

- **Enforcement** : UI (matrix fetch + provider rôle) + RLS `has_org_capability` **(step 6)** + scope row filters `org|bu|own` **(step 7)** via `*_in_scope` helpers. Settings = table directe.
- **Hors V1** : rôles custom, overrides individuels, matrix dupliquée “version BU”.

### 2026-10-03 — Domaine final = `coachstack.co`
- **Décision** : domaine produit = **`coachstack.co`**. Espace coached = **`app.coachstack.co`** (DNS/CNAME + Vercel + cookies Auth encore à finaliser en prod).
- **Pourquoi** : tranché par Habib ; plus “à confirmer”.
- **Conséquence** : env prod / Stripe return URLs / docs infra pointent vers ce domaine ; storefront orgs restent `/{slug}` ou sous-domaines org selon setup existant.

### À décider (ne pas coder de pivot avant)

- [ ] Garder le positionnement “tous types de coachs” vs recentrer (ex. sport) ?
- [ ] Quelle surface simplifier en priorité pour un MVP relancé ?
- [ ] Ce qui reste “must” vs “coupable” dans le backlog features (hors coaching / commissions déjà tranchés)
- [ ] Ordre de build commissions : acquisition-only d’abord vs acquisition+delivery ensemble ?
