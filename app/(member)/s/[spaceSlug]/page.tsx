"use client"

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoadingRows } from "@/components/dashboard/loading-rows"

/** Legacy `/s/[slug]` → `/s?space=slug` (single spaces shell). */
export default function SpaceSlugRedirectPage({
  params,
}: {
  params: Promise<{ spaceSlug: string }>
}) {
  const { spaceSlug } = use(params)
  const router = useRouter()

  useEffect(() => {
    router.replace(`/s?space=${encodeURIComponent(spaceSlug)}`)
  }, [router, spaceSlug])

  return <LoadingRows count={3} />
}
