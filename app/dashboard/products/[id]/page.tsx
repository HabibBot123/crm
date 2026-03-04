"use client"

import { use, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, GripVertical, Plus, Play, BookOpen, FileText,
  Trash2, ChevronDown, ChevronRight, Settings, Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { products } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function ProductEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const product = products.find((p) => p.id === id) || products[0]
  const [expandedModules, setExpandedModules] = useState<string[]>(product.modules.map(m => m.id))

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    )
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/products">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">{product.title}</h1>
            <p className="text-sm text-muted-foreground capitalize">{product.type} &middot; {product.status}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button size="sm">Save changes</Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="content" className="mt-8">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Content Builder */}
        <TabsContent value="content" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Curriculum</h2>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="h-3.5 w-3.5" />
                  Add module
                </Button>
              </div>

              {product.modules.map((mod) => {
                const isExpanded = expandedModules.includes(mod.id)
                return (
                  <div key={mod.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    <button
                      onClick={() => toggleModule(mod.id)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <span className="flex-1 text-sm font-semibold text-foreground">{mod.title}</span>
                      <Badge variant="secondary" className="text-xs">{mod.lessons.length} lessons</Badge>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border">
                        {mod.lessons.map((lesson) => (
                          <div key={lesson.id} className="flex items-center gap-3 border-b border-border last:border-0 px-4 py-3 hover:bg-muted/20 transition-colors">
                            <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                              {lesson.type === "video" && <Play className="h-3.5 w-3.5 text-muted-foreground" />}
                              {lesson.type === "ebook" && <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />}
                              {lesson.type === "text" && <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                            <div className="flex-1">
                              <span className="text-sm text-foreground">{lesson.title}</span>
                              {lesson.duration && <span className="ml-2 text-xs text-muted-foreground">{lesson.duration}</span>}
                            </div>
                            <Badge variant="secondary" className="text-xs capitalize">{lesson.type}</Badge>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <div className="px-4 py-3">
                          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                            <Plus className="h-3.5 w-3.5" />
                            Add lesson
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Preview panel */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Preview</h3>
              <div className="mt-4 space-y-3">
                <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                  <Play className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">{product.title}</p>
                  <p className="text-xs text-muted-foreground">{product.modules.length} modules &middot; {product.modules.reduce((acc, m) => acc + m.lessons.length, 0)} lessons</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Students enrolled</p>
                  <p className="text-lg font-bold text-foreground font-display">{product.studentsCount}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-6">
          <div className="max-w-2xl space-y-6">
            <div className="space-y-2">
              <Label>Product name</Label>
              <Input defaultValue={product.title} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea defaultValue={product.description} rows={4} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select defaultValue={product.type}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course">Course</SelectItem>
                    <SelectItem value="ebook">Ebook</SelectItem>
                    <SelectItem value="coaching">Coaching Program</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select defaultValue={product.status}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cover image</Label>
              <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-10">
                <div className="text-center text-muted-foreground">
                  <p className="text-sm font-medium">Drop image here or click to upload</p>
                  <p className="mt-1 text-xs">PNG, JPG up to 5MB</p>
                </div>
              </div>
            </div>
            <Button>Save details</Button>
          </div>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="mt-6">
          <div className="max-w-2xl space-y-6">
            <div className="space-y-2">
              <Label>Pricing model</Label>
              <Select defaultValue={product.pricingType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-time">One-time payment</SelectItem>
                  <SelectItem value="monthly">Monthly subscription</SelectItem>
                  <SelectItem value="yearly">Yearly subscription</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input type="number" defaultValue={product.price} />
              </div>
              <div className="space-y-2">
                <Label>Compare at price</Label>
                <Input type="number" placeholder="497" />
              </div>
            </div>
            <div className="rounded-xl border border-border p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Coupon</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Coupon code</Label>
                  <Input placeholder="e.g. LAUNCH20" />
                </div>
                <div className="space-y-2">
                  <Label>Discount (%)</Label>
                  <Input type="number" placeholder="20" />
                </div>
              </div>
            </div>
            <Button>Save pricing</Button>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between rounded-xl border border-border p-5">
              <div>
                <p className="text-sm font-medium text-foreground">Enrollment open</p>
                <p className="text-xs text-muted-foreground">Allow new students to enroll</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-5">
              <div>
                <p className="text-sm font-medium text-foreground">Certificate on completion</p>
                <p className="text-xs text-muted-foreground">Auto-generate completion certificates</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-5">
              <div>
                <p className="text-sm font-medium text-foreground">Drip content</p>
                <p className="text-xs text-muted-foreground">Release lessons on a schedule</p>
              </div>
              <Switch />
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-destructive">Delete product</p>
                  <p className="text-xs text-muted-foreground">Permanently remove this product and all its data</p>
                </div>
                <Button variant="destructive" size="sm">Delete</Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
