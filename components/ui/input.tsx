import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-none border-0 bg-transparent px-2 text-sm text-ide-text outline-none placeholder:text-ide-muted focus:ring-0",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
