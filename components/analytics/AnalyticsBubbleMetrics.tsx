"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { packBubbles } from "@/lib/analytics/bubble-layout";
import {
  formatAnalyticsValue,
  type AnalyticsBubbleMetricsBlock,
} from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

type AnalyticsBubbleMetricsProps = {
  block: AnalyticsBubbleMetricsBlock;
};

const BUBBLE_FILL = "rgba(86, 156, 214, 0.18)";
const BUBBLE_FILL_PRIMARY = "rgba(86, 156, 214, 0.32)";
const BUBBLE_BORDER = "rgba(86, 156, 214, 0.45)";
const BUBBLE_BORDER_PRIMARY = "rgba(86, 156, 214, 0.7)";
const BUBBLE_ALT_FILLS = [
  "rgba(78, 201, 176, 0.16)",
  "rgba(197, 134, 192, 0.14)",
  "rgba(220, 220, 170, 0.12)",
];

const PANEL_MIN_HEIGHT = 450;

/** Font sizes derived from bubble radius so text scales with circle size. */
function bubbleFontSizes(r: number, emphasis?: string) {
  const diameter = r * 2;
  const primaryBoost = emphasis === "primary" ? 1.08 : 1;
  const valueFont = Math.min(26, Math.max(10, diameter * 0.132 * primaryBoost));
  const labelFont = Math.min(15, Math.max(8, diameter * 0.085));
  const labelGap = Math.max(2, r * 0.04);
  return { valueFont, labelFont, labelGap };
}

function bubbleStyle(emphasis: string | undefined, index: number) {
  if (emphasis === "primary") {
    return {
      background: BUBBLE_FILL_PRIMARY,
      borderColor: BUBBLE_BORDER_PRIMARY,
    };
  }
  return {
    background: BUBBLE_ALT_FILLS[index % BUBBLE_ALT_FILLS.length] ?? BUBBLE_FILL,
    borderColor: BUBBLE_BORDER,
  };
}

export function AnalyticsBubbleMetrics({ block }: AnalyticsBubbleMetricsProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 400, height: PANEL_MIN_HEIGHT });

  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;

    const update = () => {
      setSize({
        width: Math.max(240, node.clientWidth),
        height: Math.max(PANEL_MIN_HEIGHT, node.clientHeight),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const placed = useMemo(
    () => packBubbles(block.items, size.width, size.height, block.scale ?? "sqrt"),
    [block.items, block.scale, size.height, size.width]
  );

  return (
    <Card className="my-4 overflow-hidden">
      {block.title ? (
        <CardHeader>
          <CardTitle>{block.title}</CardTitle>
          {block.description ? (
            <p className="mt-1 text-xs font-normal normal-case tracking-normal text-ide-muted">
              {block.description}
            </p>
          ) : null}
        </CardHeader>
      ) : null}
      <div
        ref={panelRef}
        className={cn(
          "relative w-full overflow-hidden",
          !block.title && block.description && "border-b border-ide-border px-3 py-2"
        )}
        style={{ minHeight: PANEL_MIN_HEIGHT }}
      >
        {!block.title && block.description ? (
          <p className="text-xs leading-relaxed text-ide-muted">{block.description}</p>
        ) : null}
        {placed.map((bubble, index) => {
          const display = bubble.item.display ?? formatAnalyticsValue(bubble.item.value);
          const diameter = bubble.r * 2;
          const styles = bubbleStyle(bubble.item.emphasis, index);
          const fonts = bubbleFontSizes(bubble.r, bubble.item.emphasis);

          return (
            <div
              key={bubble.item.label}
              className="absolute flex flex-col items-center justify-center rounded-full border text-center transition-transform hover:z-10 hover:scale-[1.03]"
              style={{
                width: diameter,
                height: diameter,
                left: bubble.x - bubble.r,
                top: bubble.y - bubble.r,
                background: styles.background,
                borderColor: styles.borderColor,
              }}
              title={`${bubble.item.label}: ${formatAnalyticsValue(bubble.item.value)}`}
            >
              <span
                className="px-1 font-mono font-semibold leading-tight text-ide-text"
                style={{ fontSize: fonts.valueFont }}
              >
                {display}
              </span>
              <span
                className="max-w-[90%] truncate px-1 uppercase tracking-wide text-ide-muted"
                style={{ fontSize: fonts.labelFont, marginTop: fonts.labelGap }}
              >
                {bubble.item.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
