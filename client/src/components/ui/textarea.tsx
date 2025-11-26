import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-[var(--pro-border)] bg-[var(--pro-surface-highlight)] px-4 py-3 text-base text-[var(--pro-text-primary)] ring-offset-background placeholder:text-[var(--pro-text-secondary)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pro-mint)]/30 focus-visible:border-[var(--pro-mint)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors md:text-sm resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
