"use client"

import { useEffect, useState } from "react"
import {
  Check,
  ChevronDown,
  Copy,
  Loader2,
  Mail,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { SectionCard } from "@/components/dashboard/section-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { EmptyState } from "@/components/dashboard/empty-state"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  useCreateSendingDomain,
  useDeleteSendingDomain,
  useRefreshSendingDomain,
  useSendingDomain,
  useVerifySendingDomain,
} from "@/hooks/use-sending-domain"
import type { SendingDomainDnsRecord } from "@/schemas/sending-domain.schema"
import { cn } from "@/lib/utils"

const statusConfigs = {
  verified: { label: "Ready", variant: "success" as const },
  pending: { label: "Waiting", variant: "warning" as const },
  not_started: { label: "Waiting", variant: "warning" as const },
  temporary_failure: { label: "Needs a check", variant: "warning" as const },
  failed: { label: "Failed", variant: "destructive" as const },
}

const VERIFY_COOLDOWN_SECONDS = 20

function middleTruncate(value: string, maxChars = 36): string {
  if (value.length <= maxChars) return value
  const marker = " [...] "
  const side = Math.max(6, Math.floor((maxChars - marker.length) / 2))
  return `${value.slice(0, side)}${marker}${value.slice(-side)}`
}

function formatDnsRecordsPlain(records: SendingDomainDnsRecord[]): string {
  return records
    .map((record) => {
      const ttl = record.ttl ?? "Auto"
      const priority =
        record.priority != null ? ` | Priority: ${String(record.priority)}` : ""
      return `Type: ${record.type} | Name: ${record.name} | Value: ${record.value} | TTL: ${ttl}${priority}`
    })
    .join("\n")
}

function formatDnsAiPrompt(
  domainName: string,
  records: SendingDomainDnsRecord[]
): string {
  return [
    `I need to add DNS records so I can send email from ${domainName}.`,
    "Walk me through adding each record at my DNS provider (Cloudflare, OVH, Namecheap, etc.).",
    "For CNAME records on Cloudflare, set Proxy status to DNS only (gray cloud), not Proxied.",
    "Some providers auto-append the root domain: if that happens, use only the subdomain part of the Name.",
    "",
    "Records to add:",
    formatDnsRecordsPlain(records),
  ].join("\n")
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

function DnsCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await copyText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={() => {
        void handleCopy()
      }}
      title="Copy"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  )
}

function TruncatedMono({ value, className }: { value: string; className?: string }) {
  const display = middleTruncate(value)
  return (
    <span
      className={cn("font-mono text-xs text-foreground", className)}
      title={value}
    >
      {display}
    </span>
  )
}

function DnsRecordsTable({
  domainName,
  records,
}: {
  domainName: string
  records: SendingDomainDnsRecord[]
}) {
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">No DNS records yet.</p>
  }

  async function onCopyRecords() {
    await copyText(formatDnsRecordsPlain(records))
    toast.success("DNS records copied.")
  }

  async function onCopyAiPrompt() {
    await copyText(formatDnsAiPrompt(domainName, records))
    toast.success("AI prompt copied.")
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">DNS records</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <Copy className="h-3.5 w-3.5" />
              Copy
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                void onCopyRecords()
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy DNS records
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void onCopyAiPrompt()
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Copy AI setup prompt
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SectionCard noPadding>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Type
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Value
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={`${record.type}-${record.name}-${record.value}`}
                className="hover:bg-accent/60"
              >
                <td className="px-4 py-3 align-middle font-medium tabular-nums">
                  {record.type}
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex min-w-0 items-center gap-1">
                    <TruncatedMono value={record.name} className="min-w-0" />
                    <DnsCopyButton text={record.name} />
                  </div>
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex min-w-0 items-center gap-1">
                    <TruncatedMono value={record.value} className="min-w-0" />
                    <DnsCopyButton text={record.value} />
                  </div>
                </td>
                <td className="px-4 py-3 align-middle">
                  {record.status ? (
                    <StatusBadge status={record.status} configs={statusConfigs} />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  )
}

export function SendingDomainPanel({
  organizationId,
  canEdit,
}: {
  organizationId: number
  canEdit: boolean
}) {
  const { domain, isLoading } = useSendingDomain(organizationId)
  const createDomain = useCreateSendingDomain(organizationId)
  const verifyDomain = useVerifySendingDomain(organizationId)
  const refreshDomain = useRefreshSendingDomain(organizationId)
  const deleteDomain = useDeleteSendingDomain(organizationId)
  const [domainName, setDomainName] = useState("")
  const [verifyCooldown, setVerifyCooldown] = useState(0)

  useEffect(() => {
    if (verifyCooldown <= 0) return
    const timeoutId = window.setTimeout(() => {
      setVerifyCooldown((seconds) => (seconds <= 1 ? 0 : seconds - 1))
    }, 1000)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [verifyCooldown])

  useEffect(() => {
    if (domain?.status === "verified") {
      setVerifyCooldown(0)
    }
  }, [domain?.status])

  async function onCreate() {
    try {
      await createDomain.mutateAsync({
        domain_name: domainName,
        region: "eu-west-1",
      })
      setDomainName("")
      toast.success("Domain added. Copy the DNS records below.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create domain")
    }
  }

  async function onVerify() {
    setVerifyCooldown(VERIFY_COOLDOWN_SECONDS)
    try {
      const next = await verifyDomain.mutateAsync()
      if (next?.status === "verified") {
        setVerifyCooldown(0)
        toast.success("Domain ready.")
      } else {
        toast.message("Checking your DNS. This can take a few minutes.")
      }
    } catch (error) {
      setVerifyCooldown(0)
      toast.error(error instanceof Error ? error.message : "Could not check DNS")
    }
  }

  async function onRefresh() {
    try {
      const next = await refreshDomain.mutateAsync()
      if (next?.status === "verified") {
        toast.success("Domain ready.")
      } else {
        toast.message("Still waiting on DNS. Try again in a minute.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh")
    }
  }

  async function onDelete() {
    try {
      await deleteDomain.mutateAsync()
      toast.success("Sending domain removed.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove domain")
    }
  }

  if (isLoading) {
    return (
      <SectionCard title="Sending domain">
        <LoadingRows count={3} />
      </SectionCard>
    )
  }

  if (!domain) {
    return (
      <SectionCard
        title="Sending domain"
        subtitle="Use your own domain when you email clients."
      >
        {!canEdit ? (
          <EmptyState title="No sending domain" description="Ask an admin to connect one." />
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sending-domain">Domain</Label>
              <Input
                id="sending-domain"
                placeholder="mail.yourdomain.com"
                value={domainName}
                onChange={(event) => setDomainName(event.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Use a subdomain like mail.yourdomain.com (safer than your main domain).
              </p>
            </div>
            <Button
              className="gap-2"
              onClick={() => {
                void onCreate()
              }}
              disabled={createDomain.isPending || domainName.trim().length < 3}
            >
              {createDomain.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Continue
                </>
              )}
            </Button>
          </div>
        )}
      </SectionCard>
    )
  }

  const busy =
    verifyDomain.isPending || refreshDomain.isPending || deleteDomain.isPending
  const isReady = domain.status === "verified"
  const recordCount = domain.dns_records.length

  return (
    <div className="space-y-4">
      <SectionCard
        title="Sending domain"
        subtitle={
          isReady
            ? `You can send from addresses like hello@${domain.domain_name}.`
            : recordCount > 0
              ? `Add these ${recordCount} lines where your domain is managed (Cloudflare, OVH, Ionos…). Copy them, paste them, then confirm. Checking can take a few minutes.`
              : "Add these lines where your domain is managed (Cloudflare, OVH, Ionos…). Copy them, paste them, then confirm. Checking can take a few minutes."
        }
        action={
          canEdit && isReady ? (
            <Button
              className="gap-2"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                void onDelete()
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{domain.domain_name}</p>
            <StatusBadge status={domain.status} configs={statusConfigs} />
          </div>
          {canEdit && !isReady ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="gap-2 tabular-nums"
                disabled={busy || verifyCooldown > 0}
                onClick={() => {
                  void onVerify()
                }}
              >
                {verifyDomain.isPending || verifyCooldown > 0 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {verifyCooldown > 0
                  ? `Checking… ${verifyCooldown}s`
                  : verifyDomain.isPending
                    ? "Checking…"
                    : "I've added the records"}
              </Button>
              <button
                type="button"
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                onClick={() => {
                  void onRefresh()
                }}
              >
                {refreshDomain.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Not ready yet? Refresh
              </button>
              <Button
                className="gap-2 ml-auto"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  void onDelete()
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <DnsRecordsTable
        domainName={domain.domain_name}
        records={domain.dns_records}
      />
    </div>
  )
}
