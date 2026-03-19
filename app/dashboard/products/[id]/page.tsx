"use client"

import { use, useState, useRef, useCallback, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import {
  ArrowLeft,
  Plus,
  Send,
  BookOpen,
  FileText,
  Trash2,
  FileSpreadsheet,
  Presentation,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCoachAccessGuard } from "@/hooks/use-access-guard"
import { useAuth } from "@/hooks/use-auth"
import {
  type ProductWithDetails,
  type DeliveryMode,
  updateProduct,
} from "@/lib/services/products"
import { toast } from "sonner"
import { ProductContentPicker } from "@/components/dashboard/products/product-content-picker"
import { SortableModuleCard } from "@/components/dashboard/products/product-module-card"
import {
  useAddProductLesson,
  useCreateProductModule,
  useDeleteDraftProduct,
  useDeleteProductModule,
  useProductDetails,
  useRemoveProductLesson,
  useReorderLessons,
  useReorderModules,
  useUpdateProductDetails,
  useUpdateProductLesson,
  useUpdateProductModule,
  useUpsertCoachingDetails,
} from "@/hooks/use-product-editor"

export default function ProductEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { supabase } = useAuth()
  const { canAccess, guardContent, currentOrganization } = useCoachAccessGuard({
    requireOrg: true,
    requireStripe: true,
    noOrgMessage: "Select an organization to edit products.",
    stripeDescription:
      "To edit products, you need to complete Stripe Connect onboarding for this organization.",
  })
  const productId = Number(id)
  const [expandedModules, setExpandedModules] = useState<number[]>([])
  const [contentPickerModuleId, setContentPickerModuleId] = useState<number | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteModuleId, setDeleteModuleId] = useState<number | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const { product, isLoading, error } = useProductDetails(
    productId,
    !!currentOrganization?.id && !Number.isNaN(productId) && productId > 0
  )

  const updateProductMutation = useUpdateProductDetails(currentOrganization?.id ?? null, productId)

  const createModuleMutation = useCreateProductModule(productId)

  const updateModuleMutation = useUpdateProductModule(productId)

  const addItemMutation = useAddProductLesson(productId)

  const removeItemMutation = useRemoveProductLesson(productId)

  const updateModuleItemMutation = useUpdateProductLesson(productId)

  const coachingMutation = useUpsertCoachingDetails(productId)

  const deleteProductMutation = useDeleteDraftProduct(currentOrganization?.id ?? null, productId)

  const deleteModuleMutation = useDeleteProductModule(productId)

  const reorderModulesMutation = useReorderModules(productId)

  const reorderLessonsMutation = useReorderLessons(productId)

  const modules = product?.product_modules ?? []

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleModuleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over == null || active.id === over.id) return
      const moduleIds = modules.map((m) => m.id)
      const oldIndex = moduleIds.indexOf(Number(active.id))
      const newIndex = moduleIds.indexOf(Number(over.id))
      if (oldIndex === -1 || newIndex === -1) return
      const newOrder = arrayMove(moduleIds, oldIndex, newIndex)
      reorderModulesMutation.mutate(
        newOrder.map((moduleId, position) => ({ moduleId, position }))
      )
    },
    [modules, reorderModulesMutation]
  )

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !product) return
    const formData = new FormData()
    formData.append("file", file)
    try {
      formData.append("product_id", String(productId))
      const res = await fetch(`/api/products/upload-cover`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Upload failed")
      }
      const { url } = await res.json()
      await updateProduct(supabase, productId, { cover_image_url: url })
      queryClient.invalidateQueries({ queryKey: ["product", productId] })
      toast.success("Cover updated")
    } catch (err) {
      toast.error((err as Error).message)
    }
    e.target.value = ""
  }

  if (!canAccess && guardContent) {
    return (
      <div className="p-4 lg:p-8">
        {guardContent}
      </div>
    )
  }

  if (isLoading || product === undefined) {
    return (
      <div className="p-4 lg:p-8">
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="p-4 lg:p-8">
        <p className="text-sm text-muted-foreground">
          Product not found or you don’t have access.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/dashboard/products">Back to products</Link>
        </Button>
      </div>
    )
  }

  const toggleModule = (moduleId: number) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((i) => i !== moduleId) : [...prev, moduleId]
    )
  }

  const defaultTab = product.type === "coaching" ? "coaching" : "course"

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/dashboard/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">
              {product.title}
            </h1>
            <p className="text-sm text-muted-foreground capitalize">
              {product.type} · {product.status}
            </p>
          </div>
        </div>
        {product.status === "draft" && (
          <Button
            size="sm"
            className="gap-2"
            onClick={() => updateProductMutation.mutate({ status: "published" })}
            disabled={updateProductMutation.isPending}
          >
            <Send className="h-3.5 w-3.5" />
            {updateProductMutation.isPending ? "Publishing…" : "Publish"}
          </Button>
        )}
      </div>

      <Tabs defaultValue={defaultTab} className="mt-8">
        <TabsList>
          {product.type === "course" && (
            <TabsTrigger value="course">Course</TabsTrigger>
          )}
          {product.type === "coaching" && (
            <TabsTrigger value="coaching">Coaching</TabsTrigger>
          )}
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {product.type === "course" && (
          <TabsContent value="course" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Curriculum
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => createModuleMutation.mutate("New module")}
                  disabled={createModuleMutation.isPending}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add module
                </Button>
              </div>

              {modules.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No modules yet. Add a module to start building your
                  curriculum.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  onDragEnd={handleModuleDragEnd}
                >
                  <SortableContext
                    items={modules.map((m) => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {modules.map((mod) => (
                      <SortableModuleCard
                        key={mod.id}
                        module={mod}
                        isExpanded={expandedModules.includes(mod.id)}
                        onToggle={() => toggleModule(mod.id)}
                        onAddLesson={() => setContentPickerModuleId(mod.id)}
                        onRemoveLesson={(itemId) =>
                          removeItemMutation.mutate(itemId)
                        }
                        onDeleteModule={() => setDeleteModuleId(mod.id)}
                        onUpdateModuleTitle={(moduleId, title) =>
                          updateModuleMutation.mutate({ moduleId, title })
                        }
                        onUpdateLessonTitle={(itemId, title) =>
                          updateModuleItemMutation.mutate({ itemId, title })
                        }
                        onReorderLessons={(moduleId, updates) =>
                          reorderLessonsMutation.mutate({ moduleId, updates })
                        }
                        removePending={removeItemMutation.isPending}
                        updateModulePending={updateModuleMutation.isPending}
                        updateLessonPending={updateModuleItemMutation.isPending}
                        deleteModulePending={deleteModuleMutation.isPending}
                        reorderLessonsPending={reorderLessonsMutation.isPending}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </TabsContent>
        )}

        {product.type === "coaching" && (
          <TabsContent value="coaching" className="mt-6">
            <CoachingTab
              product={product}
              onSaveCoaching={(input) => coachingMutation.mutate(input)}
              savePending={coachingMutation.isPending}
            />
          </TabsContent>
        )}

        <TabsContent value="details" className="mt-6">
          <DetailsTab
            product={product}
            onSaveDetails={(input) => updateProductMutation.mutate(input)}
            onCoverUpload={handleCoverUpload}
            coverInputRef={coverInputRef}
            savePending={updateProductMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="max-w-2xl space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Archive product
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Archived products are hidden from new offers but keep their existing
                    enrollments and content.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateProductMutation.mutate({ status: "archived" })}
                  disabled={
                    updateProductMutation.isPending || product.status === "archived"
                  }
                >
                  {product.status === "archived" ? "Archived" : "Archive"}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Delete product
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Only draft products can be deleted. This permanently removes this
                    product and all its data (modules, lessons, coaching details).
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={deleteProductMutation.isPending || product.status !== "draft"}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ProductContentPicker
        open={contentPickerModuleId !== null}
        onClose={() => setContentPickerModuleId(null)}
        onSelect={(contentItemId, title) => {
          if (contentPickerModuleId)
            addItemMutation.mutate(
              {
                moduleId: contentPickerModuleId,
                contentItemId,
                title,
              },
              { onSettled: () => setContentPickerModuleId(null) }
            )
        }}
        addPending={addItemMutation.isPending}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{product.title}&quot;? This
              will remove all modules, lessons, and coaching details. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteProductMutation.mutate(undefined, {
                  onSuccess: () => router.push("/dashboard/products"),
                })
              }
              disabled={deleteProductMutation.isPending}
            >
              {deleteProductMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteModuleId !== null}
        onOpenChange={(open) => !open && setDeleteModuleId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete module</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {modules.find((m) => m.id === deleteModuleId)?.title ?? "this module"}
              &quot;? This will remove the module and all its lessons (
              {modules.find((m) => m.id === deleteModuleId)?.product_module_items?.length ?? 0}{" "}
              lesson
              {(modules.find((m) => m.id === deleteModuleId)?.product_module_items?.length ?? 0) !== 1 ? "s" : ""}
              ). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteModuleId !== null && deleteModuleMutation.mutate(deleteModuleId)
              }
              disabled={deleteModuleMutation.isPending}
            >
              {deleteModuleMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DetailsTab({
  product,
  onSaveDetails,
  onCoverUpload,
  coverInputRef,
  savePending,
}: {
  product: ProductWithDetails
  onSaveDetails: (input: {
    title?: string
    description?: string | null
    status?: "draft" | "published" | "archived"
  }) => void
  onCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  coverInputRef: React.RefObject<HTMLInputElement | null>
  savePending: boolean
}) {
  const [title, setTitle] = useState(product.title)
  const [description, setDescription] = useState(product.description ?? "")
  const [status, setStatus] = useState(product.status)

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault()
    onSaveDetails({ title, description: description || null, status })
  }

  return (
    <div className="max-w-2xl space-y-8">
      <form onSubmit={handleSaveDetails} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="details-title">Product name</Label>
          <Input
            id="details-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="details-desc">Description</Label>
          <Textarea
            id="details-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Input
            value={product.type}
            disabled
            className="capitalize bg-muted"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="details-status">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as "draft" | "published" | "archived")}
          >
            <SelectTrigger id="details-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Cover image</Label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onCoverUpload}
          />
          <div
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-10 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => coverInputRef.current?.click()}
          >
            {product.cover_image_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.cover_image_url}
                  alt="Cover"
                  className="max-h-40 rounded-lg object-cover"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Click to change
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-muted-foreground">
                  Drop image here or click to upload
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG up to 5MB
                </p>
              </>
            )}
          </div>
        </div>
        <Button type="submit" disabled={savePending}>
          {savePending ? "Saving…" : "Save details"}
        </Button>
      </form>
    </div>
  )
}

function CoachingTab({
  product,
  onSaveCoaching,
  savePending,
}: {
  product: ProductWithDetails
  onSaveCoaching: (input: {
    sessions_count: number
    period_months: number | null
    delivery_mode: DeliveryMode | null
  }) => void
  savePending: boolean
}) {
  const [sessionsCount, setSessionsCount] = useState(
    product.product_coaching?.sessions_count ?? 0
  )
  const [periodMonths, setPeriodMonths] = useState<string>(
    product.product_coaching?.period_months != null
      ? String(product.product_coaching.period_months)
      : ""
  )
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode | "">(
    product.product_coaching?.delivery_mode ?? ""
  )

  useEffect(() => {
    setSessionsCount(product.product_coaching?.sessions_count ?? 0)
    setPeriodMonths(
      product.product_coaching?.period_months != null
        ? String(product.product_coaching.period_months)
        : ""
    )
    setDeliveryMode(product.product_coaching?.delivery_mode ?? "")
  }, [product.product_coaching])

  const handleSaveCoaching = (e: React.FormEvent) => {
    e.preventDefault()
    onSaveCoaching({
      sessions_count: sessionsCount,
      period_months: periodMonths === "" ? null : parseInt(periodMonths, 10) || null,
      delivery_mode: deliveryMode || null,
    })
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSaveCoaching} className="space-y-6">
        <h3 className="text-sm font-semibold text-foreground">
          Coaching details
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="coaching-sessions">Number of sessions</Label>
            <Input
              id="coaching-sessions"
              type="number"
              min={0}
              value={sessionsCount}
              onChange={(e) =>
                setSessionsCount(parseInt(e.target.value, 10) || 0)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coaching-period">Duration (months)</Label>
            <Input
              id="coaching-period"
              type="number"
              min={0}
              placeholder="e.g. 3"
              value={periodMonths}
              onChange={(e) => setPeriodMonths(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="coaching-delivery">Delivery mode</Label>
          <Select
            value={deliveryMode}
            onValueChange={(v) => setDeliveryMode(v as DeliveryMode | "")}
          >
            <SelectTrigger id="coaching-delivery">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="in_person">In person</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={savePending}>
          {savePending ? "Saving…" : "Save coaching details"}
        </Button>
      </form>
    </div>
  )
}
