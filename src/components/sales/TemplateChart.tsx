import { useEffect, useRef, useState } from "react";
import chartUrl from "../../../assets/js/chart.min.js?url";
interface ChartInstance { destroy(): void; }
interface ChartConstructor { new(canvas: HTMLCanvasElement, config: unknown): ChartInstance; }
declare global { interface Window { Chart?: ChartConstructor; } }
let loading: Promise<ChartConstructor> | undefined;
function loadChart(): Promise<ChartConstructor> {
 if (window.Chart) return Promise.resolve(window.Chart);
 if (!loading) loading = new Promise((resolve, reject) => {
  const script = document.createElement("script"); script.src = chartUrl;
  script.onload = () => window.Chart ? resolve(window.Chart) : reject(new Error("Không tải được Chart.js"));
  script.onerror = () => { loading = undefined; reject(new Error("Không tải được Chart.js")); };
  document.head.appendChild(script);
 });
 return loading;
}
export default function TemplateChart({ values, labels, bars = false }: { values: readonly number[]; labels: readonly string[]; bars?: boolean }) {
 const canvas = useRef<HTMLCanvasElement>(null);
 const [error, setError] = useState("");
 useEffect(() => {
  let cancelled = false; let chart: ChartInstance | undefined;
  function draw(Chart: ChartConstructor) {
   if (cancelled || !canvas.current) return;
   chart?.destroy();
   const dark = document.documentElement.classList.contains("dark");
   const tick = dark ? "#94A3B8" : "#6B7280";
   const peak = values.indexOf(Math.max(...values));
   chart = new Chart(canvas.current, {
    type: bars ? "bar" : "line",
    data: { labels: [...labels], datasets: [{ label: bars ? "Khách hàng" : "Đơn hàng", data: [...values],
     borderColor: bars ? values.map((_,i) => i === peak ? "#22B573" : "transparent") : "#22B573",
     borderWidth: bars ? 0 : 2.5, tension: 0.4, fill: !bars, borderRadius: 6, borderSkipped: false,
     backgroundColor: bars ? values.map((_,i) => i === peak ? "#22B573" : "rgba(34,181,115,0.18)") : (context: {chart: {ctx: CanvasRenderingContext2D; chartArea?: {top: number; bottom: number}}}) => {
      const {ctx,chartArea} = context.chart; if (!chartArea) return "transparent";
      const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      gradient.addColorStop(0,"rgba(34,181,115,0.18)"); gradient.addColorStop(1,"rgba(34,181,115,0.01)"); return gradient;
     },
     pointBackgroundColor: values.map((_,i) => i === peak ? "#22B573" : "transparent"),
     pointBorderColor: values.map((_,i) => i === peak ? "#fff" : "transparent"),
     pointBorderWidth: values.map((_,i) => i === peak ? 3 : 0), pointRadius: values.map((_,i) => i === peak ? 8 : 3),
     pointHoverRadius: 6, pointHoverBackgroundColor: "#22B573", pointHoverBorderColor: "#fff", pointHoverBorderWidth: 2
    }]},
    options: { responsive: true, maintainAspectRatio: false, interaction: {mode: "index", intersect: false},
     plugins: { legend: {display:false}, tooltip: {backgroundColor: dark ? "rgba(30,41,59,0.97)" : "rgba(23,33,43,0.95)", padding:12, cornerRadius:10,
      ...(!bars ? {titleFont: {size:12, weight:"600"}, bodyFont: {size:13}} : {}),
      callbacks: {label: (c: {parsed: {y: number}}) => bars ? ` ${c.parsed.y} khách hàng` : ` ${c.parsed.y.toLocaleString("vi-VN")} VND`}}},
     scales: { x: {grid: {display:false}, border: {display:false}, ticks: {color:tick,font:{size:11,weight:"500"}}},
      y: {grid: {color:dark ? "rgba(51,65,85,0.8)" : "rgba(232,237,241,0.8)", ...(!bars ? {drawBorder:false} : {})},
       border: {display:false, ...(!bars ? {dash:[4,4]} : {})},
       ticks: {color:tick,font:{size:11}, callback:(v:number) => bars ? (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v) : `${v.toLocaleString("vi-VN")} VND`}}}
    }
   });
  }
  const observer = new MutationObserver(() => { if (window.Chart) draw(window.Chart); });
  observer.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
  loadChart().then(draw).catch(() => { if (!cancelled) setError("Không tải được biểu đồ."); });
  return () => { cancelled = true; observer.disconnect(); chart?.destroy(); };
 }, [values, labels, bars]);
 return error ? <p role="alert">{error}</p> : <canvas ref={canvas} role="img" aria-label={bars ? "Lượng khách theo thời gian" : "Doanh thu theo thời gian"} />;
}
