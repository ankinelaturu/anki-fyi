"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Badge,
  BarChart3,
  Blocks,
  Brain,
  Cpu,
  FileCode2,
  FileText,
  FileUser,
  Film,
  FlaskConical,
  Gamepad2,
  GitBranch,
  Globe,
  LayoutDashboard,
  Layers,
  Mail,
  Map,
  MessageCircle,
  MousePointer2,
  Network,
  Orbit,
  PenTool,
  Radio,
  Route,
  Search,
  Shield,
  Smartphone,
  Sparkles,
  Terminal,
  Timer,
  User,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LINTERN_ICON_PATH, resolveIconKey } from "@/lib/icon-map";
import type { WorkspaceFile } from "@/lib/content-types";
import { cn } from "@/lib/utils";

// Place Lintern icon at public/icons/lintern.png

const LUCIDE_ICONS: Record<string, LucideIcon> = {
  user: User,
  "file-user": FileUser,
  mail: Mail,
  blocks: Blocks,
  workflow: Workflow,
  type: FileText,
  smartphone: Smartphone,
  cpu: Cpu,
  network: Network,
  terminal: Terminal,
  globe: Globe,
  "mouse-pointer": MousePointer2,
  shield: Shield,
  sparkles: Sparkles,
  orbit: Orbit,
  map: Map,
  gamepad: Gamepad2,
  search: Search,
  "message-circle": MessageCircle,
  "pen-tool": PenTool,
  "file-text": FileText,
  brain: Brain,
  timer: Timer,
  badge: Badge,
  "bar-chart-3": BarChart3,
  "git-branch": GitBranch,
  radio: Radio,
  layers: Layers,
  "layout-dashboard": LayoutDashboard,
  route: Route,
  "flask-conical": FlaskConical,
  film: Film,
  markdown: FileCode2,
};

type FileIconProps = {
  file: WorkspaceFile;
  selected?: boolean;
  className?: string;
};

export function FileIcon({ file, selected, className }: FileIconProps) {
  const key = resolveIconKey(file);
  const [linternImageFailed, setLinternImageFailed] = useState(false);

  const iconClass = cn(
    "h-4 w-4 shrink-0",
    selected ? "text-ide-blue" : "text-ide-muted",
    className
  );

  if (key === "lintern-logo") {
    if (linternImageFailed) {
      return <Shield className={iconClass} aria-hidden />;
    }
    return (
      <Image
        src={LINTERN_ICON_PATH}
        alt=""
        width={16}
        height={16}
        className="h-4 w-4 shrink-0 object-contain opacity-90"
        unoptimized
        onError={() => setLinternImageFailed(true)}
      />
    );
  }

  const Icon = LUCIDE_ICONS[key] ?? FileCode2;
  return <Icon className={iconClass} aria-hidden />;
}

export function getFileIcon(file: WorkspaceFile, options?: { selected?: boolean; className?: string }) {
  return <FileIcon file={file} selected={options?.selected} className={options?.className} />;
}
