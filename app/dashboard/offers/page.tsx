"use client"

import { Plus, MoreHorizontal, Package, Repeat, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { offers } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const typeIcons: Record<string, typeof Package> = {
  "one-time": Package,
  subscription: Repeat,
  bundle: Gift,
}

export default function OffersPage() {
  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Offers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage pricing models, bundles, and upsells</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New offer
        </Button>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Offer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Redemptions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.map((offer) => {
              const Icon = typeIcons[offer.type]
              return (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{offer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-xs">{offer.type}</Badge>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    ${offer.price}
                    {offer.interval && <span className="text-muted-foreground font-normal">/{offer.interval === "monthly" ? "mo" : "yr"}</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {offer.products.length} product{offer.products.length > 1 ? "s" : ""}
                  </TableCell>
                  <TableCell className="text-foreground">{offer.redemptions}</TableCell>
                  <TableCell>
                    <Badge className={cn("text-xs", offer.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
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
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
