"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { PaginationSummary } from "@/components/dashboard/pagination-summary"
import { useCoachAccessGuard } from "@/hooks/use-access-guard"
import { PageHeader } from "@/components/dashboard/page-header"
import { LoadingRows } from "@/components/dashboard/loading-rows"
import { EmptyState } from "@/components/dashboard/empty-state"
import { RichListItem } from "@/components/dashboard/rich-list-item"
import type { Product } from "@/lib/services/products"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useArchiveProduct, useDeleteProduct, useProducts } from "@/hooks/use-products"

const statusStyles: Record<string, string> = {
  published: "bg-success/10 text-success",
  draft: "bg-warning/10 text-warning-foreground",
  archived: "bg-muted text-muted-foreground",
}

const DEFAULT_PAGE_SIZE = 10

export default function ProductsPage() {
  const router = useRouter()
  const {
    canAccess,
    isLoading: orgLoading,
    guardContent,
    currentOrganization,
  } = useCoachAccessGuard({
    requireOrg: true,
    requireStripe: true,
    noOrgMessage: "Select an organization to view products.",
    stripeDescription:
      "To create and sell products, you need to complete Stripe Connect onboarding for this organization.",
    stripeUseRouter: true,
  })
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useProducts(
    currentOrganization?.id ?? null,
    page,
    DEFAULT_PAGE_SIZE
  )

  useEffect(() => {
    if (error) toast.error((error as Error).message)
  }, [error])

  const archiveMutation = useArchiveProduct(currentOrganization?.id ?? null)

  const deleteMutation = useDeleteProduct(currentOrganization?.id ?? null)

  const total = data.total
  const pageSize = DEFAULT_PAGE_SIZE
  const paginatedProducts = data.items

  if (!canAccess && guardContent) {
    return (
      <div className="space-y-4 p-6 lg:p-8">
        {guardContent}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <PageHeader
        title="Products"
        subtitle={`${total} product${total !== 1 ? "s" : ""} total`}
      >
        <Link href="/dashboard/products/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New product
          </Button>
        </Link>
      </PageHeader>

      {isLoading ? (
        <LoadingRows count={4} />
      ) : total === 0 ? (
        <EmptyState
          icon={Plus}
          title="No products yet"
          description="Create your first product to get started."
          action={
            <Button className="gap-2" asChild>
              <Link href="/dashboard/products/new">
                <Plus className="h-4 w-4" />
                Create your first product
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {paginatedProducts.map((product) => (
              <RichListItem key={product.id}>
                <div className="relative h-16 w-24 shrink-0 rounded-lg bg-muted overflow-hidden">
                  {product.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.cover_image_url}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <span className="text-xs font-semibold opacity-40">
                        {product.type.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs capitalize", statusStyles[product.status])}>
                      {product.status}
                    </Badge>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {product.type}
                    </Badge>
                  </div>
                  <Link href={`/dashboard/products/${product.id}`}>
                    <h3 className="mt-1 text-sm font-semibold text-foreground hover:text-primary transition-colors truncate">
                      {product.title}
                    </h3>
                  </Link>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                    {product.description || "No description"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(product.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/products/${product.id}`} className="gap-2">
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      {product.status !== "archived" && (
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() => archiveMutation.mutate({ productId: product.id })}
                          disabled={archiveMutation.isPending}
                        >
                          <Archive className="h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      {product.status === "draft" && (
                        <DropdownMenuItem
                          className="gap-2 text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </RichListItem>
            ))}
          </ul>

          <div className="flex items-center justify-between">
            <PaginationSummary page={page} pageSize={pageSize} total={total} />
            <PaginationControls page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </>
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
                deleteTarget &&
                deleteMutation.mutate(deleteTarget.id, {
                  onSettled: () => setDeleteTarget(null),
                })
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
