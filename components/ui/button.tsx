import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "terminal";
};

export function Button({ className, variant = "ghost", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50",
        variant === "ghost" && "hover:bg-ide-active text-ide-text",
        variant === "terminal" && "border border-ide-border bg-[#111] text-ide-green hover:bg-[#181818]",
        className
      )}
      {...props}
    />
  );
}
