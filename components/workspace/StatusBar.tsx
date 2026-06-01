"use client";

import type { LucideIcon } from "lucide-react";
import { Mail, MapPin, Phone } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const STATUS_ITEMS: {
  id: string;
  text: string;
  icon: LucideIcon;
  href?: string;
}[] = [
  { id: "email", text: "anki.r.nelaturu@gmail.com", icon: Mail, href: "mailto:anki.r.nelaturu@gmail.com" },
  { id: "phone", text: "(408) 431-3061", icon: Phone },
  { id: "location", text: "Santa Clara, CA 95054", icon: MapPin },
];

function StatusBarItem({
  text,
  icon: Icon,
  href,
  showDivider,
}: {
  text: string;
  icon: LucideIcon;
  href?: string;
  showDivider?: boolean;
}) {
  const inner = (
    <span
      className={cn(
        "flex h-full items-center gap-1.5 px-2.5 transition-colors",
        "hover:bg-ide-active hover:text-ide-text",
        href && "cursor-pointer"
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
      {text}
    </span>
  );

  return (
    <>
      {showDivider && <span className="h-full w-px bg-ide-border" aria-hidden />}
      <Tooltip>
        <TooltipTrigger asChild>
          {href ? (
            <a href={href} className="flex h-full items-center outline-none">
              {inner}
            </a>
          ) : (
            <button type="button" className="flex h-full items-center outline-none">
              {inner}
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side="top">{text}</TooltipContent>
      </Tooltip>
    </>
  );
}

export function StatusBar() {
  return (
    <footer className="flex h-[22px] shrink-0 items-stretch justify-end border-t border-ide-border bg-[#181818] text-[11px] text-ide-muted">
      <div className="flex h-full items-stretch">
        {STATUS_ITEMS.map((item, index) => (
          <StatusBarItem
            key={item.id}
            text={item.text}
            icon={item.icon}
            href={item.href}
            showDivider={index > 0}
          />
        ))}
      </div>
    </footer>
  );
}
