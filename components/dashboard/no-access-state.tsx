import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"

type NoAccessStateProps = {
  title: string
  description?: string
}

/** Full-page denial when the member’s role lacks the required capability. */
export function NoAccessState({
  title,
  description = "You don’t have permission to view this page with your role.",
}: NoAccessStateProps) {
  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader title={title} />
      <EmptyState title="No access" description={description} />
    </div>
  )
}
