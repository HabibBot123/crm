"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import {
  CAPABILITY_GROUPS,
  MATRIX_ROLE_LABELS,
  MATRIX_ROLES,
} from "@/lib/permissions/capability-labels"
import type { OrgCapability } from "@/lib/permissions/capabilities"
import type { MatrixRole, OrgRolePermissionRow } from "@/lib/services/org-permissions"
import {
  useOrganizationRolePermissions,
  useUpdateOrganizationRolePermission,
} from "@/hooks/use-org-role-permissions"

function isAllowed(
  rows: OrgRolePermissionRow[],
  role: MatrixRole,
  capability: OrgCapability
): boolean {
  for (const row of rows) {
    if (row.role === role && row.capability === capability) return row.allowed
  }
  return false
}

export function OrgPermissionsMatrix({
  organizationId,
  canEdit,
}: {
  organizationId: number
  canEdit: boolean
}) {
  const { data: rows, isLoading, error } = useOrganizationRolePermissions(organizationId)
  const updateMutation = useUpdateOrganizationRolePermission(organizationId)

  if (isLoading) {
    return <LoadingRows count={6} />
  }

  if (error) {
    return (
      <EmptyState
        title="Couldn’t load permissions"
        description={error.message}
      />
    )
  }

  if (!rows || rows.length === 0) {
    return (
      <EmptyState
        title="No permissions configured"
        description="Default role permissions are missing for this organization."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>Owner always has full access (not shown in the matrix).</p>
        <p>
          <span className="font-medium text-foreground">BU owner</span> is not an invite role — it
          applies to members set as owner of a business unit, and only within{" "}
          <span className="font-medium text-foreground">their BU scope</span> (on top of their
          normal role permissions).
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Permission
              </th>
              {MATRIX_ROLES.map((role) => (
                <th
                  key={role}
                  className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  <div>{MATRIX_ROLE_LABELS[role]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAPABILITY_GROUPS.map((group) => (
              <GroupRows
                key={group.id}
                groupLabel={group.label}
                items={group.items}
                rows={rows}
                canEdit={canEdit}
                pending={updateMutation.isPending}
                onToggle={(role, capability, allowed) => {
                  updateMutation.mutate({ role, capability, allowed })
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GroupRows({
  groupLabel,
  items,
  rows,
  canEdit,
  pending,
  onToggle,
}: {
  groupLabel: string
  items: { capability: OrgCapability; label: string }[]
  rows: OrgRolePermissionRow[]
  canEdit: boolean
  pending: boolean
  onToggle: (role: MatrixRole, capability: OrgCapability, allowed: boolean) => void
}) {
  return (
    <>
      <tr className="bg-muted/40">
        <td
          colSpan={1 + MATRIX_ROLES.length}
          className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {groupLabel}
        </td>
      </tr>
      {items.map((item) => (
        <tr key={item.capability} className="hover:bg-accent/60">
          <td className="px-3 py-2.5 text-foreground">{item.label}</td>
          {MATRIX_ROLES.map((role) => {
            const checked = isAllowed(rows, role, item.capability)
            return (
              <td key={role} className="px-2 py-2.5 text-center">
                <Checkbox
                  checked={checked}
                  disabled={!canEdit || pending}
                  onCheckedChange={(value) => {
                    if (value === "indeterminate") return
                    onToggle(role, item.capability, value === true)
                  }}
                  aria-label={`${MATRIX_ROLE_LABELS[role]}: ${item.label}`}
                />
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}
