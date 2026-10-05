import type { OrgCapability } from "@/lib/permissions/capabilities"
import type { MatrixRole } from "@/lib/services/org-permissions"

/** Matrix columns. `bu_owner` is a status column (BU scope), not an invite role — shown after admin. */
export const MATRIX_ROLES: MatrixRole[] = [
  "admin",
  "bu_owner",
  "sales",
  "ambassador",
  "coach",
  "member",
]

export const MATRIX_ROLE_LABELS: Record<MatrixRole, string> = {
  admin: "Admin",
  sales: "Sales",
  ambassador: "Ambassador",
  coach: "Coach",
  member: "Member",
  bu_owner: "BU owner",
}

export type CapabilityGroup = {
  id: string
  label: string
  items: { capability: OrgCapability; label: string }[]
}

/** UI groups for the Settings permissions matrix. */
export const CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    id: "team",
    label: "Team",
    items: [
      { capability: "team.invite", label: "Invite members" },
      { capability: "team.manage_roles", label: "Change member roles" },
      { capability: "team.revoke", label: "Revoke access / cancel invites" },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [{ capability: "catalog.manage", label: "Manage products & offers" }],
  },
  {
    id: "clients",
    label: "Clients & sales",
    items: [
      { capability: "clients.view", label: "View clients" },
      { capability: "clients.enroll_manual", label: "Add manual enrollment" },
      { capability: "sales.view", label: "View sales / revenue" },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    items: [
      { capability: "crm.leads.view_own", label: "View own leads" },
      { capability: "crm.leads.view", label: "View all leads (in scope)" },
      { capability: "crm.leads.update_status", label: "Update lead status" },
      { capability: "crm.leads.edit", label: "Edit lead details" },
      { capability: "crm.leads.delete", label: "Delete leads" },
      { capability: "crm.assign_sales", label: "Assign closer / setter" },
      { capability: "crm.manage_attributions", label: "Manage attributions" },
      { capability: "crm.activate_commissions", label: "Activate / cancel commissions" },
    ],
  },
  {
    id: "forms",
    label: "Forms & share links",
    items: [
      { capability: "forms.view", label: "View forms" },
      { capability: "forms.manage", label: "Manage forms" },
      { capability: "forms.links.view_own", label: "View own share links" },
      { capability: "forms.links.create_own", label: "Create own share links" },
      { capability: "forms.links.delete_own", label: "Delete own share links" },
      { capability: "forms.links.manage_others", label: "Manage others’ share links" },
    ],
  },
  {
    id: "coaching",
    label: "Coaching",
    items: [
      { capability: "coaching.view", label: "View coaching packs" },
      { capability: "coaching.assign", label: "Assign coaches" },
      { capability: "coaching.sessions.create", label: "Create sessions" },
      { capability: "coaching.sessions.complete", label: "Complete sessions" },
    ],
  },
  {
    id: "commissions",
    label: "Commissions & BU",
    items: [
      { capability: "commissions.view_own", label: "View own commissions" },
      { capability: "commissions.view_all", label: "View all commissions" },
      { capability: "commissions.mark_paid", label: "Mark commissions paid" },
      { capability: "bu.manage", label: "Manage business units" },
    ],
  },
  {
    id: "org",
    label: "Organization",
    items: [{ capability: "org.settings", label: "Organization settings" }],
  },
]
