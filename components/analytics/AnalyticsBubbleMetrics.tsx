"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [boxSize, setBoxSize] = useState(360);

  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;

    const update = () => {
      const width = node.clientWidth;
      setBoxSize(Math.max(260, Math.min(width, 520)));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const placed = useMemo(
    () => packBubbles(block.items, boxSize, block.scale ?? "sqrt"),
    [block.items, block.scale, boxSize]
  );

  return (
    <Card className="my-4">
      {block.title ? (
        <CardHeader>
          <CardTitle>{block.title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={cn("space-y-3", block.title && "pt-3")}>
        {block.description ? (
          <p className="text-xs leading-relaxed text-ide-muted">{block.description}</p>
        ) : null}
        <div
          ref={panelRef}
          className="relative mx-auto w-full max-w-xl overflow-hidden rounded border border-ide-border bg-[#161616]"
          style={{ height: boxSize }}
        >
          {placed.map((bubble, index) => {
            const display =
              bubble.item.display ?? formatAnalyticsValue(bubble.item.value);
            const diameter = bubble.r * 2;
            const styles = bubbleStyle(bubble.item.emphasis, index);

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
                  className={cn(
                    "px-1 font-mono font-semibold leading-tight text-ide-text",
                    bubble.item.emphasis === "primary" ? "text-sm" : "text-[11px]"
                  )}
                >
                  {display}
                </span>
                <span className="mt-0.5 max-w-[90%] truncate px-1 text-[9px] uppercase tracking-wide text-ide-muted">
                  {bubble.item.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
