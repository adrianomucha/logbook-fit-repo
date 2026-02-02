import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  selectedLabel: string
  setSelectedLabel: (label: string) => void
}

const SelectContext = React.createContext<SelectContextValue>({
  value: "",
  onValueChange: () => {},
  isOpen: false,
  setIsOpen: () => {},
  selectedLabel: "",
  setSelectedLabel: () => {},
})

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

const Select = ({ value, onValueChange, children }: SelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState("")
  const childrenRef = React.useRef(children)

  // Update ref when children change
  React.useEffect(() => {
    childrenRef.current = children
  }, [children])

  // Initialize selectedLabel from children when value changes
  React.useEffect(() => {
    if (value) {
      // Find the matching SelectItem in children and extract its label
      const findLabel = (node: React.ReactNode): string | null => {
        if (!node) return null

        if (React.isValidElement(node)) {
          // Check if this is SelectContent
          const nodeType = node.type as any
          if (nodeType && typeof nodeType === 'object' && nodeType.displayName === 'SelectContent') {
            // Look through SelectContent's children
            const contentChildren = (node.props as any).children
            return findLabel(contentChildren)
          }

          // Check if this is SelectItem with matching value
          const nodeProps = node.props as any
          if (nodeProps && 'value' in nodeProps && nodeProps.value === value) {
            // Extract text from children
            const getTextFromChildren = (child: React.ReactNode): string => {
              if (typeof child === 'string') return child
              if (typeof child === 'number') return String(child)
              if (Array.isArray(child)) return child.map(getTextFromChildren).join('')
              if (React.isValidElement(child)) {
                const childProps = child.props as any
                if (childProps && childProps.children) {
                  return getTextFromChildren(childProps.children)
                }
              }
              return ''
            }
            return getTextFromChildren(nodeProps.children)
          }
        }

        // Recurse through children
        if (Array.isArray(node)) {
          for (const child of node) {
            const result = findLabel(child)
            if (result) return result
          }
        } else if (React.isValidElement(node)) {
          const nodeProps = node.props as any
          if (nodeProps && nodeProps.children) {
            return findLabel(nodeProps.children)
          }
        }

        return null
      }

      const label = findLabel(childrenRef.current)
      if (label) {
        setSelectedLabel(label)
      }
    } else {
      setSelectedLabel('')
    }
  }, [value])

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen, selectedLabel, setSelectedLabel }}>
      <div className="relative inline-block">{children}</div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { isOpen, setIsOpen } = React.useContext(SelectContext)

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
        "placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { selectedLabel } = React.useContext(SelectContext)
  return <span>{selectedLabel || placeholder}</span>
}

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { isOpen, setIsOpen } = React.useContext(SelectContext)
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "top-full mt-1 max-h-96 overflow-y-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
SelectContent.displayName = "SelectContent"

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const { value: selectedValue, onValueChange, setIsOpen, setSelectedLabel } = React.useContext(SelectContext)

    // Helper to extract text from children
    const getTextFromChildren = (node: React.ReactNode): string => {
      if (typeof node === 'string') return node
      if (typeof node === 'number') return String(node)
      if (Array.isArray(node)) return node.map(getTextFromChildren).join('')
      if (React.isValidElement(node) && node.props.children) {
        return getTextFromChildren(node.props.children)
      }
      return ''
    }

    // Update the selected label when this item is selected
    React.useEffect(() => {
      if (selectedValue === value && children) {
        setSelectedLabel(getTextFromChildren(children))
      }
    }, [selectedValue, value, children, setSelectedLabel])

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:bg-accent focus:text-accent-foreground",
          selectedValue === value && "bg-accent text-accent-foreground",
          className
        )}
        onClick={() => {
          onValueChange(value)
          setSelectedLabel(getTextFromChildren(children))
          setIsOpen(false)
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
