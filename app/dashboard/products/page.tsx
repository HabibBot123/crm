"use client"

import Link from "next/link"
import { Plus, MoreHorizontal, Star, Users, Eye, Pencil, Trash2, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { products } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const statusStyles: Record<string, string> = {
  published: "bg-success/10 text-success",
  draft: "bg-warning/10 text-warning-foreground",
  archived: "bg-muted text-muted-foreground",
}

export default function ProductsPage() {
  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">{products.length} products total</p>
        </div>
        <Link href="/dashboard/products/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New product
          </Button>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <div key={product.id} className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-lg hover:shadow-primary/5">
            <div className="aspect-[16/9] bg-muted relative">
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <span className="text-2xl font-bold opacity-20">{product.type.toUpperCase()}</span>
              </div>
              <div className="absolute right-3 top-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2"><Eye className="h-4 w-4" /> View</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2"><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2"><Archive className="h-4 w-4" /> Archive</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 text-destructive"><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2">
                <Badge className={cn("text-xs capitalize", statusStyles[product.status])}>
                  {product.status}
                </Badge>
                <Badge variant="secondary" className="text-xs capitalize">{product.type}</Badge>
              </div>
              <Link href={`/dashboard/products/${product.id}`}>
                <h3 className="mt-3 text-sm font-semibold text-foreground hover:text-primary transition-colors">
                  {product.title}
                </h3>
              </Link>
              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                {product.description}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {product.studentsCount}
                  </span>
                  {product.rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      {product.rating}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-foreground">
                  {product.price === 0 ? "Free" : `$${product.price}`}
                  {product.pricingType === "monthly" && <span className="text-muted-foreground font-normal">/mo</span>}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Add product card */}
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
    </div>
  )
}
