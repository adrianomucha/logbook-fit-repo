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
          className="sr-only"
          ref={ref}
          checked={checked}
          onChange={(e) => {
            if (onCheckedChange) {
              onCheckedChange(e.target.checked)
            }
          }}
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 rounded border border-input bg-background ring-offset-background transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
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
