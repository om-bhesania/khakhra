import * as React from "react"

import { cn } from "@/lib/utils"

type InputProps = React.ComponentProps<"input"> & {
  contentLeft?: React.ReactNode
  contentRight?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, contentLeft, contentRight, ...props }, ref) => {
    const hasLeft = Boolean(contentLeft)
    const hasRight = Boolean(contentRight)

    return (
      <div className={cn("relative w-full min-w-0")}>        
        <input
          ref={ref}
          type={type}
          data-slot="input"
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            hasLeft && "pl-9",
            hasRight && "pr-28",
            className
          )}
          {...props}
        />
        {hasLeft ? (
          <div className="pointer-events-auto absolute inset-y-0 left-2 flex items-center gap-2">
            {contentLeft}
          </div>
        ) : null}
        {hasRight ? (
          <div className="pointer-events-auto absolute inset-y-0 right-2 flex items-center gap-2">
            {contentRight}
          </div>
        ) : null}
      </div>
    )
  }
)

Input.displayName = "Input"

export { Input }
