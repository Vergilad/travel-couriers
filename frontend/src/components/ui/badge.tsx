import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[6px] border px-2 py-0.5 text-[12px] font-medium leading-none",
  {
    variants: {
      variant: {
        open: "border-border bg-surface-raised text-text-muted",
        matched: "border-accent-dim/40 bg-accent-dim/15 text-accent",
        completed: "border-success/30 bg-success/10 text-success",
        trip: "border-border bg-surface-raised text-text-muted",
        request: "border-border bg-surface-raised text-text-muted",
        delivery: "border-border bg-surface-raised text-text-muted",
      },
    },
    defaultVariants: {
      variant: "open",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />
}

export { Badge, badgeVariants }
