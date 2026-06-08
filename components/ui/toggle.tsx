"use client"

import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ide-blue disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-ide-active data-[state=on]:text-ide-text [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 gap-2",
  {
    variants: {
      variant: {
        default: "bg-transparent text-ide-muted hover:bg-ide-active hover:text-ide-text",
        outline:
          "border border-ide-border bg-transparent text-ide-muted hover:bg-ide-active hover:text-ide-text data-[state=on]:border-ide-border",
      },
      size: {
        default: "h-8 px-3 min-w-10 text-xs",
        sm: "h-6 px-2 min-w-8 text-[10px]",
        lg: "h-10 px-4 min-w-10 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }
