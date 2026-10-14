-- Audience contacts list (fixed columns). security_invoker → campaign_contacts RLS.
-- Applied via MCP: v_campaign_audience_contacts

create or replace view public.v_campaign_audience_contacts
with (security_invoker = true) as
select
  cc.id,
  cc.organization_id,
  cc.email,
  cc.marketing_opt_in,
  cc.opted_in_at,
  cc.opted_out_at,
  cc.lead_id,
  cc.enrollment_id,
  cc.resend_contact_id,
  cc.created_at,
  cc.updated_at,
  case
    when cc.lead_id is not null and cc.enrollment_id is not null then 'both'
    when cc.lead_id is not null then 'lead'
    when cc.enrollment_id is not null then 'client'
    else 'unknown'
  end as origin,
  case
    when l.id is not null then nullif(btrim(l.first_name), '')
    else nullif(btrim(split_part(btrim(coalesce(e.buyer_name, '')), ' ', 1)), '')
  end as first_name,
  case
    when l.id is not null then nullif(btrim(l.last_name), '')
    else nullif(
      btrim(
        substr(
          btrim(coalesce(e.buyer_name, '')),
          length(split_part(btrim(coalesce(e.buyer_name, '')), ' ', 1)) + 1
        )
      ),
      ''
    )
  end as last_name,
  coalesce(
    nullif(btrim(l.full_name), ''),
    nullif(btrim(e.buyer_name), '')
  ) as full_name,
  l.status as lead_status,
  (cc.resend_contact_id is not null) as synced
from public.campaign_contacts cc
left join public.leads l on l.id = cc.lead_id
left join public.enrollments e on e.id = cc.enrollment_id;

grant select on public.v_campaign_audience_contacts to authenticated;
grant select on public.v_campaign_audience_contacts to service_role;

comment on view public.v_campaign_audience_contacts is
  'Audience list: campaign_contacts enriched with lead/client names and origin.';
