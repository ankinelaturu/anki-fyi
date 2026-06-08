"use client";

import { Columns2, SquareStack } from "lucide-react";
import type { PlannerEngineMode } from "@/lib/assistant/config";
import { EditorViewModeButton } from "@/components/workspace/EditorViewModeButton";
import { cn } from "@/lib/utils";

const OPTIONS: { value: PlannerEngineMode; title: string }[] = [
  {
    value: "shared",
    title: "One WebGPU slot — unload Qwen before loading Gemma (lower VRAM)",
  },
  {
    value: "dual",
    title: "Keep Qwen and Gemma loaded together (faster repeat queries, more VRAM)",
  },
];

const DULL_PURPLE = "text-[#c586c0]/45";
const BRIGHT_PURPLE = "text-[#e8b4ff]";
const DULL_GREEN = "text-ide-green/45";
const BRIGHT_GREEN = "text-[#89d185]";
const DULL_BLUE = "text-ide-blue/45";
const BRIGHT_BLUE = "text-[#9cdcfe]";

function SharedSlotLabel({ pressed }: { pressed: boolean }) {
  return (
    <span className={cn(pressed ? BRIGHT_GREEN : DULL_GREEN, pressed && "font-medium")}>
      Qwen.Gemma
    </span>
  );
}

function SeparateSlotLabel({ pressed }: { pressed: boolean }) {
  return (
    <span className={cn(pressed && "font-medium")}>
      <span className={cn(pressed ? BRIGHT_BLUE : DULL_BLUE)}>Qwen</span>
      <span className={cn(pressed ? "text-ide-text/70" : "text-ide-muted/50")}>.</span>
      <span className={cn(pressed ? BRIGHT_PURPLE : DULL_PURPLE)}>Gemma</span>
    </span>
  );
}

type PlannerEngineModeControlProps = {
  value: PlannerEngineMode;
  onChange: (mode: PlannerEngineMode) => void;
  disabled?: boolean;
};

export function PlannerEngineModeControl({
  value,
  onChange,
  disabled = false,
}: PlannerEngineModeControlProps) {
  return (
    <div
      className="inline-flex overflow-hidden rounded border border-ide-border bg-ide-active/20"
      role="group"
      aria-label="WebLLM engine layout"
    >
      {OPTIONS.map((option, index) => {
        const pressed = value === option.value;
        const isShared = option.value === "shared";

        return (
          <EditorViewModeButton
            key={option.value}
            pressed={pressed}
            onClick={() => onChange(option.value)}
            tooltip={option.title}
            disabled={disabled}
            className={cn("rounded-none", index > 0 && "border-l border-ide-border")}
            pressedClassName="bg-ide-active"
            unpressedClassName="bg-ide-active/25 hover:bg-ide-active/40"
          >
            {isShared ? (
              <SharedSlotLabel pressed={pressed} />
            ) : (
              <SeparateSlotLabel pressed={pressed} />
            )}
          </EditorViewModeButton>
        );
      })}
    </div>
  );
}
