import { cn } from "@/lib/utils"

function orgInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || "?"
}

const sizeClass = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-12 w-12 text-lg",
} as const

type OrgLogoProps = {
  name: string
  logoUrl?: string | null
  primaryColor?: string | null
  size?: keyof typeof sizeClass
  className?: string
}

export function OrgLogo({
  name,
  logoUrl,
  primaryColor,
  size = "md",
  className,
}: OrgLogoProps) {
  const box = cn(
    "flex shrink-0 items-center justify-center overflow-hidden rounded-lg font-bold",
    sizeClass[size],
    className
  )

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" className={cn(box, "object-cover bg-muted")} />
    )
  }

  const hasBrand = !!primaryColor?.trim()
  return (
    <span
      className={cn(
        box,
        !hasBrand && "bg-primary/10 text-primary"
      )}
      style={
        hasBrand
          ? {
              backgroundColor: `${primaryColor}1a`,
              color: primaryColor ?? undefined,
            }
          : undefined
      }
      aria-hidden
    >
      {orgInitials(name)}
    </span>
  )
}
