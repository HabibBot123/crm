"use client"

import { useState } from "react"
import { Upload, ExternalLink, CreditCard, Palette, Globe, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const colors = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
]

export default function SettingsPage() {
  const [selectedColor, setSelectedColor] = useState(colors[0])

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-bold text-foreground font-display">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your workspace settings</p>

      <Tabs defaultValue="branding" className="mt-8">
        <TabsList>
          <TabsTrigger value="branding" className="gap-2"><Palette className="h-4 w-4" /> Branding</TabsTrigger>
          <TabsTrigger value="domain" className="gap-2"><Globe className="h-4 w-4" /> Domain</TabsTrigger>
          <TabsTrigger value="payments" className="gap-2"><CreditCard className="h-4 w-4" /> Payments</TabsTrigger>
        </TabsList>

        {/* Branding */}
        <TabsContent value="branding" className="mt-6">
          <div className="max-w-2xl space-y-8">
            {/* Logo */}
            <div className="space-y-3">
              <Label>Logo</Label>
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-border bg-muted text-xl font-bold text-muted-foreground">
                  FP
                </div>
                <div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload logo
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">PNG, SVG. Max 2MB. Square recommended.</p>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <Label>Primary color</Label>
              <div className="flex flex-wrap gap-3">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "h-10 w-10 rounded-lg border-2 transition-all",
                      selectedColor === color ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Input value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="w-32 font-mono" />
                <div className="h-10 w-10 rounded-lg border border-border" style={{ backgroundColor: selectedColor }} />
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-3">
              <Label>Preview</Label>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-primary-foreground" style={{ backgroundColor: selectedColor }}>FP</div>
                  <span className="font-bold text-foreground">FitPro Academy</span>
                </div>
                <div className="h-8 rounded-lg" style={{ backgroundColor: selectedColor }} />
                <p className="mt-3 text-xs text-muted-foreground">This is how your brand color will appear to your clients.</p>
              </div>
            </div>

            <Button>Save branding</Button>
          </div>
        </TabsContent>

        {/* Domain */}
        <TabsContent value="domain" className="mt-6">
          <div className="max-w-2xl space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Current domain</h3>
                  <p className="mt-1 text-sm text-primary">fitpro.coachpro.io</p>
                </div>
                <Badge variant="secondary" className="text-xs">Default</Badge>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Custom domain</h3>
              <p className="text-xs text-muted-foreground">Connect your own domain for a fully branded experience.</p>
              <div className="flex gap-3">
                <Input placeholder="academy.yourwebsite.com" className="flex-1" />
                <Button variant="outline">Verify</Button>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">DNS Configuration</p>
                <div className="grid grid-cols-3 gap-2">
                  <span>Type</span><span>Name</span><span>Value</span>
                  <span className="font-mono">CNAME</span>
                  <span className="font-mono">academy</span>
                  <span className="font-mono text-primary">cname.coachpro.io</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="mt-6">
          <div className="max-w-2xl space-y-6">
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CreditCard className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Connect Stripe</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                Connect your Stripe account to start accepting payments and managing subscriptions.
              </p>
              <Button className="mt-6 gap-2">
                <ExternalLink className="h-4 w-4" />
                Connect Stripe
              </Button>
              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Secure</span>
                <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> PCI compliant</span>
                <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Instant payouts</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
