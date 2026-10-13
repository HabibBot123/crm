-- Safe add created_at on coaching_assignments (existing rows backfilled 30d ago)
ALTER TABLE public.coaching_assignments
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;

UPDATE public.coaching_assignments
SET created_at = now() - interval '30 days'
WHERE created_at IS NULL;

ALTER TABLE public.coaching_assignments
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.coaching_assignments_set_created_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_at IS NULL THEN
      NEW.created_at := now();
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.organization_member_id IS DISTINCT FROM OLD.organization_member_id THEN
    NEW.created_at := now();
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS coaching_assignments_set_created_at ON public.coaching_assignments;
CREATE TRIGGER coaching_assignments_set_created_at
  BEFORE INSERT OR UPDATE ON public.coaching_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.coaching_assignments_set_created_at();
