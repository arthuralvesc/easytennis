import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
}

export function Spinner({ size = "sm", className }: SpinnerProps) {
  return <Loader2 className={cn("animate-spin shrink-0", sizeMap[size], className)} />
}

export function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
