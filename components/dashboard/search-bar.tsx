"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  placeholder?: string
  className?: string
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search…",
  className,
}: SearchBarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative min-w-[200px] flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          className="pl-9"
        />
      </div>
      <Button type="button" variant="secondary" onClick={onSearch}>
        Search
      </Button>
    </div>
  )
}
