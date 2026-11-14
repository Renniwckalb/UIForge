import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-(color:--input) bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-(color:--muted-foreground) focus-visible:border-(color:--ring) focus-visible:ring-3 focus-visible:ring-(color:--ring)/50 disabled:cursor-not-allowed disabled:bg-(color:--input)/50 disabled:opacity-50 aria-invalid:border-(color:--destructive) aria-invalid:ring-3 aria-invalid:ring-(color:--destructive)/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
