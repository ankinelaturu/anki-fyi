export type AnalyticsMetricItem = {
  label: string;
  value: number | string;
};

export type AnalyticsBarChartDataPoint = {
  label: string;
  value: number;
};

export type AnalyticsMetricsBlock = {
  type: "metrics";
  items: AnalyticsMetricItem[];
};

export type AnalyticsBarChartBlock = {
  type: "bar-chart";
  title?: string;
  data: AnalyticsBarChartDataPoint[];
};

export type AnalyticsBubbleScale = "sqrt" | "linear" | "log";

export type AnalyticsBubbleItem = {
  label: string;
  value: number;
  display?: string;
  emphasis?: "primary" | string;
};

export type AnalyticsBubbleMetricsBlock = {
  type: "bubble-metrics";
  title?: string;
  description?: string;
  scale?: AnalyticsBubbleScale;
  items: AnalyticsBubbleItem[];
};

export type AnalyticsPieItem = {
  label: string;
  value: number;
  display?: string;
  emphasis?: "primary" | string;
};

export type AnalyticsPieChartBlock = {
  type: "pie-chart";
  title?: string;
  description?: string;
  items: AnalyticsPieItem[];
};

export type AnalyticsBlockData =
  | AnalyticsMetricsBlock
  | AnalyticsBarChartBlock
  | AnalyticsBubbleMetricsBlock
  | AnalyticsPieChartBlock;

export type AnalyticsBlockType = AnalyticsBlockData["type"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMetricItem(value: unknown): AnalyticsMetricItem | null {
  if (!isRecord(value)) return null;
  if (typeof value.label !== "string") return null;
  if (typeof value.value !== "number" && typeof value.value !== "string") return null;
  return { label: value.label, value: value.value };
}

function parseMetricsBlock(raw: Record<string, unknown>): AnalyticsMetricsBlock | null {
  if (!Array.isArray(raw.items)) return null;
  const items = raw.items.map(parseMetricItem).filter((item): item is AnalyticsMetricItem => item !== null);
  if (items.length === 0) return null;
  return { type: "metrics", items };
}

function parseSeriesItem(value: unknown): AnalyticsBubbleItem | null {
  if (!isRecord(value)) return null;
  if (typeof value.label !== "string") return null;
  if (typeof value.value !== "number" || Number.isNaN(value.value)) return null;
  return {
    label: value.label,
    value: value.value,
    display: typeof value.display === "string" ? value.display : undefined,
    emphasis: typeof value.emphasis === "string" ? value.emphasis : undefined,
  };
}

function parseBubbleItem(value: unknown): AnalyticsBubbleItem | null {
  return parseSeriesItem(value);
}

function parsePieItem(value: unknown): AnalyticsPieItem | null {
  return parseSeriesItem(value);
}

function parseBubbleScale(value: unknown): AnalyticsBubbleScale {
  if (value === "linear" || value === "log" || value === "sqrt") return value;
  return "sqrt";
}

function parseBubbleMetricsBlock(raw: Record<string, unknown>): AnalyticsBubbleMetricsBlock | null {
  if (!Array.isArray(raw.items)) return null;
  const items = raw.items
    .map(parseBubbleItem)
    .filter((item): item is AnalyticsBubbleItem => item !== null);
  if (items.length === 0) return null;
  return {
    type: "bubble-metrics",
    title: typeof raw.title === "string" ? raw.title : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    scale: parseBubbleScale(raw.scale),
    items,
  };
}

function parsePieChartBlock(raw: Record<string, unknown>): AnalyticsPieChartBlock | null {
  if (!Array.isArray(raw.items)) return null;
  const items = raw.items.map(parsePieItem).filter((item): item is AnalyticsPieItem => item !== null);
  if (items.length === 0) return null;
  return {
    type: "pie-chart",
    title: typeof raw.title === "string" ? raw.title : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    items,
  };
}

function parseBarChartBlock(raw: Record<string, unknown>): AnalyticsBarChartBlock | null {
  if (!Array.isArray(raw.data)) return null;
  const data: AnalyticsBarChartDataPoint[] = [];
  for (const point of raw.data) {
    if (!isRecord(point)) continue;
    if (typeof point.label !== "string") continue;
    if (typeof point.value !== "number" || Number.isNaN(point.value)) continue;
    data.push({ label: point.label, value: point.value });
  }
  if (data.length === 0) return null;
  return {
    type: "bar-chart",
    title: typeof raw.title === "string" ? raw.title : undefined,
    data,
  };
}

export function parseAnalyticsBlock(source: string): AnalyticsBlockData | null {
  try {
    const raw = JSON.parse(source) as unknown;
    if (!isRecord(raw) || typeof raw.type !== "string") return null;

    switch (raw.type as AnalyticsBlockType) {
      case "metrics":
        return parseMetricsBlock(raw);
      case "bar-chart":
        return parseBarChartBlock(raw);
      case "bubble-metrics":
        return parseBubbleMetricsBlock(raw);
      case "pie-chart":
        return parsePieChartBlock(raw);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function formatAnalyticsValue(value: number | string): string {
  if (typeof value === "string") return value;
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return value.toLocaleString("en-US");
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
