"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Archive,
  Package,
  Repeat,
  Gift,
} from "lucide-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useStripeConnectGuard } from "@/hooks/use-stripe-connect-guard"
import { useAuth } from "@/hooks/use-auth"
import {
  fetchOffersByOrganization,
  updateOffer,
  deleteOffer,
  type OfferListItem,
} from "@/lib/services/offers"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success",
  draft: "bg-warning/10 text-warning-foreground",
  archived: "bg-muted text-muted-foreground",
}

const billingTypeIcon: Record<string, typeof Package> = {
  subscription: Repeat,
  one_time: Package,
  installment: Gift,
}

const billingTypeLabel: Record<string, string> = {
  subscription: "Subscription",
  one_time: "One-time",
  installment: "Installment",
}

function formatPrice(offer: OfferListItem): string {
  const price = `${offer.currency.toUpperCase()} ${Number(offer.price).toFixed(2)}`
  if (offer.billing_type === "subscription") {
    return `${price} / ${offer.interval === "year" ? "yr" : "mo"}`
  }
  if (offer.billing_type === "installment" && offer.installment_count) {
    return `${price} × ${offer.installment_count}`
  }
  return price
}

export default function OffersPage() {
  const queryClient = useQueryClient()
  const { supabase } = useAuth()
  const {
    canAccess,
    guardContent,
    currentOrganization,
  } = useStripeConnectGuard({
    noOrgMessage: "Select an organization to view offers.",
    stripeDescription:
      "To create and manage offers, you need to complete Stripe Connect onboarding for this organization.",
    stripeUseRouter: true,
  })
  const [deleteTarget, setDeleteTarget] = useState<OfferListItem | null>(null)

  const {
    data: offers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["offers", currentOrganization?.id],
    queryFn: () => fetchOffersByOrganization(supabase, currentOrganization!.id),
    enabled: !!currentOrganization?.id,
  })

  useEffect(() => {
    if (error) toast.error((error as Error).message)
  }, [error])

  const archiveMutation = useMutation({
    mutationFn: (offerId: number) =>
      updateOffer(supabase, offerId, { status: "archived" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers", currentOrganization?.id] })
      toast.success("Offer archived")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (offerId: number) => deleteOffer(supabase, offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers", currentOrganization?.id] })
      setDeleteTarget(null)
      toast.success("Offer deleted")
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setDeleteTarget(null)
    },
  })

  if (!canAccess && guardContent) {
    return <div className="p-4 lg:p-8">{guardContent}</div>
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Offers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {offers.length} offer{offers.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/dashboard/offers/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New offer
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : offers.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 px-6">
          <p className="text-sm text-muted-foreground text-center">
            No offers yet. Create your first offer to start selling.
          </p>
          <Button className="mt-4 gap-2" asChild>
            <Link href="/dashboard/offers/new">
              <Plus className="h-4 w-4" />
              Create your first offer
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Offer</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => {
                const Icon = billingTypeIcon[offer.billing_type] ?? Package
                return (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <Link
                          href={`/dashboard/offers/${offer.id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {offer.title}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {billingTypeLabel[offer.billing_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {formatPrice(offer)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {offer.offer_products.length} product
                      {offer.offer_products.length !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn("text-xs capitalize", statusStyles[offer.status])}
                      >
                        {offer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/offers/${offer.id}`} className="gap-2">
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          {offer.status !== "archived" && (
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => archiveMutation.mutate(offer.id)}
                              disabled={archiveMutation.isPending}
                            >
                              <Archive className="h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="gap-2 text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(offer)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete offer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This will
              remove the offer and all its payment links. Existing enrollments will not be
              affected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
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
