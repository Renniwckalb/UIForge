import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-(color:--input) bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-(color:--foreground) placeholder:text-(color:--muted-foreground) focus-visible:border-(color:--ring) focus-visible:ring-3 focus-visible:ring-(color:--ring)/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-(color:--input)/50 disabled:opacity-50 aria-invalid:border-(color:--destructive) aria-invalid:ring-3 aria-invalid:ring-(color:--destructive)/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
