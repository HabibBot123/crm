"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, BookOpen, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useStripeConnectGuard } from "@/hooks/use-stripe-connect-guard"
import { useAuth } from "@/hooks/use-auth"
import { createProduct, type ProductType } from "@/lib/services/products"
import { toast } from "sonner"

export default function NewProductPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { supabase } = useAuth()
  const { canAccess, guardContent, currentOrganization } = useStripeConnectGuard({
    noOrgMessage: "Select an organization to create products.",
    stripeDescription:
      "To create products, you need to complete Stripe Connect onboarding for this organization.",
  })
  const [step, setStep] = useState<1 | 2>(1)
  const [type, setType] = useState<ProductType | null>(null)
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")

  const createMutation = useMutation({
    mutationFn: () =>
      createProduct(supabase, {
        organization_id: currentOrganization!.id,
        type: type!,
        title: title.trim(),
        slug: slug.trim() || null,
        description: description.trim() || null,
        status: "draft",
      }),
    onSuccess: (product) => {
      queryClient.invalidateQueries({
        queryKey: ["products", currentOrganization?.id],
      })
      toast.success("Product created")
      router.push(`/dashboard/products/${product.id}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }
    if (!type) return
    createMutation.mutate()
  }

  if (!canAccess && guardContent) {
    return (
      <div className="p-4 lg:p-8">
        {guardContent}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href="/dashboard/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold text-foreground font-display">
        New product
      </h1>

      {step === 1 ? (
        <div className="mt-8 max-w-2xl">
          <p className="text-sm text-muted-foreground mb-6">
            Choose the type of product you want to create.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setType("content")
                setStep(2)
              }}
              className="flex flex-col items-start gap-3 rounded-xl border-2 border-border bg-card p-6 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Content (course / ebook)
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Modules and lessons built from your uploaded content (videos,
                  PDFs, etc.).
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setType("coaching")
                setStep(2)
              }}
              className="flex flex-col items-start gap-3 rounded-xl border-2 border-border bg-card p-6 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Coaching (1:1 sessions)
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  A coaching package with a set number of 1:1 sessions over a
                  period.
                </p>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-6">
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
            Type: <span className="capitalize font-medium text-foreground">{type}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Product name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (!slug && step === 2)
                  setSlug(
                    e.target.value
                      .trim()
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                      .replace(/[^a-z0-9-]/g, "")
                  )
              }}
              placeholder="e.g. Complete Fitness Program"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (optional)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. complete-fitness-program"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the product"
              rows={4}
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create product"}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
