import * as echarts from "echarts";

export function createLinearGradient(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: [number, string][],
): echarts.graphic.LinearGradient {
  return new echarts.graphic.LinearGradient(
    x0,
    y0,
    x1,
    y1,
    stops.map(([offset, color]) => ({ offset, color })),
  );
}

export function roundUpToNiceNumber(value: number): number {
  if (value <= 0) return 10;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  let step = 1;
  if (normalized > 1) step = 2;
  if (normalized > 2) step = 5;
  if (normalized > 5) step = 10;
  return step * magnitude;
}

interface ChartTheme {
  axisLine_lineStyle_color: string;
  axisLabel_color: string;
  markLine_lineStyle_color: string;
  markLine_label_color: string;
  itemStyle_color: string[];
}

export function getAxisBaseStyle(theme: ChartTheme) {
  return {
    axisLine: {
      lineStyle: {
        color: theme.axisLine_lineStyle_color,
        width: 1.5,
      },
    },
    axisTick: { show: false },
    axisLabel: {
      color: theme.axisLabel_color,
      fontSize: 10,
      fontWeight: 550,
    },
  };
}

export function getYAxisBase(theme: ChartTheme) {
  return {
    type: "value" as const,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: theme.axisLabel_color,
      fontSize: 10,
      fontWeight: 550,
    },
    splitLine: { show: false },
  };
}

export function getMarkLineConfig(value: number, theme: ChartTheme) {
  return {
    silent: true,
    symbol: "none",
    lineStyle: {
      color: theme.markLine_lineStyle_color,
      type: "dashed" as const,
      width: 1,
    },
    label: {
      show: true,
      position: "end" as const,
      formatter: "{c}",
      color: theme.markLine_label_color,
      fontSize: 10,
    },
    data: [{ yAxis: value, name: "峰值线" }],
  };
}

export function buildTooltip(
  formatter: (params: any) => string,
  tooltipStyle: Record<string, unknown>,
) {
  return {
    trigger: "axis" as const,
    ...tooltipStyle,
    formatter,
  };
}
