"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatAnalyticsValue, type AnalyticsMetricsBlock } from "@/lib/analytics/types";

type AnalyticsMetricsProps = {
  block: AnalyticsMetricsBlock;
};

export function AnalyticsMetrics({ block }: AnalyticsMetricsProps) {
  return (
    <div className="my-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {block.items.map((item) => (
        <Card key={item.label}>
          <CardContent className="space-y-1 p-3">
            <div className="font-mono text-lg font-semibold leading-tight text-ide-text">
              {formatAnalyticsValue(item.value)}
            </div>
            <div className="text-[11px] uppercase tracking-wide text-ide-muted">{item.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
