"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Legacy Forms hub URL → Settings. */
export default function CrmFormsBusinessUnitsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard/settings?section=business-units")
  }, [router])

  return (
    <p className="text-sm text-muted-foreground">Redirecting to Settings…</p>
  )
}
