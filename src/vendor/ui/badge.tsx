import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-(color:--ring) focus-visible:ring-[3px] focus-visible:ring-(color:--ring)/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-(color:--destructive) aria-invalid:ring-(color:--destructive)/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-(color:--primary) text-(color:--primary-foreground) [a]:hover:bg-(color:--primary)/80",
        secondary:
          "bg-(color:--secondary) text-(color:--secondary-foreground) [a]:hover:bg-(color:--secondary)/80",
        destructive:
          "bg-(color:--destructive)/10 text-(color:--destructive) focus-visible:ring-(color:--destructive)/20 [a]:hover:bg-(color:--destructive)/20",
        outline:
          "border-(color:--border) text-(color:--foreground) [a]:hover:bg-(color:--muted) [a]:hover:text-(color:--muted-foreground)",
        ghost:
          "hover:bg-(color:--muted) hover:text-(color:--muted-foreground)",
        link: "text-(color:--primary) underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
