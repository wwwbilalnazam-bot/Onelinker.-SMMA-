import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base — matches our .btn system in globals.css
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold select-none transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Gradient primary — the premium look
        default:     "btn-primary",
        // Gradient red destructive
        destructive: "btn-destructive",
        // Bordered card-style
        outline:     "btn-secondary",
        secondary:   "btn-secondary",
        // Transparent with hover bg
        ghost:       "btn-ghost text-muted-foreground",
        // Text-only link
        link:        "text-primary underline-offset-4 hover:underline p-0 h-auto font-medium",
      },
      size: {
        default: "h-9  px-4   text-sm  [&_svg]:size-3.5",
        sm:      "h-8  px-3   text-xs  [&_svg]:size-3.5",
        lg:      "h-10 px-5   text-sm  [&_svg]:size-4",
        xl:      "h-11 px-6   text-base [&_svg]:size-4",
        icon:    "h-9  w-9   [&_svg]:size-4",
        "icon-sm": "h-8 w-8  [&_svg]:size-3.5",
        "icon-lg": "h-10 w-10 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
