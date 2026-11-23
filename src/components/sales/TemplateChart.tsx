import { useEffect, useRef, useState } from "react";
import chartUrl from "../../../assets/js/chart.min.js?url";

interface ChartInstance {
  destroy(): void;
}
interface ChartConstructor {
  new(canvas: HTMLCanvasElement, config: unknown): ChartInstance;
}
declare global {
  interface Window {
    Chart?: ChartConstructor;
  }
}

let loading: Promise<ChartConstructor> | undefined;
function loadChart(): Promise<ChartConstructor> {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = chartUrl;
      script.onload = () =>
        window.Chart
          ? resolve(window.Chart)
          : reject(new Error("Không tải được Chart.js"));
      script.onerror = () => {
        loading = undefined;
        reject(new Error("Không tải được Chart.js"));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

export interface ChartSeriesItem {
  label: string;
  data: readonly number[];
  color?: string;
}

export interface TemplateChartProps {
  values?: readonly number[];
  labels: readonly string[];
  series?: readonly ChartSeriesItem[];
  bars?: boolean;
  seriesLabel?: string;
  unitSuffix?: string;
  xAxisTitle?: string;
  yAxisTitle?: string;
}

export default function TemplateChart({
  values = [],
  labels,
  series,
  bars = false,
  seriesLabel = "Doanh thu",
  unitSuffix = "Tr.đ",
  xAxisTitle,
  yAxisTitle,
}: TemplateChartProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let chart: ChartInstance | undefined;

    function draw(Chart: ChartConstructor) {
      if (cancelled || !canvas.current) return;
      chart?.destroy();
      const dark = document.documentElement.classList.contains("dark");
      const tick = dark ? "#94A3B8" : "#6B7280";
      const gridColor = dark ? "rgba(51,65,85,0.6)" : "rgba(226,232,240,0.9)";

      const datasets =
        series && series.length > 0
          ? series.map((s) => {
            const color = s.color ?? "#10B981";
            return {
              label: s.label,
              data: [...s.data],
              borderColor: bars ? "transparent" : color,
              backgroundColor: bars ? color : `${color}22`,
              borderWidth: bars ? 0 : 2.2,
              tension: 0.35,
              fill: series.length === 1 && !bars,
              borderRadius: bars ? 5 : 0,
              pointRadius: 3,
              pointHoverRadius: 5,
              pointBackgroundColor: color,
            };
          })
          : [
            (() => {
              const peak =
                values.length > 0 ? values.indexOf(Math.max(...values)) : -1;
              return {
                label: seriesLabel,
                data: [...values],
                borderColor: bars
                  ? values.map((_, i) => (i === peak ? "#10B981" : "transparent"))
                  : "#10B981",
                borderWidth: bars ? 0 : 2.5,
                tension: 0.38,
                fill: !bars,
                borderRadius: 6,
                borderSkipped: false,
                backgroundColor: bars
                  ? values.map((_, i) =>
                    i === peak ? "#10B981" : "rgba(16,185,129,0.22)",
                  )
                  : (context: {
                    chart: {
                      ctx: CanvasRenderingContext2D;
                      chartArea?: { top: number; bottom: number };
                    };
                  }) => {
                    const { ctx, chartArea } = context.chart;
                    if (!chartArea) return "transparent";
                    const gradient = ctx.createLinearGradient(
                      0,
                      chartArea.top,
                      0,
                      chartArea.bottom,
                    );
                    gradient.addColorStop(0, "rgba(16,185,129,0.2)");
                    gradient.addColorStop(1, "rgba(16,185,129,0.01)");
                    return gradient;
                  },
                pointBackgroundColor: values.map((_, i) =>
                  i === peak ? "#10B981" : "transparent",
                ),
                pointBorderColor: values.map((_, i) =>
                  i === peak ? "#fff" : "transparent",
                ),
                pointBorderWidth: values.map((_, i) => (i === peak ? 2.5 : 0)),
                pointRadius: values.map((_, i) => (i === peak ? 6 : 2.5)),
                pointHoverRadius: 5,
                pointHoverBackgroundColor: "#10B981",
              };
            })(),
          ];

      chart = new Chart(canvas.current, {
        type: bars ? "bar" : "line",
        data: { labels: [...labels], datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              display: Boolean(series && series.length > 1),
              position: "top",
              labels: {
                color: tick,
                boxWidth: 10,
                font: {
                  size: 11,
                  family: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
                },
              },
            },
            tooltip: {
              backgroundColor: dark
                ? "rgba(15,23,42,0.96)"
                : "rgba(15,23,42,0.94)",
              padding: 10,
              cornerRadius: 8,
              titleFont: {
                family: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
              },
              bodyFont: {
                family: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
              },
              callbacks: {
                label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
                  const lbl = ctx.dataset?.label ? `${ctx.dataset.label}: ` : "";
                  const val = (ctx.parsed.y ?? 0).toLocaleString("vi-VN");
                  return `${lbl}${val} ${unitSuffix}`.trim();
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              title: xAxisTitle
                ? {
                  display: true,
                  text: xAxisTitle,
                  color: tick,
                  font: {
                    size: 11,
                    family: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
                  },
                }
                : undefined,
              ticks: {
                color: tick,
                font: {
                  size: 11,
                  weight: "500",
                  family: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
                },
              },
            },
            y: {
              grid: { color: gridColor },
              border: { display: false },
              title: yAxisTitle
                ? {
                  display: true,
                  text: yAxisTitle,
                  color: tick,
                  font: {
                    size: 11,
                    family: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
                  },
                }
                : undefined,
              ticks: {
                color: tick,
                font: {
                  size: 11,
                  family: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
                },
                callback: (v: number) => v.toLocaleString("vi-VN"),
              },
            },
          },
        },
      });
    }

    const observer = new MutationObserver(() => {
      if (window.Chart) draw(window.Chart);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    loadChart()
      .then(draw)
      .catch(() => {
        if (!cancelled) setError("Không tải được biểu đồ.");
      });

    return () => {
      cancelled = true;
      observer.disconnect();
      chart?.destroy();
    };
  }, [values, labels, series, bars, seriesLabel, unitSuffix, xAxisTitle, yAxisTitle]);

  return error ? (
    <p role="alert" className="text-xs text-rose-600 p-4">
      {error}
    </p>
  ) : (
    <canvas
      ref={canvas}
      role="img"
      aria-label={`${seriesLabel} theo ${xAxisTitle ?? "thời gian"}`}
    />
  );
}
