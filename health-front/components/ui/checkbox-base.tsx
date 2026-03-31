import * as React from "react";

import { cn } from "@/lib/utils";

export function CheckboxBase({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-[var(--border)] bg-[var(--surface)] text-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25",
        className,
      )}
      {...props}
    />
  );
}
