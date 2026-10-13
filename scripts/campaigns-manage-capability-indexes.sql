-- Cap campaigns.manage + indexes sync audience
-- Applied via Supabase MCP 2026-10-13.

-- ---------------------------------------------------------------------------
-- Indexes (sync pending + stats opted-in)
-- ---------------------------------------------------------------------------

create index if not exists campaign_contacts_org_pending_sync_idx
  on public.campaign_contacts (organization_id, id)
  where marketing_opt_in = true
    and resend_contact_id is null;

create index if not exists campaign_contacts_org_opted_in_idx
  on public.campaign_contacts (organization_id)
  where marketing_opt_in = true;

create index if not exists campaign_contacts_org_synced_idx
  on public.campaign_contacts (organization_id)
  where marketing_opt_in = true
    and resend_contact_id is not null;

-- ---------------------------------------------------------------------------
-- Capability check + seed
-- ---------------------------------------------------------------------------

alter table public.organization_role_permissions
  drop constraint if exists organization_role_permissions_capability_check;

alter table public.organization_role_permissions
  add constraint organization_role_permissions_capability_check
  check (capability = any (array[
    'team.invite'::text,
    'team.manage_roles'::text,
    'team.revoke'::text,
    'catalog.manage'::text,
    'clients.view'::text,
    'clients.enroll_manual'::text,
    'sales.view'::text,
    'analytics.view'::text,
    'crm.leads.view'::text,
    'crm.leads.view_own'::text,
    'crm.leads.update_status'::text,
    'crm.leads.edit'::text,
    'crm.leads.delete'::text,
    'crm.assign_sales'::text,
    'crm.manage_attributions'::text,
    'crm.activate_commissions'::text,
    'crm.view_lead_commissions'::text,
    'forms.view'::text,
    'forms.manage'::text,
    'forms.links.view_own'::text,
    'forms.links.create_own'::text,
    'forms.links.delete_own'::text,
    'forms.links.manage_others'::text,
    'coaching.view'::text,
    'coaching.assign'::text,
    'coaching.sessions.create'::text,
    'coaching.sessions.complete'::text,
    'commissions.view_own'::text,
    'commissions.view_all'::text,
    'commissions.mark_paid'::text,
    'bu.manage'::text,
    'org.settings'::text,
    'campaigns.manage'::text
  ]));

create or replace function public.seed_organization_role_permissions(p_organization_id bigint)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.organization_role_permissions (organization_id, role, capability, allowed)
  select p_organization_id, d.role, d.capability, d.allowed
  from (
    values
      ('admin', 'team.invite', true),
      ('admin', 'team.manage_roles', true),
      ('admin', 'team.revoke', true),
      ('admin', 'catalog.manage', true),
      ('admin', 'clients.view', true),
      ('admin', 'clients.enroll_manual', true),
      ('admin', 'sales.view', true),
      ('admin', 'analytics.view', true),
      ('admin', 'crm.leads.view', true),
      ('admin', 'crm.leads.view_own', true),
      ('admin', 'crm.leads.update_status', true),
      ('admin', 'crm.leads.edit', true),
      ('admin', 'crm.leads.delete', true),
      ('admin', 'crm.assign_sales', true),
      ('admin', 'crm.manage_attributions', true),
      ('admin', 'crm.activate_commissions', true),
      ('admin', 'crm.view_lead_commissions', true),
      ('admin', 'forms.view', true),
      ('admin', 'forms.manage', true),
      ('admin', 'forms.links.view_own', true),
      ('admin', 'forms.links.create_own', true),
      ('admin', 'forms.links.delete_own', true),
      ('admin', 'forms.links.manage_others', true),
      ('admin', 'coaching.view', true),
      ('admin', 'coaching.assign', true),
      ('admin', 'coaching.sessions.create', true),
      ('admin', 'coaching.sessions.complete', true),
      ('admin', 'commissions.view_own', true),
      ('admin', 'commissions.view_all', true),
      ('admin', 'commissions.mark_paid', true),
      ('admin', 'bu.manage', true),
      ('admin', 'org.settings', true),
      ('admin', 'campaigns.manage', true),
      ('sales', 'team.invite', false),
      ('sales', 'team.manage_roles', false),
      ('sales', 'team.revoke', false),
      ('sales', 'catalog.manage', false),
      ('sales', 'clients.view', false),
      ('sales', 'clients.enroll_manual', false),
      ('sales', 'sales.view', false),
      ('sales', 'analytics.view', false),
      ('sales', 'crm.leads.view', false),
      ('sales', 'crm.leads.view_own', true),
      ('sales', 'crm.leads.update_status', true),
      ('sales', 'crm.leads.edit', false),
      ('sales', 'crm.leads.delete', false),
      ('sales', 'crm.assign_sales', false),
      ('sales', 'crm.manage_attributions', false),
      ('sales', 'crm.activate_commissions', false),
      ('sales', 'crm.view_lead_commissions', false),
      ('sales', 'forms.view', true),
      ('sales', 'forms.manage', false),
      ('sales', 'forms.links.view_own', true),
      ('sales', 'forms.links.create_own', true),
      ('sales', 'forms.links.delete_own', true),
      ('sales', 'forms.links.manage_others', false),
      ('sales', 'coaching.view', false),
      ('sales', 'coaching.assign', false),
      ('sales', 'coaching.sessions.create', false),
      ('sales', 'coaching.sessions.complete', false),
      ('sales', 'commissions.view_own', true),
      ('sales', 'commissions.view_all', false),
      ('sales', 'commissions.mark_paid', false),
      ('sales', 'bu.manage', false),
      ('sales', 'org.settings', false),
      ('sales', 'campaigns.manage', false),
      ('ambassador', 'team.invite', false),
      ('ambassador', 'team.manage_roles', false),
      ('ambassador', 'team.revoke', false),
      ('ambassador', 'catalog.manage', false),
      ('ambassador', 'clients.view', false),
      ('ambassador', 'clients.enroll_manual', false),
      ('ambassador', 'sales.view', false),
      ('ambassador', 'analytics.view', false),
      ('ambassador', 'crm.leads.view', false),
      ('ambassador', 'crm.leads.view_own', true),
      ('ambassador', 'crm.leads.update_status', true),
      ('ambassador', 'crm.leads.edit', false),
      ('ambassador', 'crm.leads.delete', false),
      ('ambassador', 'crm.assign_sales', false),
      ('ambassador', 'crm.manage_attributions', false),
      ('ambassador', 'crm.activate_commissions', false),
      ('ambassador', 'crm.view_lead_commissions', false),
      ('ambassador', 'forms.view', true),
      ('ambassador', 'forms.manage', false),
      ('ambassador', 'forms.links.view_own', true),
      ('ambassador', 'forms.links.create_own', true),
      ('ambassador', 'forms.links.delete_own', true),
      ('ambassador', 'forms.links.manage_others', false),
      ('ambassador', 'coaching.view', false),
      ('ambassador', 'coaching.assign', false),
      ('ambassador', 'coaching.sessions.create', false),
      ('ambassador', 'coaching.sessions.complete', false),
      ('ambassador', 'commissions.view_own', true),
      ('ambassador', 'commissions.view_all', false),
      ('ambassador', 'commissions.mark_paid', false),
      ('ambassador', 'bu.manage', false),
      ('ambassador', 'org.settings', false),
      ('ambassador', 'campaigns.manage', false),
      ('coach', 'team.invite', false),
      ('coach', 'team.manage_roles', false),
      ('coach', 'team.revoke', false),
      ('coach', 'catalog.manage', false),
      ('coach', 'clients.view', false),
      ('coach', 'clients.enroll_manual', false),
      ('coach', 'sales.view', false),
      ('coach', 'analytics.view', false),
      ('coach', 'crm.leads.view', false),
      ('coach', 'crm.leads.view_own', true),
      ('coach', 'crm.leads.update_status', true),
      ('coach', 'crm.leads.edit', false),
      ('coach', 'crm.leads.delete', false),
      ('coach', 'crm.assign_sales', false),
      ('coach', 'crm.manage_attributions', false),
      ('coach', 'crm.activate_commissions', false),
      ('coach', 'crm.view_lead_commissions', false),
      ('coach', 'forms.view', true),
      ('coach', 'forms.manage', false),
      ('coach', 'coaching.view', true),
      ('coach', 'coaching.assign', false),
      ('coach', 'coaching.sessions.create', true),
      ('coach', 'coaching.sessions.complete', true),
      ('coach', 'forms.links.view_own', true),
      ('coach', 'forms.links.create_own', true),
      ('coach', 'forms.links.delete_own', true),
      ('coach', 'forms.links.manage_others', false),
      ('coach', 'commissions.view_own', true),
      ('coach', 'commissions.view_all', false),
      ('coach', 'commissions.mark_paid', false),
      ('coach', 'bu.manage', false),
      ('coach', 'org.settings', false),
      ('coach', 'campaigns.manage', false),
      ('staff', 'team.invite', false),
      ('staff', 'team.manage_roles', false),
      ('staff', 'team.revoke', false),
      ('staff', 'catalog.manage', false),
      ('staff', 'clients.view', true),
      ('staff', 'clients.enroll_manual', true),
      ('staff', 'sales.view', false),
      ('staff', 'analytics.view', false),
      ('staff', 'crm.leads.view', false),
      ('staff', 'crm.leads.view_own', true),
      ('staff', 'crm.leads.update_status', true),
      ('staff', 'crm.leads.edit', false),
      ('staff', 'crm.leads.delete', false),
      ('staff', 'crm.assign_sales', false),
      ('staff', 'crm.manage_attributions', false),
      ('staff', 'crm.activate_commissions', false),
      ('staff', 'crm.view_lead_commissions', false),
      ('staff', 'forms.view', true),
      ('staff', 'forms.manage', false),
      ('staff', 'forms.links.view_own', true),
      ('staff', 'forms.links.create_own', true),
      ('staff', 'forms.links.delete_own', true),
      ('staff', 'forms.links.manage_others', false),
      ('staff', 'coaching.view', false),
      ('staff', 'coaching.assign', false),
      ('staff', 'coaching.sessions.create', false),
      ('staff', 'coaching.sessions.complete', false),
      ('staff', 'commissions.view_own', true),
      ('staff', 'commissions.view_all', false),
      ('staff', 'commissions.mark_paid', false),
      ('staff', 'bu.manage', false),
      ('staff', 'org.settings', false),
      ('staff', 'campaigns.manage', false),
      ('bu_owner', 'team.invite', true),
      ('bu_owner', 'team.manage_roles', false),
      ('bu_owner', 'team.revoke', false),
      ('bu_owner', 'catalog.manage', true),
      ('bu_owner', 'clients.view', true),
      ('bu_owner', 'clients.enroll_manual', true),
      ('bu_owner', 'sales.view', true),
      ('bu_owner', 'analytics.view', true),
      ('bu_owner', 'crm.leads.view', true),
      ('bu_owner', 'crm.leads.view_own', true),
      ('bu_owner', 'crm.leads.update_status', true),
      ('bu_owner', 'crm.leads.edit', true),
      ('bu_owner', 'crm.leads.delete', true),
      ('bu_owner', 'crm.assign_sales', true),
      ('bu_owner', 'crm.manage_attributions', true),
      ('bu_owner', 'crm.activate_commissions', false),
      ('bu_owner', 'crm.view_lead_commissions', true),
      ('bu_owner', 'forms.view', true),
      ('bu_owner', 'forms.manage', true),
      ('bu_owner', 'forms.links.view_own', true),
      ('bu_owner', 'forms.links.create_own', true),
      ('bu_owner', 'forms.links.delete_own', true),
      ('bu_owner', 'forms.links.manage_others', true),
      ('bu_owner', 'coaching.view', true),
      ('bu_owner', 'coaching.assign', true),
      ('bu_owner', 'coaching.sessions.create', true),
      ('bu_owner', 'coaching.sessions.complete', true),
      ('bu_owner', 'commissions.view_own', true),
      ('bu_owner', 'commissions.view_all', true),
      ('bu_owner', 'commissions.mark_paid', true),
      ('bu_owner', 'bu.manage', false),
      ('bu_owner', 'org.settings', false),
      ('bu_owner', 'campaigns.manage', false)
  ) as d(role, capability, allowed)
  on conflict (organization_id, role, capability) do nothing;
end;
$function$;

-- Backfill existing orgs
do $$
declare
  r record;
begin
  for r in select id from public.organizations
  loop
    perform public.seed_organization_role_permissions(r.id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: campaign tables gated by campaigns.manage
-- ---------------------------------------------------------------------------

drop policy if exists campaign_contacts_select_member on public.campaign_contacts;
create policy campaign_contacts_select_member
  on public.campaign_contacts
  for select
  to authenticated
  using (has_org_capability(organization_id, 'campaigns.manage'));

drop policy if exists campaign_contacts_write_crm on public.campaign_contacts;
create policy campaign_contacts_write_manage
  on public.campaign_contacts
  for all
  to authenticated
  using (has_org_capability(organization_id, 'campaigns.manage'))
  with check (has_org_capability(organization_id, 'campaigns.manage'));

drop policy if exists campaign_topics_write_settings on public.campaign_topics;
create policy campaign_topics_write_manage
  on public.campaign_topics
  for all
  to authenticated
  using (
    has_org_capability(organization_id, 'campaigns.manage')
    or has_org_capability(organization_id, 'org.settings')
  )
  with check (
    has_org_capability(organization_id, 'campaigns.manage')
    or has_org_capability(organization_id, 'org.settings')
  );

drop policy if exists campaign_segments_select_member on public.campaign_segments;
create policy campaign_segments_select_manage
  on public.campaign_segments
  for select
  to authenticated
  using (has_org_capability(organization_id, 'campaigns.manage'));

drop policy if exists campaign_segments_write_settings on public.campaign_segments;
create policy campaign_segments_write_manage
  on public.campaign_segments
  for all
  to authenticated
  using (has_org_capability(organization_id, 'campaigns.manage'))
  with check (has_org_capability(organization_id, 'campaigns.manage'));
