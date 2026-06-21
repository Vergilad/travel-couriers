import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[6px] border border-transparent bg-clip-padding font-label whitespace-nowrap transition-opacity duration-150 outline-none select-none focus-visible:border-[var(--accent-dim)] focus-visible:ring-[3px] focus-visible:ring-[rgba(196,123,34,0.12)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-[rgba(155,64,64,0.2)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:opacity-85",
        outline:
          "border-border bg-transparent text-foreground hover:bg-surface-raised hover:opacity-85 aria-expanded:bg-surface-raised",
        secondary:
          "bg-secondary text-secondary-foreground hover:opacity-85 aria-expanded:bg-secondary",
        ghost:
          "text-foreground hover:bg-surface-raised hover:opacity-85 aria-expanded:bg-surface-raised",
        destructive:
          "bg-destructive/15 text-destructive hover:opacity-85 focus-visible:border-destructive/40 focus-visible:ring-[rgba(155,64,64,0.2)]",
        link: "text-accent underline-offset-4 hover:opacity-85 normal-case tracking-normal",
      },
      size: {
        default: "h-10 gap-2 px-5 py-2.5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 px-2 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-6 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
