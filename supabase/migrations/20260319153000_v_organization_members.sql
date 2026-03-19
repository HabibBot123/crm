-- View used by API endpoints to list organization members (team) with search fields.
-- It is queried with the admin client (so it can join `public.users` even when RLS applies).
CREATE OR REPLACE VIEW public.v_organization_members AS
SELECT
  om.id,
  om.organization_id,
  om.user_id,
  COALESCE(u.email, om.email)::text AS email,
  u.full_name::text AS full_name,
  om.role,
  om.status,
  om.invited_at,
  om.accepted_at,
  om.revoked_at,
  om.created_at
FROM public.organization_members om
LEFT JOIN public.users u ON u.id = om.user_id;

