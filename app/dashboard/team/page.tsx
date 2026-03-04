"use client"

import { UserPlus, MoreHorizontal, Crown, Shield, Megaphone, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { teamMembers } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const roleIcons: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  sales: DollarSign,
  ambassador: Megaphone,
}

const roleColors: Record<string, string> = {
  owner: "bg-warning/10 text-warning-foreground",
  admin: "bg-primary/10 text-primary",
  sales: "bg-success/10 text-success",
  ambassador: "bg-accent/10 text-accent",
}

export default function TeamPage() {
  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">{teamMembers.length} members</p>
        </div>
      </div>

      {/* Invite form */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">Invite team member</h3>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 space-y-1">
            <Label htmlFor="inviteEmail" className="sr-only">Email</Label>
            <Input id="inviteEmail" placeholder="teammate@example.com" type="email" />
          </div>
          <Select defaultValue="sales">
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="ambassador">Ambassador</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        </div>
      </div>

      {/* Team list */}
      <div className="mt-6 space-y-3">
        {teamMembers.map((member) => {
          const RoleIcon = roleIcons[member.role]
          return (
            <div key={member.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">{member.avatar}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{member.name}</span>
                  {member.role === "owner" && <Crown className="h-3.5 w-3.5 text-warning" />}
                </div>
                <p className="text-xs text-muted-foreground">{member.email}</p>
              </div>
              <Badge className={cn("text-xs capitalize gap-1.5", roleColors[member.role])}>
                <RoleIcon className="h-3 w-3" />
                {member.role}
              </Badge>
              <span className="hidden text-xs text-muted-foreground sm:block">
                Joined {new Date(member.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
              {member.role !== "owner" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Change role</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
