import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-[10px] border border-border bg-surface px-3 py-2 text-[15px] text-foreground transition-colors outline-none",
        "placeholder:text-text-faint",
        "focus-visible:border-accent-dim focus-visible:ring-[3px] focus-visible:ring-[rgba(196,123,34,0.12)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-[rgba(155,64,64,0.2)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
