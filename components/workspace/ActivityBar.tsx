"use client";

import type { LucideIcon } from "lucide-react";
import { Files, Search, Linkedin, Github, Youtube, Mail } from "lucide-react";
import { PdfIcon } from "@/components/workspace/PdfIcon";
import { SOCIAL_LINKS } from "@/lib/social-links";
import { cn } from "@/lib/utils";

export type SidePanelView = "explorer" | "search";

type ActivityBarProps = {
  activeView: SidePanelView;
  onViewChange: (view: SidePanelView) => void;
};

function ActivityBarButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "relative flex h-14 w-14 items-center justify-center text-ide-muted transition-colors hover:text-ide-text",
        active && "text-ide-text before:absolute before:left-0 before:top-0 before:h-full before:w-0.5 before:bg-ide-blue"
      )}
    >
      <Icon className="h-6 w-6" strokeWidth={1.75} />
    </button>
  );
}

type ActivityLinkIcon = LucideIcon | typeof PdfIcon;

function ActivityBarLink({
  icon: Icon,
  label,
  href,
}: {
  icon: ActivityLinkIcon;
  label: string;
  href: string;
}) {
  const external = href.startsWith("http");

  return (
    <a
      href={href}
      title={label}
      aria-label={label}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex h-11 w-14 items-center justify-center text-ide-muted transition-colors hover:bg-ide-active hover:text-ide-text"
    >
      {Icon === PdfIcon ? <PdfIcon className="h-5 w-5" /> : <Icon className="h-5 w-5" strokeWidth={1.75} />}
    </a>
  );
}

export function ActivityBar({ activeView, onViewChange }: ActivityBarProps) {
  return (
    <aside className="flex w-14 shrink-0 flex-col border-r border-ide-border bg-[#181818] max-md:hidden">
      <div className="flex flex-col items-center">
        <ActivityBarButton
          icon={Files}
          label="Explorer"
          active={activeView === "explorer"}
          onClick={() => onViewChange("explorer")}
        />
        <ActivityBarButton
          icon={Search}
          label="Search"
          active={activeView === "search"}
          onClick={() => onViewChange("search")}
        />
      </div>

      <div className="mt-auto flex flex-col items-center border-t border-ide-border py-1">
        <ActivityBarLink icon={Linkedin} label="LinkedIn" href={SOCIAL_LINKS.linkedin} />
        <ActivityBarLink icon={Github} label="GitHub" href={SOCIAL_LINKS.github} />
        <ActivityBarLink icon={Youtube} label="YouTube" href={SOCIAL_LINKS.youtube} />
        <ActivityBarLink icon={PdfIcon} label="Resume PDF" href={SOCIAL_LINKS.resumePdf} />
        <ActivityBarLink icon={Mail} label="Email" href={SOCIAL_LINKS.email} />
      </div>
    </aside>
  );
}
