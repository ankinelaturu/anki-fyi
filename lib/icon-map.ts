import type { WorkspaceFile } from "@/lib/content-types";

export const LINTERN_ICON_PATH = "/icons/lintern.png";

export const ICON_BY_KEY = {
  user: "user",
  "file-user": "file-user",
  mail: "mail",
  blocks: "blocks",
  workflow: "workflow",
  type: "type",
  smartphone: "smartphone",
  cpu: "cpu",
  network: "network",
  terminal: "terminal",
  globe: "globe",
  "mouse-pointer": "mouse-pointer",
  shield: "shield",
  sparkles: "sparkles",
  orbit: "orbit",
  map: "map",
  gamepad: "gamepad",
  search: "search",
  "message-circle": "message-circle",
  "pen-tool": "pen-tool",
  "file-text": "file-text",
  brain: "brain",
  timer: "timer",
  badge: "badge",
  "git-branch": "git-branch",
  radio: "radio",
  layers: "layers",
  "layout-dashboard": "layout-dashboard",
  route: "route",
  "flask-conical": "flask-conical",
  film: "film",
  markdown: "markdown",
  "lintern-logo": "lintern-logo",
  "bar-chart-3": "bar-chart-3",
} as const;

const FILENAME_ICON: Record<string, string> = {
  "about-anki.md": "user",
  "resume.md": "file-user",
  "contact.md": "mail",
  "oracle-visual-builder.md": "blocks",
  "action-chain-editor.md": "workflow",
  "typescript-enablement.md": "type",
  "mobile-frameworks.md": "smartphone",
  "sun-runtime-systems.md": "cpu",
  "ai-orchestration.md": "network",
  "developer-platforms.md": "terminal",
  "browser-runtimes.md": "globe",
  "interactive-systems.md": "mouse-pointer",
  "local-first-ai.md": "shield",
  "human-ai-interaction.md": "sparkles",
  "lintern.md": "lintern-logo",
  "astrovalley.md": "orbit",
  "ozmap.md": "map",
  "storybook-arcade.md": "gamepad",
  "rudy-finds.md": "search",
  "ask-rudy.md": "message-circle",
  "crafticle.md": "pen-tool",
  "zerofabric.md": "network",
  "stop-building-static-agents.md": "file-text",
  "local-llm-orchestration.md": "brain",
  "lessons-from-six-in-twelve.md": "timer",
  "patent-portfolio.md": "badge",
  "concurrency-systems.md": "git-branch",
  "embedded-process-communication.md": "radio",
  "mobile-platform-innovations.md": "layers",
  "embedded-jvm-runtime.md": "cpu",
  "portfolio-workspace.md": "layout-dashboard",
  "zerofabric-runtime-simulator.md": "route",
  "future-experiments.md": "flask-conical",
  "aimless-dude-hyper-dog.md": "film",
  "chatgpt_export_summary.md": "bar-chart-3",
};

const KIND_ICON: Record<string, string> = {
  profile: "user",
  experience: "workflow",
  capability: "sparkles",
  project: "terminal",
  writing: "file-text",
  patent: "badge",
  lab: "flask-conical",
  creative: "film",
  analytics: "bar-chart-3",
};

export function resolveIconKey(file: WorkspaceFile): string {
  if (file.icon) return file.icon;
  if (file.kind && KIND_ICON[file.kind]) return KIND_ICON[file.kind]!;
  if (FILENAME_ICON[file.filename]) return FILENAME_ICON[file.filename]!;
  return "markdown";
}
