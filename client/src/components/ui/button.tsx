import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#4ADE80] text-[#0F1115] hover:bg-[#22C55E] shadow-lg hover:shadow-xl",
        destructive:
          "bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-lg",
        outline:
          "border border-[#2D333B] bg-transparent text-[#9CA3AF] hover:bg-[#1F242C] hover:text-white hover:border-[#4ADE80]",
        secondary:
          "bg-[#1F242C] text-[#9CA3AF] hover:bg-[#2D333B] hover:text-white",
        ghost: "text-[#9CA3AF] hover:bg-[#1F242C] hover:text-white",
        link: "text-[#4ADE80] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8",
        icon: "h-11 w-11",
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
        style={{
          '--tw-ring-color': '#4ADE80',
          '--tw-ring-offset-color': '#0F1115',
        } as React.CSSProperties}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
