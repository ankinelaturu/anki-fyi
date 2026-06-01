"use client";

import { cn } from "@/lib/utils";

type PanelResizeHandleProps = {
  orientation: "horizontal" | "vertical";
  active?: boolean;
  label: string;
  className?: string;
  onMouseDown: (event: React.MouseEvent) => void;
  onDoubleClick?: () => void;
};

export function PanelResizeHandle({
  orientation,
  active,
  label,
  className,
  onMouseDown,
  onDoubleClick,
}: PanelResizeHandleProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      role="separator"
      aria-orientation={isHorizontal ? "vertical" : "horizontal"}
      aria-label={label}
      className={cn(
        "z-10 shrink-0",
        isHorizontal ? "h-full w-0 cursor-ew-resize border-l border-ide-border" : "h-0 w-full cursor-ns-resize border-t border-ide-border",
        active && "border-ide-blue/60",
        className
      )}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    />
  );
}
