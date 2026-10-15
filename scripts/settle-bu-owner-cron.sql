-- Monthly BU Owner settlement cron (pg_cron).
-- Runs on the 1st at 03:40 UTC ; settles the previous calendar month for all orgs.
-- Idempotent : settle_bu_owner_month skips BUs that already have a row for the period.
-- Applied live (jobname settle-bu-owner-previous-month). Keep as repo source of truth.

SELECT cron.schedule(
  'settle-bu-owner-previous-month',
  '40 3 1 * *',
  $$
  SELECT public.settle_bu_owner_month(
    EXTRACT(YEAR FROM (now() AT TIME ZONE 'UTC' - INTERVAL '1 day'))::int,
    EXTRACT(MONTH FROM (now() AT TIME ZONE 'UTC' - INTERVAL '1 day'))::int,
    NULL
  );
  $$
);
