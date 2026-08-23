import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, RefreshCw, TrendingUp, Globe2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dailyViews, trafficSources, topCountries, videos, channel, formatNum } from "@/features/youtube";

const ranges = ["Last 7 days", "Last 28 days", "Last 90 days", "This year"] as const;

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<string>("Last 28 days");
  const [metric, setMetric] = useState<string>("views");
  const [exported, setExported] = useState(false);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, [range, metric]);

  const data = useMemo(() => {
    const slice = range === "Last 7 days" ? 3 : range === "Last 90 days" ? dailyViews : dailyViews;
    const factor = range === "This year" ? 8.4 : range === "Last 90 days" ? 2.8 : 1;
    return slice.map(d => ({ ...d, views: Math.round(d.views * factor) }));
  }, [range]);

  const maxV = Math.max(...data.map(d => d.views));

  const exportCsv = () => {
    const rows = [["Day", "Views"], ...data.map(d => [d.day, String(d.views)])];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `analytics-${metric}-${range.replace(/ /g, "-").toLowerCase()}.csv`; a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  const totals = data.reduce((s, d) => s + d.views, 0);

  return (
    <div className="space-y-6" aria-live="polite">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <span className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-violet-500 text-white"><BarChart3 className="w-6 h-6" aria-hidden="true" /></span>
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Deep dive into your channel performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[160px]" aria-label="Date range"><SelectValue /></SelectTrigger>
            <SelectContent>{ranges.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="w-[140px]" aria-label="Metric"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="views">Views</SelectItem>
              <SelectItem value="watchtime">Watch time</SelectItem>
              <SelectItem value="subs">Subscribers</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCsv} aria-label="Export data as CSV">
            <Download className="w-4 h-4 mr-2" />{exported ? "Exported!" : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          : [
              { label: "Views", value: formatNum(totals) },
              { label: "Avg. view duration", value: "6:24" },
              { label: "CTR", value: "7.8%" },
              { label: "Engagement", value: `${channel.engagementRate}%` },
            ].map(s => (
              <Card key={s.label} className="rounded-2xl border-0 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl hover:shadow-xl transition-all duration-300">
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1 flex items-center gap-2">{s.value}<TrendingUp className="w-4 h-4 text-emerald-500" aria-hidden="true" /></p>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line chart */}
        <Card className="rounded-2xl border-0 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
          <CardHeader><CardTitle className="text-lg">Views trend</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-52 rounded-xl" /> : (
              <svg viewBox="0 0 400 200" className="w-full h-52" role="img" aria-label="Line chart of views over time">
                <defs>
                  <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const pts = data.map((d, i) => [ (i / (data.length - 1)) * 380 + 10, 190 - (d.views / maxV) * 160 ] as const);
                  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
                  const area = `${line} L${pts[pts.length - 1][0]},195 L${pts[0][0]},195 Z`;
                  return (
                    <>
                      <path d={area} fill="url(#lg)" />
                      <path d={line} fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" />
                      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#fff" stroke="#8b5cf6" strokeWidth="2" />)}
                    </>
                  );
                })()}
              </svg>
            )}
          </CardContent>
        </Card>

        {/* Pie: traffic sources */}
        <Card className="rounded-2xl border-0 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
          <CardHeader><CardTitle className="text-lg">Traffic sources</CardTitle></CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-6">
            {loading ? <Skeleton className="h-40 w-40 rounded-full" /> : (
              <div className="relative w-40 h-40 shrink-0" role="img" aria-label="Pie chart of traffic sources">
                <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
                  {(() => {
                    let offset = 0;
                    return trafficSources.map(s => {
                      const dash = `${s.value} ${100 - s.value}`;
                      const el = <circle key={s.label} cx="21" cy="21" r="15.9" fill="none" stroke={s.color} strokeWidth="8" strokeDasharray={dash} strokeDashoffset={-offset} />;
                      offset += s.value;
                      return el;
                    });
                  })()}
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{formatNum(totals)}</span>
              </div>
            )}
            <ul className="space-y-2 text-sm w-full">
              {trafficSources.map(s => (
                <li key={s.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: s.color }} />{s.label}</span>
                  <span className="font-medium">{s.value}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Countries + top videos bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-0 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Globe2 className="w-5 h-5" aria-hidden="true" />Top geographies</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? <Skeleton className="h-32 rounded-xl" /> : topCountries.map(c => (
              <div key={c.country}>
                <div className="flex justify-between text-sm mb-1"><span>{c.country}</span><span className="text-muted-foreground">{c.pct}%</span></div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
          <CardHeader><CardTitle className="text-lg">Top videos by views</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? <Skeleton className="h-32 rounded-xl" /> : [...videos].sort((a, b) => b.views - a.views).map(v => (
              <div key={v.id}>
                <div className="flex justify-between text-sm mb-1"><span className="truncate pr-2">{v.title}</span><span className="text-muted-foreground shrink-0">{formatNum(v.views)}</span></div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" style={{ width: `${(v.views / 22105) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" onClick={() => setLoading(true) || setTimeout(() => setLoading(false), 600)} aria-label="Refresh analytics data">
          <RefreshCw className="w-4 h-4 mr-2" />Refresh data
        </Button>
      </div>
    </div>
  );
};

export default Analytics;
