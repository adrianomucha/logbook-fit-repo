import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          ref={ref}
          checked={checked}
          onChange={(e) => {
            if (onCheckedChange) {
              onCheckedChange(e.target.checked)
            }
          }}
          {...props}
        />
        {/* Focus lands on the sr-only input, so the visible ring has to be
            driven off it — peer-focus-visible, not focus-visible */}
        <div
          className={cn(
            "h-4 w-4 rounded border border-input bg-background ring-offset-background transition-colors",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            checked && "bg-primary border-primary text-primary-foreground",
            className
          )}
          onClick={() => {
            if (!props.disabled && onCheckedChange) {
              onCheckedChange(!checked)
            }
          }}
        >
          {checked && (
            <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
          )}
        </div>
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
