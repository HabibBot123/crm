# Supabase Auth email templates

Templates to copy into **Supabase Dashboard → Authentication → Email Templates**.

## Confirm signup

- **Template:** `confirm-signup.html`
- **In Supabase:** open **Confirm signup**, paste the HTML into the body.
- **Subject** (suggestion): `Confirm your email — CoachStack`
- Variables used: `{{ .ConfirmationURL }}`, `{{ .Email }}` (Supabase Go template syntax; do not remove).
