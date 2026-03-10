"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, MoreHorizontal, Pencil, Trash2, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { useStripeConnectGuard } from "@/hooks/use-stripe-connect-guard"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchProductsByOrganization,
  updateProduct,
  deleteProduct,
  type Product,
} from "@/lib/services/products"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const statusStyles: Record<string, string> = {
  published: "bg-success/10 text-success",
  draft: "bg-warning/10 text-warning-foreground",
  archived: "bg-muted text-muted-foreground",
}

export default function ProductsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { supabase } = useAuth()
  const {
    canAccess,
    isLoading: orgLoading,
    guardContent,
    currentOrganization,
  } = useStripeConnectGuard({
    noOrgMessage: "Select an organization to view products.",
    stripeDescription:
      "To create and sell products, you need to complete Stripe Connect onboarding for this organization.",
    stripeUseRouter: true,
  })
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products", currentOrganization?.id],
    queryFn: () =>
      fetchProductsByOrganization(supabase, currentOrganization!.id),
    enabled: !!currentOrganization?.id,
  })

  useEffect(() => {
    if (error) toast.error((error as Error).message)
  }, [error])

  const archiveMutation = useMutation({
    mutationFn: ({ productId }: { productId: number }) =>
      updateProduct(supabase, productId, { status: "archived" }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["products", currentOrganization?.id],
      })
      toast.success("Product archived")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (productId: number) => deleteProduct(supabase, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["products", currentOrganization?.id],
      })
      setDeleteTarget(null)
      toast.success("Product deleted")
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setDeleteTarget(null)
    },
  })

  if (!canAccess && guardContent) {
    return (
      <div className="p-4 lg:p-8">
        {guardContent}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Products
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length} product{products.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/dashboard/products/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New product
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="aspect-[16/9] bg-muted animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-muted rounded w-1/3 animate-pulse" />
                <div className="h-4 bg-muted rounded w-full animate-pulse" />
                <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 px-6">
          <p className="text-sm text-muted-foreground text-center">
            No products yet. Create your first product to get started.
          </p>
          <Button className="mt-4 gap-2" asChild>
            <Link href="/dashboard/products/new">
              <Plus className="h-4 w-4" />
              Create your first product
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="aspect-[16/9] bg-muted relative">
                {product.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.cover_image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <span className="text-2xl font-bold opacity-20">
                      {product.type.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute right-3 top-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/dashboard/products/${product.id}`}
                          className="gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      {product.status !== "archived" && (
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() =>
                            archiveMutation.mutate({ productId: product.id })
                          }
                          disabled={archiveMutation.isPending}
                        >
                          <Archive className="h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="gap-2 text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "text-xs capitalize",
                      statusStyles[product.status]
                    )}
                  >
                    {product.status}
                  </Badge>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {product.type}
                  </Badge>
                </div>
                <Link href={`/dashboard/products/${product.id}`}>
                  <h3 className="mt-3 text-sm font-semibold text-foreground hover:text-primary transition-colors">
                    {product.title}
                  </h3>
                </Link>
                <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                  {product.description || "No description"}
                </p>
              </div>
            </div>
          ))}

          <Link
            href="/dashboard/products/new"
            className="flex aspect-auto min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border bg-card transition-colors hover:border-primary/30 hover:bg-primary/5"
          >
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">Add new product</span>
            </div>
          </Link>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;?
              This will remove all modules and content links. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
