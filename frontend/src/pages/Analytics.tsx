import { useEffect, useState } from "react";
import { BarChart3, Download, RefreshCw, TrendingUp, Globe2, Eye, ThumbsUp, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChannelStats, Video, AnalyticsData, fetchChannel, fetchVideos, fetchAnalytics, formatNum } from "@/features/youtube";

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<string>("views");
  const [exported, setExported] = useState(false);
  const [channel, setChannel] = useState<ChannelStats | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  const load = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [ch, vids, an] = await Promise.all([
        fetchChannel(),
        fetchVideos(),
        fetchAnalytics().catch(() => null),
      ]);
      setChannel(ch);
      setVideos(vids);
      setAnalytics(an);
      setLoading(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load analytics. Please retry.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const days = analytics?.days ?? [];
  const useWatch = metric === "watchtime";
  const series = days.map(d => ({ day: d.day, value: useWatch ? d.watchMinutes : d.views }));
  const maxV = series.length ? Math.max(...series.map(s => s.value), 1) : 1;
  const totals = series.reduce((s, d) => s + d.value, 0);
  const totalLikes = videos.reduce((s, v) => s + v.likes, 0);
  const totalComments = videos.reduce((s, v) => s + v.comments, 0);
  const recentViews = videos.reduce((s, v) => s + v.views, 0);
  const maxVideoViews = videos.length ? Math.max(...videos.map(v => v.views), 1) : 1;

  const exportCsv = () => {
    const rows: (string | number)[][] = [
      ["Day", useWatch ? "Watch minutes" : "Views"],
      ...series.map(d => [d.day, d.value]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${metric}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  if (error && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" aria-live="polite">
        <Card className="p-8 text-center max-w-md">
          <p className="text-red-500 font-medium mb-4">{error}</p>
          <Button onClick={load} data-testid="analytics-retry-button"><RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" aria-live="polite" data-testid="analytics-page">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <span className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-violet-500 text-white"><BarChart3 className="w-6 h-6" aria-hidden="true" /></span>
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            {channel ? `${channel.channelName} · last 14 days (live data)` : "Loading channel…"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="w-[150px]" aria-label="Metric" data-testid="analytics-metric-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="views">Views</SelectItem>
              <SelectItem value="watchtime">Watch time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCsv} aria-label="Export data as CSV" data-testid="analytics-export-button" disabled={!series.length}>
            <Download className="w-4 h-4 mr-2" aria-hidden="true" />{exported ? "Exported!" : "Export CSV"}
          </Button>
          <Button variant="outline" onClick={load} disabled={refreshing} aria-label="Refresh analytics data" data-testid="analytics-refresh-button">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />Refresh
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="analytics-summary">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />) : [
          { label: useWatch ? "Watch minutes (14d)" : "Views (14d)", value: analytics?.available ? formatNum(totals) : "—" },
          { label: "Subscribers", value: formatNum(channel?.subscribers) },
          { label: "Likes (recent 5)", value: formatNum(totalLikes) },
          { label: "Comments (recent 5)", value: formatNum(totalComments) },
        ].map(s => (
          <Card key={s.label} className="rounded-2xl border-0 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl hover:shadow-xl transition-all duration-300">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1 flex items-center gap-2">{s.value}<TrendingUp className="w-4 h-4 text-emerald-500" aria-hidden="true" /></p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Views trend */}
      <Card className="rounded-2xl border-0 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl" data-testid="analytics-trend-chart">
        <CardHeader><CardTitle className="text-lg">{useWatch ? "Watch time trend" : "Views trend"} — last 14 days</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-52 rounded-xl" /> : !analytics?.available ? (
            <div className="h-52 flex items-center justify-center text-sm text-muted-foreground text-center px-6">
              {analytics?.message ?? "Daily breakdown is not available right now."}
            </div>
          ) : (
            <svg viewBox="0 0 400 200" className="w-full h-52" role="img" aria-label={`${useWatch ? "Watch time" : "Views"} over the last 14 days`}>
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = series.map((d, i) => [(i / Math.max(series.length - 1, 1)) * 380 + 10, 190 - (d.value / maxV) * 160] as const);
                const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
                const area = pts.length ? `${line} L${pts[pts.length - 1][0]},195 L${pts[0][0]},195 Z` : "";
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

      {/* Latest videos real performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-0 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl" data-testid="analytics-top-videos">
          <CardHeader><CardTitle className="text-lg">Latest videos by views</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? <Skeleton className="h-32 rounded-xl" /> : [...videos].sort((a, b) => b.views - a.views).map(v => (
              <div key={v.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="truncate pr-2">{v.title}</span>
                  <span className="text-muted-foreground shrink-0">{formatNum(v.views)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" style={{ width: `${(v.views / maxVideoViews) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl" data-testid="analytics-engagement">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Globe2 className="w-5 h-5" aria-hidden="true" />Engagement — recent 5 uploads</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? <Skeleton className="h-32 rounded-xl" /> : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <Eye className="w-5 h-5 mx-auto text-violet-500" aria-hidden="true" />
                    <p className="text-lg font-bold mt-1">{formatNum(recentViews)}</p>
                    <p className="text-xs text-muted-foreground">Views</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <ThumbsUp className="w-5 h-5 mx-auto text-blue-500" aria-hidden="true" />
                    <p className="text-lg font-bold mt-1">{formatNum(totalLikes)}</p>
                    <p className="text-xs text-muted-foreground">Likes</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <MessageSquare className="w-5 h-5 mx-auto text-emerald-500" aria-hidden="true" />
                    <p className="text-lg font-bold mt-1">{formatNum(totalComments)}</p>
                    <p className="text-xs text-muted-foreground">Comments</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Channel totals: {formatNum(channel?.totalViews)} views · {formatNum(channel?.subscribers)} subscribers · {channel?.videoCount ?? 0} videos
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
