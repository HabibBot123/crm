# Design System — CoachStack

## Identity
- **Style**: Dense · Organized · Modern SaaS dashboard · Balanced scale
- **Primary color**: `oklch(0.7141 0.1918 48.92)` (orange)
- **Background**: `var(--background)` — light neutral
- **Text primary**: `var(--foreground)`
- **Text secondary**: `var(--muted-foreground)`
- **Card background**: `var(--card)`
- **Border**: `var(--border)`
- **Accent**: `var(--accent)` / `var(--accent-foreground)`
- **Success**: `var(--success)` / `var(--success-foreground)`
- **Warning**: `var(--warning)` / `var(--warning-foreground)`
- **Destructive**: `var(--destructive)` / `var(--destructive-foreground)`
- **Sidebar**: `var(--sidebar)` / `var(--sidebar-foreground)`
- **Radii**: `--radius` base, with `rounded-xl` as default for cards and containers

Underlying tokens are defined in `app/globals.css` and re‑exposed via Tailwind theme variables (e.g. `bg-background`, `text-foreground`, `border-border`, `bg-card`).

## Background & Base Layer

The base app surface is minimal and neutral; there is **no decorative hero background**. The emphasis is on clarity and density:

```jsx
<body className="bg-background text-foreground">
  <div className="min-h-screen">
    {/* app content */}
  </div>
</body>
```

All elements inherit `border-border` and `outline-ring/50` from `app/globals.css`, so borders and focus states are consistent:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## Logo / Brand (Dashboard)

The internal dashboard uses a compact, text‑based brand inside the sidebar/header, aligned with the dense, utilitarian style:

```jsx
  <div className="flex items-center gap-2">
  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display text-lg font-bold">
    CS
  </div>
  <span className="text-sm font-semibold tracking-tight text-foreground">
    CoachStack
  </span>
</div>
```

Public pages (`/org/[slug]`, offers, previews) use dynamic branding colors (`primaryColor`, `secondaryColor`) derived from organization settings as described in `.cursor/rules/design-system-ux.mdc`.

## Navigation (Dashboard)

- **Font**: `text-sm font-medium text-muted-foreground`
- **Active item**: uses primary color band and background
- **Container**: sidebar layout with neutral background and subtle borders

Example sidebar item:

```jsx
<button
  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground data-[active=true]:bg-sidebar-primary/10 data-[active=true]:text-sidebar-primary data-[active=true]:border data-[active=true]:border-sidebar-primary/40"
  data-active={isActive}
>
  <Icon className="h-4 w-4" />
  <span className="truncate">{label}</span>
</button>
```

## Buttons

Buttons follow shadcn/ui semantics with colors coming from the theme tokens.

### Primary

```jsx
<button className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
  Label
</button>
```

### Secondary

```jsx
<button className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
  Label
</button>
```

### Ghost / Subtle

```jsx
<button className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent/60">
  Label
</button>
```

## Badge / Status

Status is centralized via `StatusBadge`, which wraps `Badge` from `@/components/ui/badge` and maps semantic statuses to themed variants.

```jsx
<StatusBadge status="active" />
<StatusBadge status="draft" />
<StatusBadge status="cancelled" />
```

Internally it applies variant‑specific classes:

```jsx
<Badge
  variant="outline"
  className={cn(
    "text-xs capitalize",
    // examples:
    // success: "bg-success/10 text-success border-success/20"
    // warning: "bg-warning/10 text-warning-foreground border-warning/20"
    // destructive: "bg-destructive/10 text-destructive border-destructive/20"
  )}
>
  {label}
</Badge>
```

## Typography

Typography is driven by Inter for body (`font-sans`) and Geist for display (`font-display`).

- **Page titles**: `font-display text-2xl font-bold tracking-tight text-foreground`
- **Section titles**: `text-sm font-semibold text-foreground`
- **Labels / column headers**: `text-xs font-semibold uppercase tracking-wider text-muted-foreground`
- **Body**: `text-sm text-foreground`
- **Muted text**: `text-sm text-muted-foreground`

Example page header:

```jsx
<div className="flex items-start justify-between gap-4">
  <div>
    <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
      Overview
    </h1>
    <p className="mt-0.5 text-sm text-muted-foreground">
      Organization · Monday, March 31, 2026
    </p>
  </div>
</div>
```

## Layout

### Dashboard page container

```jsx
<div className="space-y-6 p-6 lg:p-8">
  {/* sections */}
</div>
```

### Two‑column settings layout

```jsx
<div className="flex items-start gap-6">
  <aside className="w-48 shrink-0">
    {/* nav list */}
  </aside>
  <main className="flex-1">
    <SectionCard>
      {/* settings content */}
    </SectionCard>
  </main>
</div>
```

### KPI metrics strip

```jsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <StatCard title="Total Revenue" value="12 340 €" borderColor="primary" />
  <StatCard title="Total Clients" value="128" borderColor="success" />
  <StatCard title="Total Sales" value="420" borderColor="warning" />
  <StatCard title="Conversion Rate" value="38.5%" borderColor="accent" />
</div>
```

## Cards & Containers

### SectionCard (dashboard sections)

Used for main data blocks and tables.

```jsx
<SectionCard
  title="Recent Sales"
  subtitle="Latest purchases across all offers"
  action={
    <Link
      href="/dashboard/clients"
      className="text-xs font-medium text-primary hover:underline"
    >
      View all →
    </Link>
  }
>
  {/* content */}
</SectionCard>
```

Base styles:

```jsx
<div className="rounded-xl border border-border bg-card">
  {/* optional header, content, and footer */}
</div>
```

### StatCard

Metric card with colored left border determined by semantic `borderColor`.

```jsx
<div className="rounded-xl border border-border bg-card p-5 border-l-[3px] border-l-primary">
  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    Total Revenue
  </p>
  <p className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
    12 340 €
  </p>
  <div className="mt-2 flex items-center gap-1.5">
    <TrendBadge value={12} />
    <span className="text-xs text-muted-foreground">vs last month</span>
  </div>
</div>
```

## Lists & Tables

### Rich card list (Pattern A)

When each item is a standalone content block, use `RichListItem` in a vertical list without a surrounding `SectionCard`.

```jsx
<ul className="space-y-3">
  <RichListItem>
    <div className="flex items-center gap-3">
      {/* avatar, main text, metadata */}
    </div>
  </RichListItem>
</ul>
```

Base `RichListItem` style:

```jsx
<li className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/40">
  {/* content */}
</li>
```

### Data table (Pattern B)

For columnar data, wrap a `<table>` with `SectionCard noPadding` and use consistent header/row styles:

```jsx
<SectionCard title="Clients" noPadding>
  <table className="w-full border-collapse text-sm">
    <thead className="bg-muted/60 border-b border-border">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Name
        </th>
        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Status
        </th>
        {/* ... */}
      </tr>
    </thead>
    <tbody>
      <tr className="hover:bg-accent/60">
        <td className="px-6 py-3">Jane Doe</td>
        <td className="px-6 py-3">
          <StatusBadge status="active" />
        </td>
      </tr>
    </tbody>
  </table>
</SectionCard>
```

Do **not** mix `RichListItem` and tables in the same section.

## States (Empty / Loading)

### EmptyState

Zero‑data states use `EmptyState` with icon, title, and optional description/action.

```jsx
<EmptyState
  icon={ShoppingCart}
  title="No sales yet"
  description="Sales will appear here after purchases."
  action={
    <Link href="/dashboard/offers/new" className="text-xs font-medium text-primary hover:underline">
      Create your first offer →
    </Link>
  }
/>
```

Base style:

```jsx
<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 px-6 text-center">
  {/* icon, title, description, optional action */}
</div>
```

### Loading

- List loading: `LoadingRows` skeleton component
- Grid/loading cards: `LoadingGrid` (where used)
- Avoid rendering `null` without a placeholder; always show either content, loading, or `EmptyState`.

## Branding (Public org pages)

Public pages use dynamic branding colors:

- `primaryColor`: `branding.primary_color` with fallback `#e07b39`
- `secondaryColor`: `branding.secondary_color` with fallback `#111827`

Example usage:

```jsx
const primaryColor = branding.primary_color ?? "#e07b39";

return (
  <div
    className="rounded-2xl border px-6 py-4"
    style={{ backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}33` }}
  >
    {/* public offer content */}
  </div>
);
```

Use transparent tints (`14`, `1a`, etc.) to keep backgrounds soft while maintaining readability.

