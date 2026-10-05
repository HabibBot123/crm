import { redirect } from "next/navigation"

export default function CrmSettingsRedirectPage() {
  redirect("/dashboard/crm/forms/fields")
}
