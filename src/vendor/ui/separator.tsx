"use client"

import * as React from "react"
import { cn } from "cn"
import { Separator as SeparatorPrimitive } from "radix-ui"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-(color:--border) [&:is([data-orientation=horizontal])]:h-px [&:is([data-orientation=horizontal])]:w-full [&:is([data-orientation=vertical])]:w-px [&:is([data-orientation=vertical])]:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
