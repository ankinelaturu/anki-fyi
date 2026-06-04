"use client";

import { useMemo } from "react";
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  type PieLabelRenderProps,
  type PieSectorShapeProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAnalyticsValue, type AnalyticsPieChartBlock } from "@/lib/analytics/types";

const CHART_TOOLTIP_BG = "#252526";
const CHART_TOOLTIP_BORDER = "#454545";
const EXPLODE_OFFSET = 14;
const PIE_OUTER_RADIUS = "82%";
const LABEL_OFFSET = 30;
const MIN_LABEL_PERCENT = 0.03;

const PIE_COLORS = ["#569cd6", "#4ec9b0", "#c586c0", "#dcdcaa", "#ce9178", "#9cdcfe"];
const PIE_COLOR_PRIMARY = "#7ec8ff";

type PieDatum = {
  name: string;
  value: number;
  display?: string;
  emphasis?: string;
  fill: string;
};

type AnalyticsPieChartViewProps = {
  block: AnalyticsPieChartBlock;
};

type SliceGeometry = {
  rcx: number;
  rcy: number;
  edgeX: number;
  edgeY: number;
  elbowX: number;
  elbowY: number;
  labelX: number;
  labelY: number;
  textAnchor: "start" | "end";
};

function sliceGeometry(
  cx: number,
  cy: number,
  midAngle: number,
  outerRadius: number,
  payload?: PieDatum
): SliceGeometry {
  const explode = payload?.emphasis === "primary" ? EXPLODE_OFFSET : 0;
  const rad = (-midAngle * Math.PI) / 180;
  const rcx = cx + explode * Math.cos(rad);
  const rcy = cy + explode * Math.sin(rad);
  const edgeX = rcx + outerRadius * Math.cos(rad);
  const edgeY = rcy + outerRadius * Math.sin(rad);
  const elbowRadius = outerRadius + 10;
  const elbowX = rcx + elbowRadius * Math.cos(rad);
  const elbowY = rcy + elbowRadius * Math.sin(rad);
  const labelX = rcx + (outerRadius + LABEL_OFFSET) * Math.cos(rad);
  const labelY = rcy + (outerRadius + LABEL_OFFSET) * Math.sin(rad);
  const textAnchor: "start" | "end" = Math.cos(rad) >= 0 ? "start" : "end";

  return { rcx, rcy, edgeX, edgeY, elbowX, elbowY, labelX, labelY, textAnchor };
}

function PieSector(props: PieSectorShapeProps & { payload?: PieDatum }) {
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle,
    endAngle,
    fill,
    payload,
  } = props;

  const { rcx, rcy } = sliceGeometry(cx, cy, midAngle, outerRadius, payload);

  return (
    <Sector
      cx={rcx}
      cy={rcy}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="#1b1b1b"
      strokeWidth={1}
    />
  );
}

function SliceLabelLine(props: PieLabelRenderProps) {
  const cx = props.cx ?? 0;
  const cy = props.cy ?? 0;
  const midAngle = props.midAngle ?? 0;
  const outerRadius = props.outerRadius ?? 0;
  const percent = props.percent ?? 0;
  const payload = props.payload as PieDatum | undefined;

  if (percent < MIN_LABEL_PERCENT || !payload) return <g />;

  const { edgeX, edgeY, elbowX, elbowY, labelX, labelY } = sliceGeometry(
    cx,
    cy,
    midAngle,
    outerRadius,
    payload
  );

  return (
    <polyline
      points={`${edgeX},${edgeY} ${elbowX},${elbowY} ${labelX},${labelY}`}
      stroke="#555555"
      strokeWidth={1}
      fill="none"
    />
  );
}

function SliceLabel(props: PieLabelRenderProps) {
  const cx = props.cx ?? 0;
  const cy = props.cy ?? 0;
  const midAngle = props.midAngle ?? 0;
  const outerRadius = props.outerRadius ?? 0;
  const percent = props.percent ?? 0;
  const payload = props.payload as PieDatum | undefined;

  if (percent < MIN_LABEL_PERCENT || !payload) return null;

  const { labelX, labelY, textAnchor } = sliceGeometry(cx, cy, midAngle, outerRadius, payload);
  const valueText = payload.display ?? formatAnalyticsValue(payload.value);
  const dx = textAnchor === "start" ? 6 : -6;
  const anchorX = labelX + dx;

  return (
    <g>
      <text
        x={anchorX}
        y={labelY - 8}
        textAnchor={textAnchor}
        fill="#a0a0a0"
        fontSize={11}
      >
        {payload.name}
      </text>
      <text
        x={anchorX}
        y={labelY + 8}
        textAnchor={textAnchor}
        fill="#e0e0e0"
        fontSize={10}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        {valueText}
      </text>
    </g>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: PieDatum; value?: number }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  const value = payload[0]?.value;
  if (!item) return null;

  return (
    <div
      className="rounded border px-2 py-1 text-xs"
      style={{ background: CHART_TOOLTIP_BG, borderColor: CHART_TOOLTIP_BORDER }}
    >
      <div className="text-ide-muted">{item.name}</div>
      <div className="font-mono text-ide-text">
        {item.display ?? (typeof value === "number" ? formatAnalyticsValue(value) : "—")}
      </div>
    </div>
  );
}

export function AnalyticsPieChartView({ block }: AnalyticsPieChartViewProps) {
  const { chartData, total } = useMemo(() => {
    const totalValue = block.items.reduce((sum, item) => sum + item.value, 0);
    const data: PieDatum[] = block.items.map((item, index) => ({
      name: item.label,
      value: item.value,
      display: item.display,
      emphasis: item.emphasis,
      fill:
        item.emphasis === "primary"
          ? PIE_COLOR_PRIMARY
          : PIE_COLORS[index % PIE_COLORS.length]!,
    }));
    return { chartData: data, total: totalValue };
  }, [block.items]);

  return (
    <Card className="my-4">
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
      <CardContent className={block.title ? "pt-3" : undefined}>
        <div className="relative h-[28rem] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 20, right: 28, bottom: 28, left: 28 }}>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={PIE_OUTER_RADIUS}
                shape={(props) => <PieSector {...props} payload={props.payload as PieDatum} />}
                labelLine={SliceLabelLine}
                label={SliceLabel}
                isAnimationActive={false}
              />
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {total > 0 ? (
            <p className="pointer-events-none absolute bottom-2 right-3 text-right font-mono text-[11px] text-ide-muted">
              Total: {formatAnalyticsValue(total)}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
