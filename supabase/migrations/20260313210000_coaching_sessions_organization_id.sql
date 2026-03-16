-- Add organization_id to coaching_sessions to simplify RLS and queries
ALTER TABLE public.coaching_sessions
  ADD COLUMN organization_id bigint REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.coaching_sessions cs
SET organization_id = (
  SELECT e.organization_id
  FROM public.enrollment_products ep
  JOIN public.enrollments e ON e.id = ep.enrollment_id
  WHERE ep.id = cs.enrollment_product_id
  LIMIT 1
);

ALTER TABLE public.coaching_sessions
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX idx_coaching_sessions_organization_id
  ON public.coaching_sessions(organization_id);

-- Simplify RLS: org members by organization_id
DROP POLICY IF EXISTS "Coaching sessions: org members full access" ON public.coaching_sessions;

CREATE POLICY "Coaching sessions: org members full access"
  ON public.coaching_sessions
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND status = 'active'
    )
  );
