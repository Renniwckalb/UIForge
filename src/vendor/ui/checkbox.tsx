"use client"

import * as React from "react"
import { cn } from "cn"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { CheckIcon } from "lucide-react"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-(color:--input) transition-colors outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-(color:--input) after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-(color:--ring) focus-visible:ring-3 focus-visible:ring-(color:--ring)/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-(color:--destructive) aria-invalid:ring-3 aria-invalid:ring-(color:--destructive)/20 aria-invalid:aria-checked:border-(color:--primary) [&:is([data-state=checked],[data-checked]:not([data-checked=false]))]:border-(color:--primary) [&:is([data-state=checked],[data-checked]:not([data-checked=false]))]:bg-(color:--primary) [&:is([data-state=checked],[data-checked]:not([data-checked=false]))]:text-(color:--primary-foreground) group-has-[:focus-visible]/field-label:[&:is([data-state=checked],[data-checked]:not([data-checked=false]))]:border-(color:--primary)",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
