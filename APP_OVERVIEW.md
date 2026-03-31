## CoachStack — High‑Level App Overview

This document summarizes what the app is, who it is for, and the main features and pages, so that an AI can understand the product without scanning the whole repository.

---

## 1. What this app is

**CoachStack** is a vertical CRM and delivery platform for professional coaches and coaching organizations (education, business, life, fitness, executive, etc.).  
It combines:

- **Back‑office for coaches**: manage organizations, products (courses, coaching programs), offers, clients, coaching sessions, content, team members, and payments.
- **Public marketing pages**: branded public pages for each organization to present offers and sell programs.
- **Coached space (client portal)**: a dedicated experience for end clients to access the programs they bought, see their coaches, and track progress.

The stack is **Next.js App Router + Supabase + React Query + Stripe Connect**.

---

## 2. Main user roles

- **Coach / Organization owner**
  - Creates an organization and configures branding.
  - Creates products (courses, coaching programs) and structures content.
  - Creates commercial offers and connects Stripe for payments.
  - Manages clients, enrollments, team members, and coaching assignments.

- **Coached (end client)**
  - Signs up / logs in to the coached space.
  - Buys an offer from a coach’s public page.
  - Accesses purchased programs, follows progress, and sees assigned coaches.

---

## 3. High‑level flows

- **Coach onboarding**
  - Sign up (`/signup`), log in (`/login`), create an organization (`/create-organization`).
  - Connect Stripe (`/dashboard/stripe-connect`), configure branding (`/dashboard/branding`).

- **Building the catalog**
  - Create products (courses / coaching) and modules (`/dashboard/products`, `/dashboard/products/[id]`, `/dashboard/content`).
  - Create offers that bundle products, define billing (one‑time, subscription, installments), and variants (`/dashboard/offers`, `/dashboard/offers/new`, `/dashboard/offers/[id]`).

- **Selling and checkout**
  - Each organization has a public branded page at `/org/[slug]` that lists offers.
  - Clicking an offer leads to `/org/[slug]/buy/[offerId]` (or `/org/preview/...` for preview).
  - The app integrates with Stripe (including Stripe Connect) to collect payment and create enrollments.
  - Success pages: `/order-success`, `/checkout`.

- **Client & coaching management**
  - Clients overview by organization: `/dashboard/clients` (built on Supabase views such as `v_organization_clients` and `organization_client_enrollments` via `lib/services/clients.ts`).
  - Enrollments are derived from purchases and linked to offers/products (see `lib/services/offers.ts` and `lib/services/products.ts`).
  - Coaching assignments and sessions are surfaced in `/dashboard/coaching` (and exposed to coached side via `/coached` and related pages).

- **Coached experience**
  - End clients sign up / log in via `/coached-signup` and `/coached-login`.
  - They land on `/coached` which summarizes programs and coaches (hook `use-coached`).
  - Detailed views for programs and coaching sessions live under `/coached/[slug]/courses/[id]` and `/coached/[slug]/coaching/[id]`, with list pages like `/coached/courses` and `/coached/coaches`.

---

## 4. Main app pages (Next.js routes)

### 4.1 Entry, auth, and organization

- `/`  
  Marketing / entry point for the app (coach‑facing).

- `/signup`, `/login`, `/login/forgot-password`, `/login/reset-password`  
  Authentication flows for coach / organization users.

- `/coached-signup`, `/coached-login`  
  Authentication flows for coached (end clients).

- `/create-organization`  
  Create an organization after signup; required before accessing the dashboard.

- `/invite/team`  
  Invited team members accept an invitation and join an organization.

### 4.2 Coach dashboard (back‑office)

All these routes are under `/dashboard` and use the shared dashboard layout and components (`SectionCard`, `StatCard`, `RichListItem`, etc.).

- `/dashboard`  
  **Overview dashboard**: high‑level metrics for the current organization.  
  Data comes from a Supabase RPC `dashboard_overview` and includes:
  - Totals: products, offers, enrollments, clients, revenue, revenue last 30 days.
  - Conversion rate (active students vs total clients).
  - Recent sales list.
  - Top products list.
  - Count of unassigned coaching to redirect to the coaching page.

- `/dashboard/clients`  
  **Clients CRM page**:
  - Lists clients per organization with totals, lifecycle status, and spend.
  - Uses `lib/services/clients.ts` (Supabase views `v_organization_clients` and `organization_client_enrollments`).
  - Supports pagination and search.
  - Detail view for a single client (via API `/api/organizations/[orgId]/clients` and `fetchClientDetail`) aggregates enrollments per client.

- `/dashboard/products`  
  **Products list**:
  - Lists all products (type `course` or `coaching`) for the organization.
  - Uses `lib/services/products.ts::fetchProductsByOrganization`.
  - Supports pagination.

- `/dashboard/products/new`  
  **Product creation wizard**:
  - Creates a product with type (course/coaching), title, and initial data via `createProduct`.
  - For coaching products, an associated `product_coaching` row is created.

- `/dashboard/products/[id]`  
  **Product detail and editor**:
  - Loads a `ProductWithDetails` (`fetchProductWithDetails`).
  - For courses: defines modules and module items, each referencing `content_items`.
  - For coaching: configures `sessions_count`, `period_months`, `delivery_mode` (remote/in‑person/hybrid).
  - Supports:
    - Updating product metadata (title, description, status, cover image).
    - Adding/removing/reordering modules and lessons.
    - Linking uploaded content via `product_module_items`.
  - Business rules:
    - Deleting a product is only allowed when status is `draft` and it is not linked to any `offer` (`deleteProduct` enforces this).
    - Archiving a product is blocked if it is still attached to at least one offer (`updateProduct` checks `offer_products` count).

- `/dashboard/offers`  
  **Offers list**:
  - Lists commercial offers with pagination and filters (scope `all` / `active`).
  - Uses `lib/services/offers.ts::fetchOffersPage`.
  - Each offer bundles one or more products and has billing rules.

- `/dashboard/offers/new`  
  **Offer creation**:
  - Creates an offer (`createOffer`) with:
    - billing type: `subscription`, `one_time`, or `installment`.
    - currency, price, optional interval (month/year), installment count.
    - key features (cleaned and limited to 5 items).
    - attached products (`offer_products` table).
  - New offers start as `draft`.

- `/dashboard/offers/[id]`  
  **Offer detail and management**:
  - Loads an `OfferWithDetails` with:
    - core offer fields.
    - `offer_products` joined with product metadata.
    - `offer_variants` (different prices/options).
  - Allows:
    - Editing offer (title, description, key features, price, interval, billing type).
    - Managing linked products.
    - Managing variants (`createOfferVariant`, `updateOfferVariant`, `deleteOfferVariant`) and Stripe linkage (price IDs, payment links).
    - Viewing enrollments for the offer (`fetchEnrollmentsByOffer`).
  - Deletion rules:
    - Offers **cannot be deleted** (`deleteOffer` always throws); they should be archived instead.
    - Archiving is Stripe‑aware and must go through `/api/stripe-connect/archive-offer`, which updates Stripe and then refreshes the offer.

- `/dashboard/branding`  
  **Branding configuration for public pages**:
  - Controls dynamic branding for `/org/[slug]` and related public views:
    - primary / secondary colors.
    - tagline, hero description, CTA texts.
    - hero and logo images.
    - stats, credentials, testimonials, FAQ blocks.
    - which offer is featured on the public page.

- `/dashboard/content`  
  **Content library**:
  - Manages upload and lifecycle of media content (`content_items`) used in product modules.
  - Uses hooks like `use-content-upload`.

- `/dashboard/coaching`  
  **Coaching management**:
  - For coaching products and their sessions.
  - Surfaces unassigned coaching sessions to be assigned to coaches.

- `/dashboard/team`  
  **Team management**:
  - Manage organization members, invitations, and roles (via `lib/services/team.ts`).

- `/dashboard/settings`  
  **Organization / app settings** (miscellaneous configuration).

- `/dashboard/account`  
  **User account profile**:
  - Personal info, email, password, etc.

- `/dashboard/stripe-connect`  
  **Stripe Connect setup**:
  - Connects the organization to Stripe.
  - Manages onboarding and status, used by webhook handlers under `app/api/webhooks/stripe-connect`.

### 4.3 Public organization & purchase pages

- `/org/[slug]`  
  **Public branded organization page** (see `app/org/[slug]/page.tsx`):
  - Loads public organization and its active offers via `fetchPublicOrganizationBySlug` in `lib/services/organizations.ts`.
  - Uses organization `branding` to drive:
    - colors (primary/secondary), CTA texts, and description.
    - hero image or emoji, stats, about section, credentials, testimonials, FAQ.
  - Lists all public offers with:
    - billing type (subscription, one‑time, installment).
    - description, key features, and linked products (course/coaching).
    - price formatting with interval (month/year) or installments.
  - Each offer links to `/org/[slug]/buy/[offerId]`.

- `/org/[slug]/buy/[offerId]`  
  **Purchase page for a specific offer**:
  - Presents offer details and starts the checkout flow (Stripe).

- `/org/preview/page.tsx`, `/org/preview/buy/[offerId]`  
  **Preview equivalents** for organization owners to see what their public pages look like.

- `/c/[coach]/[product]`  
  **Short public URL** for a specific coach/product combination, redirecting into the same offer / product flow.

- `/order-success`, `/checkout`  
  **Post‑checkout / status pages** after Stripe checkout.

### 4.4 Coached space (client portal)

All these routes are for end clients who have purchased at least one offer.

- `/coached`  
  **Coached home** (see `app/coached/page.tsx`):
  - Uses `use-coached` to load:
    - organizations the client is enrolled with.
    - products they own (courses and coaching).
  - Sections:
    - “Continue” (main program to resume).
    - “My coaches” list (organizations).
    - “Your programs” list.
    - Discover coaches (`/coached/coaches?tab=discover`).

- `/coached/courses`  
  **List of all programs** (courses and possibly coaching, depending on implementation).

- `/coached/courses/[id]`  
  **Course detail**:
  - Shows modules and lessons (via Supabase views and `lib/services/coached.ts`).
  - Tracks progress via lesson completion views.

- `/coached/[slug]/coaching/[id]`  
  **Coaching program detail**:
  - Shows assigned coach, sessions, schedule, and completion.
  - Uses the same `CoachedProduct` type from `use-coached`.

- `/coached/coaches` and `/coached/coaches/[id]`  
  **Coaches discovery & detail**:
  - “My coaches” and “Discover” tabs.
  - Links back to public organization pages to purchase new offers.

- `/coached/profile`  
  **Coached profile page**:
  - Manage basic account information.

---

## 5. Core domain entities (data model overview)

### 5.1 Organization & team

- `organizations`  
  - Represents a coach business / brand.
  - Has `branding` JSON used for public pages and CTAs.

- `organization_members`  
  - Links users to organizations with roles.
  - Uses invitation tokens, signup source, etc.

- `organization_branding` (via JSON field / related table)  
  - Stores primary/secondary colors, taglines, images, stats, testimonials, FAQ content, featured offer id.

### 5.2 Products & content

- `products` (`lib/services/products.ts`)  
  - Types: `course` or `coaching`.
  - Fields: id, organization_id, type, title, description, status (`draft`, `published`, `archived`), cover image, timestamps.

- `product_modules` and `product_module_items`  
  - Hierarchy for courses:
    - A product has ordered modules.
    - Each module has ordered items referencing `content_items`.

- `content_items`  
  - Uploaded content (video, PDF, etc.) with name, type, duration, file size, upload status.

- `product_coaching`  
  - Coaching‑specific configuration for a product:
    - `sessions_count`, `period_months`, `delivery_mode` (`remote`, `in_person`, `hybrid`).

### 5.3 Offers, variants, enrollments

- `offers` (`lib/services/offers.ts`)  
  - Commercial containers that bundle products and define billing:
    - `billing_type` (`subscription`, `one_time`, `installment`).
    - `price`, `currency`, `interval` (`month`/`year`), `installment_count`.
    - `status` (`draft`, `active`, `archived`).
    - `key_features` (short bullet list for marketing copy).
    - Stripe metadata: `stripe_price_id`, `stripe_product_id`, `stripe_payment_link`.

- `offer_products`  
  - Join table between `offers` and `products`.

- `offer_variants`  
  - Variants of an offer (e.g. multiple price points or options).
  - Fields: label, price, installment_count, Stripe price/payment link, `is_active`.

- `enrollments`  
  - Link between a purchased offer (and optionally a variant) and a client:
    - `organization_id`, `offer_id`, `offer_variant_id`.
    - `user_id` or `buyer_email`.
    - `status` (`active`, `expired`, `cancelled`, `paused`).
    - Stripe customer / subscription ids.
    - `started_at`, `expires_at`.

### 5.4 Clients & coached entities

- `v_organization_clients` (view) + `organization_client_enrollments` (view)  
  - Aggregated client CRM data:
    - Stable client key (`user_id` or `buyer_email`).
    - Total spent, number of enrollments.
    - First/last enrollment dates, overall status.
  - Wrapped in `lib/services/clients.ts`:
    - `fetchClientEnrollmentsByOrganization`, `groupClientEnrollmentRows`, `fetchClientsByOrganization`.
    - API‑based pagination and search via `/api/organizations/[orgId]/clients`.

- Coached side types and views (in `lib/services/coached.ts` and `lib/coached.ts`):  
  - Represent `CoachedProduct`, organizations, and progress for the client portal.

---

## 6. Technical patterns & conventions (for AI)

- **Data access**
  - All Supabase queries live in `lib/services/*`.  
  - React components never call Supabase directly; they use React Query hooks that call service functions.

- **React Query**
  - Used across dashboard and coached pages for client‑side data fetching and caching.
  - Query keys are scoped by organization id and entity (e.g. `["dashboard-overview", orgId]`).

- **Schema & safety**
  - Row Level Security (RLS) is enforced in Supabase.
  - Some endpoints use Supabase RPCs and views for aggregated dashboard and CRM data.
  - Deletion and archiving are controlled with explicit business rules (e.g. products/offers cannot be deleted if linked or already published).

This should give an AI enough context to understand what the application does, how major entities relate, and where to look for specific behaviors (pages under `app/`, services under `lib/services/`, and hooks under `hooks/`).

