"use client"

import { useState } from "react"
import { Search, Plus, MoreHorizontal, Mail, Phone, ArrowRight, Target, CircleDot, CheckCircle2, XCircle } from "lucide-react"
import { leads } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Stage = "new" | "contacted" | "qualified" | "closed"

const stageConfig: Record<Stage, { label: string; color: string; bgColor: string; icon: typeof Target }> = {
  new: { label: "New", color: "text-primary", bgColor: "bg-primary/5 border-primary/20", icon: CircleDot },
  contacted: { label: "Contacted", color: "text-warning", bgColor: "bg-warning/5 border-warning/20", icon: Phone },
  qualified: { label: "Qualified", color: "text-accent", bgColor: "bg-accent/5 border-accent/20", icon: Target },
  closed: { label: "Closed", color: "text-success", bgColor: "bg-success/5 border-success/20", icon: CheckCircle2 },
}

const stages: Stage[] = ["new", "contacted", "qualified", "closed"]

export default function LeadsPage() {
  const [search, setSearch] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)

  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase())
  )

  const groupedByStage = stages.reduce<Record<Stage, typeof leads>>((acc, stage) => {
    acc[stage] = filtered.filter((l) => l.stage === stage)
    return acc
  }, {} as Record<Stage, typeof leads>)

  const pipelineValue = filtered.reduce((sum, l) => sum + l.value, 0)

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Leads Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} leads in pipeline - ${pipelineValue.toLocaleString()} total value
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Add New Lead</DialogTitle>
              <DialogDescription>Enter lead contact information</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsAddOpen(false) }}>
              <div>
                <Label htmlFor="lead-name">Name</Label>
                <Input id="lead-name" placeholder="Full name" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="lead-email">Email</Label>
                <Input id="lead-email" type="email" placeholder="email@example.com" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="lead-source">Source</Label>
                <Input id="lead-source" placeholder="e.g. Instagram, Website, Referral" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="lead-value">Estimated Value ($)</Label>
                <Input id="lead-value" type="number" placeholder="0" className="mt-1.5" />
              </div>
              <Button type="submit" className="w-full">Add Lead</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Kanban Board */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stages.map((stage) => {
          const config = stageConfig[stage]
          const stageLeads = groupedByStage[stage]
          const stageValue = stageLeads.reduce((sum, l) => sum + l.value, 0)

          return (
            <div key={stage} className={cn("rounded-xl border p-4", config.bgColor)}>
              {/* Column Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <config.icon className={cn("h-4 w-4", config.color)} />
                  <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{stageLeads.length}</Badge>
                </div>
                <p className="text-xs font-medium text-muted-foreground">${stageValue.toLocaleString()}</p>
              </div>

              {/* Lead Cards */}
              <div className="space-y-2">
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-lg border border-border bg-card p-3 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{lead.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            Send email
                          </DropdownMenuItem>
                          {stage !== "closed" && (
                            <DropdownMenuItem>
                              <ArrowRight className="mr-2 h-4 w-4" />
                              Move to {stageConfig[stages[stages.indexOf(stage) + 1]]?.label}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <XCircle className="mr-2 h-4 w-4" />
                            Remove lead
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">{lead.source}</Badge>
                      <span className="text-xs font-semibold text-foreground">${lead.value}</span>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                ))}

                {stageLeads.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <p className="text-xs text-muted-foreground">No leads in this stage</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
