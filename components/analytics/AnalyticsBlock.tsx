"use client";

import { AnalyticsBarChartView } from "@/components/analytics/AnalyticsBarChartView";
import { AnalyticsMetrics } from "@/components/analytics/AnalyticsMetrics";
import { parseAnalyticsBlock } from "@/lib/analytics/types";

type AnalyticsBlockProps = {
  source: string;
};

function AnalyticsFallback({ source }: { source: string }) {
  return (
    <pre className="analytics-fallback overflow-x-auto text-xs text-ide-muted">
      <code>{source}</code>
    </pre>
  );
}

export function AnalyticsBlock({ source }: AnalyticsBlockProps) {
  const parsed = parseAnalyticsBlock(source.trim());
  if (!parsed) return <AnalyticsFallback source={source} />;

  switch (parsed.type) {
    case "metrics":
      return <AnalyticsMetrics block={parsed} />;
    case "bar-chart":
      return <AnalyticsBarChartView block={parsed} />;
    default:
      return <AnalyticsFallback source={source} />;
  }
}
