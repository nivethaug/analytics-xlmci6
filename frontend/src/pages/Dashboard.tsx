import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Eye, Film, RefreshCw, Youtube, Twitter as XIcon, Heart, Repeat2,
  MessageCircle, ThumbsUp, PlayCircle, TrendingUp, Zap, CalendarDays, Sparkles, Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChannelStats, Video, AnalyticsData, fetchChannel, fetchVideos, fetchAnalytics, formatNum, formatDate } from "@/features/youtube";
import { TwitterProfile, Tweet, fetchProfile, fetchTweets } from "@/features/twitter";

const timeAgo = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (isNaN(d)) return "";
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const YtBadge = () => (
  <Badge className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 hover:bg-red-100">
    <Youtube className="w-3 h-3" aria-hidden="true" /> YouTube
  </Badge>
);
const XBadge = () => (
  <Badge className="gap-1 bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-0 hover:bg-slate-200">
    <XIcon className="w-3 h-3" aria-hidden="true" /> X
  </Badge>
);

type PlatformFilter = "all" | "youtube" | "x";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string>("");
  const [channel, setChannel] = useState<ChannelStats | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [profile, setProfile] = useState<TwitterProfile | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [tweetsNote, setTweetsNote] = useState<string | null>(null);
  const [filter, setFilter] = useState<PlatformFilter>("all");

  const load = async () => {
    setRefreshing(true);
    const [ch, vids, an, prof] = await Promise.all([
      fetchChannel().catch(() => null),
      fetchVideos().catch(() => [] as Video[]),
      fetchAnalytics().catch(() => null),
      fetchProfile().catch(() => null),
    ]);
    let note: string | null = null;
    const tw = await fetchTweets().catch(e => { note = e?.message || "Recent posts unavailable"; return [] as Tweet[]; });
    setChannel(ch); setVideos(vids); setAnalytics(an); setProfile(prof);
    setTweets(tw); setTweetsNote(note);
    if (ch || prof) setLastSync(new Date().toLocaleTimeString());
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const totalTweetImp = tweets.reduce((a, t) => a + t.impressions, 0);
  const totalTweetEng = tweets.reduce((a, t) => a + t.likes + t.retweets + t.replies, 0);
  const recentVidViews = videos.slice(0, 5).reduce((a, v) => a + v.views, 0);
  const recentVidLikes = videos.slice(0, 5).reduce((a, v) => a + v.likes, 0);
  const engagement = totalTweetImp > 0 ? ((totalTweetEng / totalTweetImp) * 100).toFixed(1) : "—";

  const kpis = [
    { label: "YT Subscribers", value: channel ? formatNum(channel.subscribers) : "—", icon: Users, grad: "from-red-600 to-rose-500", platform: "youtube" },
    { label: "YT Views", value: channel ? formatNum(channel.totalViews) : "—", icon: Eye, grad: "from-red-500 to-orange-400", platform: "youtube" },
    { label: "YT Videos", value: channel ? `${channel.videoCount}` : "—", icon: Film, grad: "from-rose-500 to-pink-400", platform: "youtube" },
    { label: "X Followers", value: profile ? formatNum(profile.followers) : "—", icon: Users, grad: "from-slate-800 to-slate-600", platform: "x" },
    { label: "X Following", value: profile ? formatNum(profile.following) : "—", icon: Users, grad: "from-slate-600 to-slate-400", platform: "x" },
    { label: "X Posts", value: profile ? formatNum(profile.tweetCount) : "—", icon: XIcon, grad: "from-slate-700 to-slate-500", platform: "x" },
    { label: "Engagement", value: tweets.length ? `${engagement}%` : "—", icon: Zap, grad: "from-violet-600 to-fuchsia-500", platform: "all" },
    { label: "Views / Impressions", value: formatNum(channel ? channel.totalViews + totalTweetImp : totalTweetImp), icon: TrendingUp, grad: "from-blue-600 to-cyan-500", platform: "all" },
  ].filter(k => filter === "all" || k.platform === filter || k.platform === "all");

  const chartDays = analytics?.days ?? [];
  const maxViews = chartDays.length ? Math.max(...chartDays.map(d => d.views), 1) : 1;

  const glass = "rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-lg shadow-slate-200/40 dark:shadow-black/20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl";

  return (
    <div className="space-y-8" data-testid="dashboard-page" aria-live="polite">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5" data-testid="dashboard-header">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-violet-500" aria-hidden="true" />
            My X &amp; YouTube Stats
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {channel && <YtBadge />}
            {profile && <XBadge />}
            {channel && <span>{channel.channelName}</span>}
            {profile && <span>· @{profile.username}</span>}
            {lastSync && (
              <Badge variant="outline" className="gap-1.5 border-emerald-300 text-emerald-700 dark:text-emerald-400">
                <Activity className="w-3 h-3" aria-hidden="true" /> Synced {lastSync}
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={load} disabled={refreshing} aria-label="Refresh statistics" data-testid="dashboard-refresh-button"
          className="rounded-xl shadow-md bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-500 hover:to-blue-400 text-white">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          {refreshing ? "Syncing…" : "Refresh"}
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dashboard-kpi-grid">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          : kpis.map(k => (
            <Card key={k.label} className={`${glass} border-0 hover:scale-[1.02] transition-transform duration-300`} data-testid={`dashboard-kpi-${k.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs md:text-sm text-muted-foreground">{k.label}</p>
                  <span className={`p-2 rounded-xl text-white bg-gradient-to-br ${k.grad} shadow-sm`}>
                    <k.icon className="w-4 h-4" aria-hidden="true" />
                  </span>
                </div>
                <p className="text-2xl md:text-3xl font-bold mt-2">{k.value}</p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Trend chart with platform filters */}
      <Card className={glass} data-testid="dashboard-trend-chart">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Performance trend</CardTitle>
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800" role="group" aria-label="Platform filter">
            {([["all", "All"], ["youtube", "YouTube"], ["x", "X"]] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setFilter(v as PlatformFilter)}
                data-testid={`dashboard-filter-${v}`}
                aria-pressed={filter === v}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all min-h-[32px] ${
                  filter === v ? "bg-white dark:bg-slate-700 shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-56 rounded-xl" /> : !analytics?.available ? (
            <div className="h-56 flex flex-col items-center justify-center text-sm text-muted-foreground text-center gap-3" data-testid="dashboard-chart-unavailable">
              <TrendingUp className="w-8 h-8 opacity-40" aria-hidden="true" />
              Daily view history isn't available on this plan — totals above are still live.
            </div>
          ) : (
            <div className="flex items-end gap-2 md:gap-3 h-56" role="img" aria-label="Daily YouTube views over the last 14 days">
              {chartDays.map(d => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">{formatNum(d.views)}</span>
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-red-600 via-fuchsia-500 to-violet-400 transition-all duration-300"
                    style={{ height: `${Math.max((d.views / maxViews) * 180, 2)}px` }} />
                  <span className="text-[10px] text-muted-foreground hidden md:block">{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent videos + recent X posts, two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={glass} data-testid="dashboard-recent-videos">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg flex items-center gap-2"><Youtube className="w-5 h-5 text-red-600" aria-hidden="true" /> Recent YouTube Videos</CardTitle>
            <YtBadge />
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
              : videos.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground space-y-3" data-testid="dashboard-videos-empty">
                  <PlayCircle className="w-8 h-8 mx-auto opacity-40" aria-hidden="true" />
                  <p>No videos available right now.</p>
                  <Button asChild variant="outline" size="sm"><Link to="/integrations">Check YouTube connection</Link></Button>
                </div>
              ) : videos.slice(0, 5).map(v => (
                <div key={v.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors">
                  {v.thumbnail ? (
                    <img src={v.thumbnail} alt="" className="w-24 h-14 rounded-lg object-cover shrink-0 shadow-sm" aria-hidden="true" />
                  ) : (
                    <PlayCircle className="w-10 h-10 text-red-500 shrink-0" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{v.title}</p>
                    <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" aria-hidden="true" />{formatNum(v.views)}</span>
                      <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" aria-hidden="true" />{formatNum(v.likes)}</span>
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" aria-hidden="true" />{formatDate(v.publishedAt)}</span>
                    </p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className={glass} data-testid="dashboard-recent-x-posts">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg flex items-center gap-2"><XIcon className="w-5 h-5" aria-hidden="true" /> Recent X Posts</CardTitle>
            <XBadge />
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
              : tweets.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground space-y-3" data-testid="dashboard-x-empty">
                  <XIcon className="w-8 h-8 mx-auto opacity-40" aria-hidden="true" />
                  <p>{tweetsNote ?? "No recent X posts available."}</p>
                  <p className="text-xs opacity-70">X's free tier limits tweet reads — profile stats above are live.</p>
                </div>
              ) : tweets.slice(0, 3).map((t, i) => {
                const rate = t.impressions > 0 ? ((t.likes + t.retweets + t.replies) / t.impressions * 100).toFixed(1) : "—";
                return (
                  <div key={t.id || i} className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/60 space-y-2" data-testid={`dashboard-x-post-${i}`}>
                    <p className="text-sm line-clamp-3">{t.text}</p>
                    <div className="text-[11px] text-muted-foreground">{timeAgo(t.createdAt)}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" aria-hidden="true" />{formatNum(t.impressions)}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" aria-hidden="true" />{formatNum(t.likes)}</span>
                      <span className="flex items-center gap-1"><Repeat2 className="w-3 h-3" aria-hidden="true" />{formatNum(t.retweets)}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" aria-hidden="true" />{formatNum(t.replies)}</span>
                      <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-medium"><Zap className="w-3 h-3" aria-hidden="true" />{rate}% eng.</span>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>

      {/* Platform overview */}
      <Card className={glass} data-testid="dashboard-platform-overview">
        <CardHeader><CardTitle className="text-lg">Platform Overview</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-36 rounded-xl" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20 border border-red-100/60 dark:border-red-900/30" data-testid="dashboard-overview-youtube">
                <div className="flex items-center gap-2 mb-4"><Youtube className="w-5 h-5 text-red-600" aria-hidden="true" /><span className="font-semibold">YouTube</span><YtBadge /></div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-xl font-bold">{channel ? formatNum(channel.subscribers) : "—"}</div><div className="text-xs text-muted-foreground">Subscribers</div></div>
                  <div><div className="text-xl font-bold">{channel ? formatNum(channel.totalViews) : "—"}</div><div className="text-xs text-muted-foreground">Total views</div></div>
                  <div><div className="text-xl font-bold">{channel ? channel.videoCount : "—"}</div><div className="text-xs text-muted-foreground">Videos</div></div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">Recent 5 videos: {formatNum(recentVidViews)} views · {formatNum(recentVidLikes)} likes</p>
              </div>
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/60 dark:to-slate-900/60 border border-slate-200/60 dark:border-slate-800" data-testid="dashboard-overview-x">
                <div className="flex items-center gap-2 mb-4"><XIcon className="w-5 h-5" aria-hidden="true" /><span className="font-semibold">X (Twitter)</span><XBadge /></div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-xl font-bold">{profile ? formatNum(profile.followers) : "—"}</div><div className="text-xs text-muted-foreground">Followers</div></div>
                  <div><div className="text-xl font-bold">{profile ? formatNum(profile.following) : "—"}</div><div className="text-xs text-muted-foreground">Following</div></div>
                  <div><div className="text-xl font-bold">{profile ? formatNum(profile.tweetCount) : "—"}</div><div className="text-xs text-muted-foreground">Posts</div></div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  {tweets.length ? `Last 3 posts: ${formatNum(totalTweetImp)} impressions · ${engagement}% engagement` : "Recent post metrics limited by X free tier"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
