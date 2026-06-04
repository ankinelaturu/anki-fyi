"use client";

import { AnalyticsBarChartView } from "@/components/analytics/AnalyticsBarChartView";
import { AnalyticsBubbleMetrics } from "@/components/analytics/AnalyticsBubbleMetrics";
import { AnalyticsMetrics } from "@/components/analytics/AnalyticsMetrics";
import { AnalyticsPieChartView } from "@/components/analytics/AnalyticsPieChartView";
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
    case "bubble-metrics":
      return <AnalyticsBubbleMetrics block={parsed} />;
    case "pie-chart":
      return <AnalyticsPieChartView block={parsed} />;
    default:
      return <AnalyticsFallback source={source} />;
  }
}
