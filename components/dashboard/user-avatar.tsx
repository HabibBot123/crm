import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  name?: string | null
  email?: string | null
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
}

export function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return "?"
}

const sizeClasses = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
}

export function UserAvatar({ name, email, size = "md", className }: UserAvatarProps) {
  const initials = getInitials(name, email)
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
