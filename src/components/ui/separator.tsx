import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Non-interactive divider (shadcn's separator without the Radix dependency —
 * nothing here needs focus or orientation semantics beyond the ARIA role).
 */
const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    aria-orientation={orientation}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
      className
    )}
    {...props}
  />
))
Separator.displayName = "Separator"

export { Separator }
