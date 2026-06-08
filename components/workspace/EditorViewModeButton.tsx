"use client";

import type { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type EditorViewModeButtonProps = {
  pressed: boolean;
  onClick: () => void;
  tooltip: string;
  label?: string;
  children?: React.ReactNode;
  icon?: LucideIcon;
  pressedClassName?: string;
  unpressedClassName?: string;
  className?: string;
  disabled?: boolean;
};

export function EditorViewModeButton({
  pressed,
  onClick,
  label,
  children,
  tooltip,
  icon: Icon,
  pressedClassName = "bg-ide-active text-[#c586c0]",
  unpressedClassName = "text-ide-muted hover:text-ide-text",
  className,
  disabled = false,
}: EditorViewModeButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={pressed}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] tracking-wide transition-colors disabled:opacity-50",
            pressed ? pressedClassName : unpressedClassName,
            className
          )}
        >
          {Icon ? <Icon className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden /> : null}
          {children ?? label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
