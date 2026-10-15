"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  buildAppHubOrigin,
  buildOrgAppOrigin,
  isLocalDevHost,
  isMemberAppHost,
  parseCoachedHost,
  type CoachedHostContext,
} from "@/lib/coached-host"
import { setLastCoachedOrgSlug } from "@/lib/coached-last-org"

export function useCoachedHost() {
  const [host, setHost] = useState("")
  const [protocol, setProtocol] = useState("http:")

  useEffect(() => {
    setHost(window.location.host)
    setProtocol(window.location.protocol)
  }, [])

  const hostContext: CoachedHostContext = useMemo(() => {
    if (!host) return { kind: "unknown" }
    return parseCoachedHost(host)
  }, [host])

  const local = host ? isLocalDevHost(host) : false
  const isMemberHost = host ? isMemberAppHost(host) : false

  const orgSlug =
    hostContext.kind === "app-org" ? hostContext.orgSlug : null

  const isOrgApp = !!orgSlug
  const isHub = isMemberHost && !orgSlug

  useEffect(() => {
    if (orgSlug) setLastCoachedOrgSlug(orgSlug)
  }, [orgSlug])

  const orgAppHref = useCallback(
    (slug: string, path = "/home") => {
      if (!host) return path
      const origin = buildOrgAppOrigin({
        orgSlug: slug,
        protocol,
        currentHost: host,
      })
      return `${origin}${path.startsWith("/") ? path : `/${path}`}`
    },
    [host, protocol]
  )

  const hubHref = useCallback(
    (path = "/home") => {
      if (!host) return path
      const origin = buildAppHubOrigin({ protocol, currentHost: host })
      return `${origin}${path.startsWith("/") ? path : `/${path}`}`
    },
    [host, protocol]
  )

  const goToOrg = useCallback(
    (slug: string, path = "/home") => {
      setLastCoachedOrgSlug(slug)
      window.location.assign(orgAppHref(slug, path))
    },
    [orgAppHref]
  )

  const goToHub = useCallback(
    (path = "/home") => {
      window.location.assign(hubHref(path))
    },
    [hubHref]
  )

  return {
    host,
    protocol,
    context: hostContext,
    orgSlug,
    isHub,
    isOrgApp,
    isMemberHost,
    isLocal: local,
    ready: host.length > 0,
    orgAppHref,
    hubHref,
    goToOrg,
    goToHub,
  }
}
