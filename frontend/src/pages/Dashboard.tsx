import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Users, Eye, Film, TrendingUp, PlayCircle, ThumbsUp, MessageSquare, Clock, RefreshCw, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { channel, videos, dailyViews, formatNum } from "@/features/youtube";

const thumbGradients: Record<string, string> = {
  grad1: "from-violet-500 to-blue-500",
  grad2: "from-blue-500 to-cyan-400",
  grad3: "from-purple-600 to-pink-500",
  grad4: "from-amber-500 to-orange-500",
  grad5: "from-emerald-500 to-teal-500",
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string>("");

  const load = () => {
    setRefreshing(true);
    setError(null);
    // Simulated fetch — real YouTube proxy wiring is pending
    setTimeout(() => {
      try {
        setLastSync(new Date().toLocaleTimeString());
        setLoading(false);
        setRefreshing(false);
      } catch {
        setError("Failed to load channel data. Please retry.");
        setRefreshing(false);
      }
    }, 700);
  };

  useEffect(() => { load(); }, []);

  const maxViews = Math.max(...dailyViews.map(d => d.views));

  const metrics = [
    { label: "Subscribers", value: formatNum(channel.subscribers), delta: `+${channel.subsGained - channel.subsLost} this month`, icon: Users, grad: "from-violet-600 to-blue-500" },
    { label: "Total Views", value: formatNum(channel.totalViews), delta: `+${formatNum(channel.viewsLast28)} in 28 days`, icon: Eye, grad: "from-blue-600 to-cyan-500" },
    { label: "Videos", value: `${channel.videoCount}`, delta: "5 published recently", icon: Film, grad: "from-purple-600 to-pink-500" },
    { label: "Watch Hours", value: formatNum(channel.watchHours), delta: `${channel.engagementRate}% engagement`, icon: Clock, grad: "from-amber-500 to-orange-500" },
  ];

  if (error && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" aria-live="polite">
        <Card className="p-8 text-center max-w-md">
          <p className="text-red-500 font-medium mb-4">{error}</p>
          <Button onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" aria-live="polite">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <span className="p-2 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 text-white"><LayoutDashboard className="w-6 h-6" aria-hidden="true" /></span>
            Channel Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            {channel.channelName} · {channel.handle}
            {lastSync && <span className="ml-2 text-xs">Synced {lastSync}</span>}
          </p>
        </div>
        <Button onClick={load} disabled={refreshing} aria-label="Refresh channel statistics">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Syncing…" : "Refresh"}
        </Button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          : metrics.map(m => (
            <Card key={m.label} className="rounded-2xl border-0 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-300 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{m.label}</p>
                    <p className="text-3xl font-bold mt-1">{m.value}</p>
                  </div>
                  <span className={`p-2.5 rounded-xl text-white bg-gradient-to-br ${m.grad}`}>
                    <m.icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                </div>
                <p className="text-xs text-emerald-600 font-medium mt-3 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" aria-hidden="true" />{m.delta}
                </p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Chart + latest videos */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 rounded-2xl border-0 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
          <CardHeader><CardTitle className="text-lg">Views — last 28 days</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-56 rounded-xl" /> : (
              <div className="flex items-end gap-2 md:gap-3 h-56" role="img" aria-label="Bar chart of daily views over the last 28 days">
                {dailyViews.map(d => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">{formatNum(d.views)}</span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-blue-400 transition-all duration-300 group-hover:from-violet-500 group-hover:to-cyan-400"
                      style={{ height: `${(d.views / maxViews) * 180}px` }}
                    />
                    <span className="text-[10px] text-muted-foreground hidden md:block">{d.day.split(" ")[1]}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 rounded-2xl border-0 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg">Latest videos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
              : videos.slice(0, 4).map(v => (
                <div key={v.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className={`w-16 h-10 rounded-lg shrink-0 flex items-center justify-center text-white text-[10px] bg-gradient-to-br ${thumbGradients[v.thumbnail]}`}>
                    {v.duration}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{v.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" aria-hidden="true" />{formatNum(v.views)}</span>
                      <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" aria-hidden="true" />{formatNum(v.likes)}</span>
                    </p>
                  </div>
                </div>
              ))}
            {!loading && (
              <NavLink to="/analytics" className="block">
                <span className="flex items-center justify-center gap-2 text-sm text-violet-600 hover:text-violet-500 font-medium py-2">
                  <PlayCircle className="w-4 h-4" aria-hidden="true" />View full analytics
                </span>
              </NavLink>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity table */}
      <Card className="rounded-2xl border-0 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
        <CardHeader><CardTitle className="text-lg">Recent activity</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-48 rounded-xl" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="pb-3 font-medium">Video</th>
                    <th className="pb-3 font-medium hidden md:table-cell">Published</th>
                    <th className="pb-3 font-medium text-right">Views</th>
                    <th className="pb-3 font-medium text-right hidden sm:table-cell">Likes</th>
                    <th className="pb-3 font-medium text-right hidden lg:table-cell">Comments</th>
                    <th className="pb-3 font-medium hidden lg:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map(v => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 pr-4 font-medium max-w-[240px] truncate">{v.title}</td>
                      <td className="py-3 hidden md:table-cell text-muted-foreground">{v.publishedAt}</td>
                      <td className="py-3 text-right font-medium">{v.views.toLocaleString()}</td>
                      <td className="py-3 text-right hidden sm:table-cell text-muted-foreground">{v.likes.toLocaleString()}</td>
                      <td className="py-3 text-right hidden lg:table-cell text-muted-foreground">{v.comments.toLocaleString()}</td>
                      <td className="py-3 hidden lg:table-cell"><Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Public</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
