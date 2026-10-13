import { z } from "zod"

const ymdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")

const listOpSchema = z.enum(["in", "not_in"])
const dateOpSchema = z.enum(["before", "after", "between", "on_or_after", "on_or_before"])

export const campaignSegmentConditionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("lead_status"),
    op: listOpSchema,
    values: z.array(z.string().trim().min(1)).min(1),
  }),
  z.object({
    type: z.literal("lead_origin"),
    op: listOpSchema,
    values: z.array(z.string().trim().min(1)).min(1),
  }),
  z.object({
    type: z.literal("form_field"),
    field_def_id: z.number().int().positive(),
    op: z.enum(["in", "not_in", "exists", "not_exists"]),
    values: z.array(z.string().trim().min(1)).optional(),
  }),
  z.object({
    type: z.literal("is_client"),
    op: z.literal("eq"),
    value: z.boolean(),
  }),
  z.object({
    type: z.literal("offer"),
    op: listOpSchema,
    values: z.array(z.number().int().positive()).min(1),
  }),
  z.object({
    type: z.literal("product"),
    op: listOpSchema,
    values: z.array(z.number().int().positive()).min(1),
  }),
  z.object({
    type: z.literal("business_unit"),
    op: listOpSchema,
    values: z.array(z.number().int().positive()).min(1),
  }),
  z.object({
    type: z.literal("lead_created_at"),
    op: dateOpSchema,
    from: ymdSchema.optional(),
    to: ymdSchema.optional(),
  }),
  z.object({
    type: z.literal("enrollment_created_at"),
    op: dateOpSchema,
    from: ymdSchema.optional(),
    to: ymdSchema.optional(),
  }),
])

export type CampaignSegmentCondition = z.infer<typeof campaignSegmentConditionSchema>

export type CampaignSegmentFilterGroup = {
  op: "and" | "or"
  not?: boolean
  conditions: Array<CampaignSegmentFilterGroup | CampaignSegmentCondition>
}

export const campaignSegmentFilterGroupSchema: z.ZodType<CampaignSegmentFilterGroup> =
  z.lazy(() =>
    z.object({
      op: z.enum(["and", "or"]),
      not: z.boolean().optional(),
      conditions: z.array(
        z.union([campaignSegmentFilterGroupSchema, campaignSegmentConditionSchema])
      ),
    })
  )

export const campaignSegmentSchema = z.object({
  id: z.number().int().positive(),
  organization_id: z.number().int().positive(),
  name: z.string().min(1),
  filter_json: campaignSegmentFilterGroupSchema,
  resend_segment_id: z.string().nullable(),
  last_synced_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type CampaignSegment = z.infer<typeof campaignSegmentSchema>

export const createCampaignSegmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  filter_json: campaignSegmentFilterGroupSchema,
})

export const updateCampaignSegmentSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  filter_json: campaignSegmentFilterGroupSchema.optional(),
})

export type CreateCampaignSegmentInput = z.infer<typeof createCampaignSegmentSchema>
export type UpdateCampaignSegmentInput = z.infer<typeof updateCampaignSegmentSchema>

export function emptyCampaignSegmentFilter(): CampaignSegmentFilterGroup {
  return { op: "and", conditions: [] }
}

/** Empty group matches everyone (opt-in audience). */
export function isEmptySegmentFilter(filter: CampaignSegmentFilterGroup): boolean {
  return filter.conditions.length === 0
}

/** UI shape: Include AND NOT Exclude. */
export type CampaignSegmentFilterUi = {
  include: CampaignSegmentFilterGroup
  exclude: CampaignSegmentFilterGroup
}

export function emptyCampaignSegmentFilterUi(): CampaignSegmentFilterUi {
  return {
    include: { op: "and", conditions: [] },
    exclude: { op: "and", conditions: [] },
  }
}

function isFilterGroup(
  node: CampaignSegmentFilterGroup | CampaignSegmentCondition
): node is CampaignSegmentFilterGroup {
  return "conditions" in node && !("type" in node)
}

function asFlatGroup(
  group: CampaignSegmentFilterGroup,
  not: boolean
): CampaignSegmentFilterGroup {
  return {
    op: group.op,
    not: not ? true : undefined,
    conditions: group.conditions.filter(
      (node): node is CampaignSegmentCondition => !isFilterGroup(node)
    ),
  }
}

/** Persist UI include/exclude as one AST group. */
export function campaignFilterUiToStorage(
  ui: CampaignSegmentFilterUi
): CampaignSegmentFilterGroup {
  const include = asFlatGroup(ui.include, false)
  const exclude = asFlatGroup(ui.exclude, true)
  const parts: CampaignSegmentFilterGroup[] = []
  if (include.conditions.length > 0) parts.push(include)
  if (exclude.conditions.length > 0) parts.push(exclude)

  if (parts.length === 0) return emptyCampaignSegmentFilter()
  if (parts.length === 1) return parts[0]
  return { op: "and", conditions: parts }
}

/** Best-effort parse of stored AST back into Include / Exclude UI. */
export function campaignFilterStorageToUi(
  filter: CampaignSegmentFilterGroup
): CampaignSegmentFilterUi {
  const empty = emptyCampaignSegmentFilterUi()

  if (filter.conditions.length === 0) return empty

  const allFlat = filter.conditions.every((node) => !isFilterGroup(node))
  if (allFlat) {
    const group = asFlatGroup(filter, false)
    if (filter.not) {
      return { include: empty.include, exclude: { ...group, not: undefined } }
    }
    return { include: group, exclude: empty.exclude }
  }

  let include = empty.include
  let exclude = empty.exclude

  for (const node of filter.conditions) {
    if (!isFilterGroup(node)) continue
    const flat = asFlatGroup(node, false)
    if (node.not) {
      exclude = flat
    } else if (include.conditions.length === 0) {
      include = flat
    }
  }

  return { include, exclude }
}

function invertCondition(
  condition: CampaignSegmentCondition
): CampaignSegmentCondition | null {
  switch (condition.type) {
    case "lead_status":
    case "lead_origin":
    case "offer":
    case "product":
    case "business_unit":
      return {
        ...condition,
        op: condition.op === "in" ? "not_in" : "in",
      }
    case "form_field":
      if (condition.op === "in") return { ...condition, op: "not_in" }
      if (condition.op === "not_in") return { ...condition, op: "in" }
      if (condition.op === "exists") return { ...condition, op: "not_exists" }
      if (condition.op === "not_exists") return { ...condition, op: "exists" }
      return null
    case "is_client":
      return { ...condition, value: !condition.value }
    case "lead_created_at":
    case "enrollment_created_at":
      return null
  }
}

/**
 * Flatten legacy Include/Exclude (or NOT group) into one Match all/any group
 * using inverted operators where possible.
 */
export function flattenCampaignSegmentFilter(
  filter: CampaignSegmentFilterGroup
): CampaignSegmentFilterGroup {
  const ui = campaignFilterStorageToUi(filter)
  const conditions: CampaignSegmentCondition[] = []

  for (const node of ui.include.conditions) {
    if (!isFilterGroup(node)) conditions.push(node)
  }
  for (const node of ui.exclude.conditions) {
    if (isFilterGroup(node)) continue
    const inverted = invertCondition(node)
    if (inverted) conditions.push(inverted)
  }

  return {
    op: ui.include.op === "or" && ui.exclude.conditions.length === 0 ? "or" : "and",
    conditions,
  }
}

export function countCampaignSegmentConditions(
  filter: CampaignSegmentFilterGroup
): number {
  return flattenCampaignSegmentFilter(filter).conditions.length
}
