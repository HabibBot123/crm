# CRM Inbound — Feature Spec

## Overview

Module CRM orienté inbound pour les organisations CoachStack. Les coachs créent des formulaires publics pour capturer des leads, les sales qualifient et closent via un pipeline structuré, les ambassadeurs génèrent du trafic trackable, et les commissions sont calculées automatiquement à la conversion.

---

## Core Concepts

- **Lead** : prospect ayant soumis un formulaire ou ajouté manuellement
- **Pipeline** : flux linéaire de qualification `new → booked → deadline → converted | failed | contact_later`
- **Assigned sales** : membre responsable du lead (ownership unique, pas co-ownership)
- **Attribution** : tous les contributeurs (setter, closer, ambassador) qui méritent une commission — concept séparé de l'ownership
- **Form** : formulaire public brandé de l'org capturant les leads
- **Ambassador link** : URL trackée générée par un ambassadeur pour un canal spécifique

---

## Database Schema

### `leads`

Table principale du pipeline CRM.

```sql
leads:
  id                  uuid PK
  organization_id     uuid FK → organizations
  form_id             uuid FK → crm_forms (nullable — si ajout manuel)
  full_name           text
  email               text
  phone               text
  origin              enum('form', 'manual')
  status              enum('new', 'booked', 'deadline', 'converted', 'failed', 'contact_later')
  status_at           timestamptz NOT NULL DEFAULT now()
  created_by_member_id uuid FK → organization_members (nullable — null si soumission publique automatique, sinon membre qui a ajouté le lead manuellement)
  assigned_sales_id   uuid FK → organization_members (nullable)
  ambassador_link_id  uuid FK → crm_ambassador_links (nullable)
  nylas_booking_id    text (nullable — ID du booking Nylas, phase 2)
  target_offer_id     uuid FK → offers (nullable)
  proposed_amount     numeric (nullable — montant proposé à l''appel, peut différer du prix public)
  proposed installment numeric (nullable — montant proposé à l''appel, peut différer de l''installment public)
  enrollment_id       uuid FK → enrollments (nullable — lié à la conversion)
  created_at          timestamptz DEFAULT now()
  updated_at          timestamptz DEFAULT now()
```

> `status_at` = timestamp d'entrée dans le statut courant. Permet d'afficher "Converti le 14 mars" ou "En deadline depuis 5 jours" sans join.  

---

### `lead_status`

Historique complet des changements de statut. Alimente la timeline du side panel et les analytics pipeline.

```sql
lead_status:
  id                    uuid PK
  lead_id               uuid FK → leads
  from_status           enum (nullable — null si création)
  to_status             enum NOT NULL
  changed_by_member_id  uuid FK → organization_members (nullable — null si webhook auto)
  note                  text (nullable — contexte saisi par le sales)
  created_at            timestamptz DEFAULT now()
```

---

### `lead_field_values`

Réponses aux custom fields par lead. Table séparée pour permettre le filtrage et le tri par valeur de champ.

```sql
lead_field_values:
  id            uuid PK
  lead_id       uuid FK → leads
  field_def_id  uuid FK → crm_fields
  value         text NOT NULL
  created_at    timestamptz DEFAULT now()
  updated_at    timestamptz DEFAULT now()

UNIQUE (lead_id, field_def_id)
```

> `value` est stocké en `text` pour tous les types — la sérialisation/désérialisation est gérée côté applicatif selon le `field_type` de la définition.  
> Filtrage par valeur : `WHERE field_def_id = $1 AND value = 'weight_loss'` — index standard sur `(field_def_id, value)`.

---

### `lead_attributions`

Qui contribue à un lead et mérite une commission. Concept distinct de `assigned_sales_id` (ownership).

```sql
lead_attributions:
  id                uuid PK
  lead_id           uuid FK → leads
  member_id         uuid FK → organization_members
  attribution_type  enum('closer', 'setter', 'ambassador')
  commission_rate   numeric (nullable — % du montant)
  commission_fixed  numeric (nullable — montant fixe)
  created_at        timestamptz DEFAULT now()

UNIQUE (lead_id, member_id, attribution_type)
```

> Un sales peut apparaître deux fois : une fois `setter`, une fois `ambassador` → deux lignes, deux types, deux commissions.

---

### `commissions`

Commission calculée à chaque événement de paiement (enrollment créé, installment payé...).

```sql
commissions:
  id                uuid PK
  organization_id   uuid FK → organizations
  lead_id           uuid FK → leads
  enrollment_id     uuid FK → enrollments
  attribution_id    uuid FK → lead_attributions
  stripe_invoice_id text (nullable — si paiement Stripe)
  amount_paid       numeric NOT NULL
  commission_amount numeric NOT NULL
  status            enum('pending', 'validated', 'paid') DEFAULT 'pending'
  validated_by      uuid FK → organization_members (nullable)
  validated_at      timestamptz (nullable)
  created_at        timestamptz DEFAULT now()
```

---

### `crm_ambassador_links`

Chaque ambassadeur peut créer plusieurs liens, un par canal/campagne.

```sql
crm_ambassador_links:
  id               uuid PK
  organization_id  uuid FK → organizations
  member_id        uuid FK → organization_members
  form_id          uuid FK → crm_forms
  ref_code         text UNIQUE NOT NULL  (ex: "pierre-insta", "marie-yt")
  label            text NOT NULL         (ex: "Instagram", "Story Oct 2024")
  status           enum('active', 'paused', 'archived') DEFAULT 'active'
  clicks_count     integer DEFAULT 0
  created_at       timestamptz DEFAULT now()
```

> `leads_count` et `converted_count` sont dérivés via requête ou vue, pas stockés.

---

### `crm_forms`

Formulaires publics de capture de leads, par organisation.

```sql
crm_forms:
  id               uuid PK
  organization_id  uuid FK → organizations
  title            text NOT NULL
  description      text
  origin_type      enum('form', 'webinar', 'freegiveaway')
  slug             text UNIQUE NOT NULL  (ex: "coaching-decouverte")
  status           enum('draft', 'active', 'archived') DEFAULT 'draft'

  redirect_url     text (nullable — URL de redirect post-soumission si override)
  booking_enabled  boolean DEFAULT true  (phase 2 — si false, pas de redirect booking)
  created_at       timestamptz DEFAULT now()
  updated_at       timestamptz DEFAULT now()
```

> URL publique : `/org/[slug]/form/[formSlug]`

---

### `crm_fields`

Schéma des champs custom par organisation. Alimente à la fois les formulaires et le side panel CRM.

```sql
crm_fields:
  id               uuid PK
  organization_id  uuid FK → organizations
  key              text NOT NULL               (snake_case, ex: "fitness_goal")
  label            text NOT NULL               (ex: "Objectif fitness")
  question  text NOT NULL               (question affichée au prospect, ex: "Quel est ton objectif principal ?")
  field_type       enum('text', 'textarea', 'select', 'multi_select', 'number', 'date', 'boolean')
  options          jsonb                        (pour select : [{value, label}, ...])
  is_required      boolean DEFAULT false
  position         integer DEFAULT 0
  created_at       timestamptz DEFAULT now()

UNIQUE (organization_id, key)
```

---

### `crm_form_fields`

Quels champs `crm_fields` apparaissent dans quel formulaire, avec position et required override. Table séparée pour garantir l'intégrité référentielle (FK) et permettre les queries indépendantes.

```sql
crm_form_fields:
  id               uuid PK
  form_id          uuid FK → crm_forms
  field_def_id     uuid FK → crm_fields
  position         integer DEFAULT 0
  is_required      boolean DEFAULT false
  created_at       timestamptz DEFAULT now()

UNIQUE (form_id, field_def_id)
```

---

## Pages & Features

### `/dashboard/crm`
Vue principale du pipeline. Tableau de données avec :
- Colonnes : Nom • Email • Origine • Statut • Sales assigné • Ambassadeur • Offre ciblée • `status_at` • Actions
- Filtres : statut, sales, ambassadeur, origine, période
- Recherche rapide nom/email
- Actions rapides inline : changer statut, assigner sales, envoyer lien booking
- Side panel (drawer) sur clic d'un lead : détail complet, timeline, champs custom, attributions

### `/dashboard/crm/forms`
Gestion des formulaires de capture (builder — phase 2).
- Liste des formulaires avec statut et stats (leads générés)
- Création/édition d'un formulaire avec champs
- Copie du lien public du formulaire

### `/dashboard/crm/ambassador`
Gestion des liens ambassadeur pour les membres ayant le rôle `ambassador`.
- Liste des liens avec label, canal, statut, stats (clics / leads / convertis)
- Création d'un nouveau lien (choix du formulaire cible + label)
- Activation / pause / archivage

### `/dashboard/crm/commissions`
Suivi et validation des commissions.
- Tableau des commissions par période : bénéficiaire, lead, montant, statut
- Validation manuelle par le coach/admin (pending → validated)
- Export CSV pour paiement externe
- Résumé par sales et par ambassadeur

### `/org/[slug]/form/[formSlug]` *(public)*
Page publique brandée de capture de leads.
- Formulaire avec les champs définis dans `crm_form_fields`
- Branding de l'organisation (couleurs, logo)
- Détection du `?ref=` dans l'URL → stockage `ambassador_link_id`
- Post-soumission : redirect vers page de booking Nylas (phase 2) ou page de confirmation simple (phase 1)

---

## Build Phases

### Phase 1 — CRM + Forms (sans booking, sans commissions)
- Tables : `leads`, `lead_status_logs`, `crm_forms`, `crm_fields`, `crm_form_fields`
- Pages publiques : `/org/[slug]/form/[formSlug]` avec soumission et confirmation
- Dashboard : `/dashboard/crm` (tableau + side panel), `/dashboard/crm/forms` (liste + stats)
- Fonctionnalités : capture de leads, pipeline statuts manuels, assignation manuelle, champs custom de base (notes, lost_reason précréés)

### Phase 2 — Booking Nylas
- Tables : ajout `nylas_booking_id` sur `leads` (déjà prévu)
- Connexion calendrier par membre (Nylas Grant OAuth)
- Pool round-robin par organisation
- Webhook Nylas → statut `booked` + `assigned_sales_id` auto
- Redirect post-form vers page booking Nylas
- Email de rappel J-1 (natif Nylas)

### Phase 3 — Ambassadeurs
- Tables : `ambassador_links`, `lead_attributions`
- Pages : `/dashboard/crm/ambassador`
- Détection `?ref=` sur formulaires publics
- Dashboard stats par lien (clics / leads / convertis)

### Phase 4 — Commissions
- Tables : `commissions`
- Webhook Stripe → calcul commissions automatique à l'enrollment
- Match lead → enrollment par `buyer_email`
- Pages : `/dashboard/crm/commissions`
- Validation manuelle + export CSV

### Phase 5 — Outbound *(architecture déjà prête)*
- Ajout `origin: 'outbound'` dans l'enum
- Vue filtrée outbound dans `/dashboard/crm`
- Import CSV (`origin: 'import'`)
- Séquences de relance (future)

---

## Notes d'architecture

- `assigned_sales_id` sur `leads` = ownership unique (qui porte le lead). Pas de table de relation. Reassignation possible à tout moment, tracée dans `lead_status` via note.
- `lead_attributions` = qui mérite une commission. Concept distinct. Un même membre peut être `setter` + `ambassador` → deux lignes.
- `status_at` remplace toutes les colonnes temporelles spécifiques (`booked_at`, `deadline_at`, etc.) 
