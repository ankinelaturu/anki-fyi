"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAnalyticsValue, type AnalyticsBarChartBlock } from "@/lib/analytics/types";

const CHART_BAR = "#569cd6";
const CHART_AXIS = "#858585";
const CHART_GRID = "#333333";
const CHART_TOOLTIP_BG = "#252526";
const CHART_TOOLTIP_BORDER = "#454545";

type AnalyticsBarChartViewProps = {
  block: AnalyticsBarChartBlock;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  return (
    <div
      className="rounded border px-2 py-1 text-xs"
      style={{ background: CHART_TOOLTIP_BG, borderColor: CHART_TOOLTIP_BORDER }}
    >
      <div className="text-ide-muted">{label}</div>
      <div className="font-mono text-ide-text">
        {typeof value === "number" ? formatAnalyticsValue(value) : "—"}
      </div>
    </div>
  );
}

export function AnalyticsBarChartView({ block }: AnalyticsBarChartViewProps) {
  const data = block.data.map((point) => ({
    name: point.label,
    value: point.value,
  }));

  return (
    <Card className="my-4">
      {block.title ? (
        <CardHeader>
          <CardTitle>{block.title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={block.title ? "pt-3" : undefined}>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: CHART_AXIS, fontSize: 11 }}
                axisLine={{ stroke: CHART_GRID }}
                tickLine={{ stroke: CHART_GRID }}
                interval={0}
                angle={-18}
                textAnchor="end"
                height={56}
              />
              <YAxis
                tick={{ fill: CHART_AXIS, fontSize: 11 }}
                axisLine={{ stroke: CHART_GRID }}
                tickLine={{ stroke: CHART_GRID }}
                tickFormatter={(value) => formatAnalyticsValue(value)}
                width={72}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(86, 156, 214, 0.12)" }} />
              <Bar dataKey="value" fill={CHART_BAR} radius={[3, 3, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
