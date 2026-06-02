"use client";

import type { LucideIcon } from "lucide-react";
import { Github, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SOCIAL_LINKS } from "@/lib/social-links";
import { cn } from "@/lib/utils";

const STATUS_ITEMS: {
  id: string;
  text: string;
  icon: LucideIcon;
  href?: string;
}[] = [
  { id: "email", text: "anki.r.nelaturu@gmail.com", icon: Mail, href: "mailto:anki.r.nelaturu@gmail.com" },
  { id: "phone", text: "(408) 431-3061", icon: Phone },
  { id: "linkedin", text: "LinkedIn", icon: Linkedin, href: SOCIAL_LINKS.linkedin },
  { id: "github", text: "GitHub", icon: Github, href: SOCIAL_LINKS.github },
  { id: "youtube", text: "YouTube", icon: Youtube, href: SOCIAL_LINKS.youtube },
  { id: "location", text: "Santa Clara, CA 95054", icon: MapPin },
];

function StatusBarItem({
  text,
  icon: Icon,
  href,
}: {
  text: string;
  icon: LucideIcon;
  href?: string;
}) {
  const tip = href?.startsWith("http") ? href : text;
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
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <a
            href={href}
            aria-label={text}
            className="flex h-full items-center outline-none"
            {...(href.startsWith("http")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {inner}
          </a>
        ) : (
          <button type="button" className="flex h-full items-center outline-none">
            {inner}
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs break-all">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

export function StatusBar() {
  return (
    <footer className="flex h-[22px] shrink-0 items-stretch justify-end border-t border-ide-border bg-[#181818] text-[11px] text-ide-muted">
      <div className="flex h-full items-stretch gap-1 px-2">
        {STATUS_ITEMS.map((item) => (
          <StatusBarItem key={item.id} text={item.text} icon={item.icon} href={item.href} />
        ))}
      </div>
    </footer>
  );
}
