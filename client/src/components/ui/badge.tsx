import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30",
        secondary:
          "border-transparent bg-[#1F242C] text-[#9CA3AF] border-[#2D333B]",
        destructive:
          "border-transparent bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
        outline: 
          "text-[#9CA3AF] border-[#2D333B]",
        success:
          "border-transparent bg-[#4ADE80]/15 text-[#4ADE80] border-[#4ADE80]/30",
        warning:
          "border-transparent bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30",
        danger:
          "border-transparent bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
        info:
          "border-transparent bg-[#60A5FA]/15 text-[#60A5FA] border-[#60A5FA]/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div 
      className={cn(badgeVariants({ variant }), className)} 
      style={{
        '--tw-ring-color': '#4ADE80',
        '--tw-ring-offset-color': '#0F1115',
      } as React.CSSProperties}
      {...props} 
    />
  )
}

export { Badge, badgeVariants }
