import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Eye, Film, Youtube, Twitter as XIcon, Heart, Repeat2,
  MessageCircle, ThumbsUp, TrendingUp, TrendingDown, RefreshCw, Sparkles, Activity, Zap,
} from "lucide-react";
import { fetchAll, formatNum, formatDate, type ChannelBundle, type Video } from "@/features/youtube";
import { fetchProfile, fetchTweets, type TwitterProfile, type Tweet } from "@/features/twitter";

/* ---------- helpers ---------- */

const YT_ICON = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z"/></svg>
);
const X_SVG = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M18.9 1.2h3.7l-8.1 9.3L24 22.8h-7.5l-5.8-7.6-6.7 7.6H.3l8.7-9.9L0 1.2h7.7l5.3 7 5.9-7zm-1.3 19.4h2.1L6.6 3.3H4.4l13.2 17.3z"/></svg>
);

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.05] ${className}`} />;
}

/* ---------- KPI card ---------- */

interface KpiProps {
  label: string;
  value: string | undefined;
  platform: "yt" | "x" | "brand";
  icon: React.ReactNode;
  trend?: number | null;
  delay?: number;
}

const platformGlow: Record<KpiProps["platform"], string> = {
  yt: "from-red-600/25 to-rose-500/10 text-red-400 shadow-[0_0_24px_-8px_rgba(239,68,68,0.5)]",
  x: "from-white/20 to-white/5 text-white shadow-[0_0_24px_-8px_rgba(255,255,255,0.35)]",
  brand: "from-violet-600/25 to-fuchsia-500/10 text-violet-300 shadow-[0_0_24px_-8px_rgba(139,92,246,0.55)]",
};
const platformTag: Record<KpiProps["platform"], string> = {
  yt: "text-red-400/90 bg-red-500/[0.08] border-red-500/15",
  x: "text-white/80 bg-white/[0.07] border-white/15",
  brand: "text-violet-300 bg-violet-500/[0.1] border-violet-500/20",
};
const platformName: Record<KpiProps["platform"], string> = { yt: "YouTube", x: "X", brand: "Combined" };

function KpiCard({ label, value, platform, icon, trend, delay = 0 }: KpiProps) {
  return (
    <div
      data-testid={`dashboard-kpi-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
      className="surface surface-hover group relative overflow-hidden p-4 md:p-5"
      style={{ animation: `fadeUp 0.5s ease both ${delay}ms` }}
    >
      <div className={`pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${platformGlow[platform]} opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-60`} aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${platformTag[platform]}`}>
            {platformName[platform]}
          </span>
          <p className="mt-2.5 text-[12px] font-medium text-soft truncate">{label}</p>
          {value === undefined ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className="mt-0.5 text-[26px] md:text-[30px] font-semibold tracking-tight text-white tabular-nums leading-tight">
              {value}
            </p>
          )}
        </div>
        <div className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${platformGlow[platform]}`}>
          <span className="[&>svg]:w-4.5 [&>svg]:h-4.5">{icon}</span>
        </div>
      </div>
      {trend !== undefined && trend !== null && (
        <div className="relative mt-2 flex items-center gap-1 text-[11px] font-medium">
          {trend >= 0 ? (
            <><TrendingUp className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" /><span className="text-emerald-400">+{trend.toFixed(1)}%</span></>
          ) : (
            <><TrendingDown className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" /><span className="text-rose-400">{trend.toFixed(1)}%</span></>
          )}
          <span className="text-soft/70">vs previous</span>
        </div>
      )}
    </div>
  );
}

/* ---------- Performance chart (inline SVG) ---------- */

type Range = 7 | 14 | 30 | 90;
type PlatformFilter = "all" | "yt" | "x";

function PerformanceChart({ bundle, tweets }: { bundle: ChannelBundle | null; tweets: Tweet[] | null }) {
  const [filter, setFilter] = useState<PlatformFilter>("all");
  const [range, setRange] = useState<Range>(30);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const days = bundle?.analytics.days ?? [];
  const series = useMemo(() => {
    const sliced = days.slice(-range);
    return sliced.map((d) => ({
      label: new Date(d.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      yt: d.views,
      x: 0, // X impression history not available on free tier
    }));
  }, [days, range]);

  const showYt = filter !== "x";
  const showX = filter !== "yt";

  const W = 800, H = 220, PAD = 8;
  const max = Math.max(1, ...series.map((p) => Math.max(showYt ? p.yt : 0, showX ? p.x : 0)));
  const pts = (key: "yt" | "x") =>
    series.map((p, i) => {
      const x = PAD + (i / Math.max(1, series.length - 1)) * (W - PAD * 2);
      const y = H - 24 - (p[key] / max) * (H - 44);
      return `${x},${y}`;
    });

  const hasData = series.length > 1 && (showYt ? series.some((s) => s.yt > 0) : true);

  return (
    <section className="surface p-5 md:p-6" data-testid="dashboard-performance-section" aria-label="Performance overview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-white">Performance Overview</h2>
          <p className="mt-0.5 text-[12px] text-soft">Views &amp; impressions across platforms</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Platform filter */}
          <div className="flex rounded-xl border border-white/[0.07] bg-white/[0.03] p-0.5" role="group" aria-label="Platform filter">
            {(["all", "yt", "x"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                data-testid={`dashboard-filter-${f}`}
                className={`px-3 py-1.5 rounded-[10px] text-[12px] font-medium transition-all min-h-[32px] ${
                  filter === f
                    ? "bg-violet-500/15 text-violet-300 shadow-[0_0_16px_-4px_rgba(139,92,246,0.5),inset_0_0_0_1px_rgba(139,92,246,0.25)]"
                    : "text-soft hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : f === "yt" ? "YouTube" : "X"}
              </button>
            ))}
          </div>
          {/* Range selector */}
          <div className="flex rounded-xl border border-white/[0.07] bg-white/[0.03] p-0.5" role="group" aria-label="Date range">
            {([7, 14, 30, 90] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                data-testid={`dashboard-range-${r}d`}
                className={`px-2.5 py-1.5 rounded-[10px] text-[12px] font-medium transition-all min-h-[32px] ${
                  range === r ? "bg-white/[0.09] text-white" : "text-soft hover:text-foreground"
                }`}
              >
                {r}D
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mt-5">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] py-14 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300 glow-accent">
              <Activity className="w-5 h-5" aria-hidden="true" />
            </span>
            <p className="mt-3.5 text-sm font-medium text-white">Daily history unavailable</p>
            <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-soft">
              {bundle?.analytics.message || "Platform-level daily metrics aren't exposed on the current API tier. Totals below remain live."}
            </p>
          </div>
        ) : (
          <div className="relative" onMouseLeave={() => setHoverIdx(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56 md:h-64" role="img" aria-label="Performance trend chart">
              <defs>
                <linearGradient id="ytFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(239,68,68)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="rgb(239,68,68)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="xFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(255,255,255)" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="rgb(255,255,255)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1={0} x2={W} y1={24 + f * (H - 48)} y2={24 + f * (H - 48)} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 6" />
              ))}
              {showYt && (
                <>
                  <polygon points={`${PAD},${H - 24} ${pts("yt").join(" ")} ${W - PAD},${H - 24}`} fill="url(#ytFill)" />
                  <polyline points={pts("yt").join(" ")} fill="none" stroke="rgb(248,113,113)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px rgba(239,68,68,0.5))" }} />
                </>
              )}
              {showX && series.some((s) => s.x > 0) && (
                <polyline points={pts("x").join(" ")} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeDasharray="1 0" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.4))" }} />
              )}
              {series.map((p, i) => (
                <rect
                  key={p.label + i}
                  x={PAD + (i / Math.max(1, series.length - 1)) * (W - PAD * 2) - 12}
                  y={0}
                  width={24}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                />
              ))}
              {hoverIdx !== null && (
                <line
                  x1={PAD + (hoverIdx / Math.max(1, series.length - 1)) * (W - PAD * 2)}
                  x2={PAD + (hoverIdx / Math.max(1, series.length - 1)) * (W - PAD * 2)}
                  y1={12} y2={H - 24}
                  stroke="rgba(139,92,246,0.5)" strokeWidth="1"
                />
              )}
            </svg>
            {hoverIdx !== null && (
              <div
                className="pointer-events-none absolute top-2 glass px-3 py-2 text-[11px] leading-relaxed"
                style={{ left: `${(hoverIdx / Math.max(1, series.length - 1)) * 100}%`, transform: "translateX(-50%)" }}
              >
                <p className="font-medium text-white">{series[hoverIdx].label}</p>
                {showYt && <p className="text-red-300 tabular-nums">{formatNum(series[hoverIdx].yt)} views</p>}
                {showX && series[hoverIdx].x > 0 && <p className="text-white/80 tabular-nums">{formatNum(series[hoverIdx].x)} impressions</p>}
              </div>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-soft">
          {showYt && <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-red-400" />YouTube views</span>}
          {showX && <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-white/80" />X impressions</span>}
        </div>
      </div>
    </section>
  );
}

/* ---------- YouTube video row ---------- */

function VideoRow({ v, rank }: { v: Video; rank: number }) {
  const best = v.views > 0;
  return (
    <li className="flex items-center gap-3.5 rounded-xl p-2.5 transition-colors hover:bg-white/[0.035] group" data-testid="dashboard-video-row">
      <div className="relative shrink-0">
        {v.thumbnail ? (
          <img src={v.thumbnail} alt="" className="h-14 w-24 rounded-lg object-cover border border-white/[0.08]" loading="lazy" />
        ) : (
          <div className="h-14 w-24 rounded-lg bg-white/[0.05] flex items-center justify-center"><Film className="w-5 h-5 text-soft" aria-hidden="true" /></div>
        )}
        {best && (
          <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-rose-500 text-[9px] font-bold text-white shadow-[0_0_10px_-2px_rgba(239,68,68,0.7)]">
            {rank}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white/90 group-hover:text-white transition-colors">{v.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-soft">
          <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" aria-hidden="true" />{formatNum(v.views)}</span>
          <span className="inline-flex items-center gap-1"><ThumbsUp className="w-3 h-3" aria-hidden="true" />{formatNum(v.likes)}</span>
          <span>{formatDate(v.publishedAt)}</span>
        </div>
      </div>
      <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        best ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300" : "border-white/10 bg-white/[0.04] text-soft"
      }`}>
        {best ? <TrendingUp className="w-3 h-3" aria-hidden="true" /> : <Activity className="w-3 h-3" aria-hidden="true" />}
        {best ? "Active" : "No data"}
      </span>
    </li>
  );
}

/* ---------- X post row ---------- */

function TweetRow({ t }: { t: Tweet }) {
  const eng = t.impressions > 0 ? ((t.likes + t.retweets + t.replies) / t.impressions) * 100 : 0;
  return (
    <li className="rounded-xl p-3.5 transition-colors hover:bg-white/[0.035]" data-testid="dashboard-post-row">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0 text-white/90">{X_SVG}</span>
        <p className="line-clamp-2 text-[13px] leading-relaxed text-white/85">{t.text}</p>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-soft">
        <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" aria-hidden="true" />{formatNum(t.impressions)}</span>
        <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" aria-hidden="true" />{formatNum(t.likes)}</span>
        <span className="inline-flex items-center gap-1"><Repeat2 className="w-3 h-3" aria-hidden="true" />{formatNum(t.retweets)}</span>
        <span className="inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" aria-hidden="true" />{formatNum(t.replies)}</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/[0.08] px-2 py-0.5 font-semibold text-violet-300">
          <Zap className="w-3 h-3" aria-hidden="true" />{eng.toFixed(1)}% eng
        </span>
      </div>
    </li>
  );
}

/* ---------- Platform comparison bar ---------- */

function CompareBar({ label, ytPct, xPct, ytVal, xVal }: { label: string; ytPct: number; xPct: number; ytVal: string; xVal: string }) {
  return (
    <div data-testid={`dashboard-compare-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-soft">{label}</span>
        <span className="tabular-nums text-white/80">{ytVal} <span className="text-soft/60">vs</span> {xVal}</span>
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-white/[0.05] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-700" style={{ width: `${ytPct}%` }} />
          </div>
          <span className="w-8 text-right text-[10px] font-semibold text-red-400 tabular-nums">{Math.round(ytPct)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-white/[0.05] overflow-hidden">
            <div className="h-full rounded-full bg-white/50 transition-all duration-700" style={{ width: `${xPct}%` }} />
          </div>
          <span className="w-8 text-right text-[10px] font-semibold text-white/70 tabular-nums">{Math.round(xPct)}%</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function Dashboard() {
  const [bundle, setBundle] = useState<ChannelBundle | null>(null);
  const [profile, setProfile] = useState<TwitterProfile | null>(null);
  const [tweets, setTweets] = useState<Tweet[] | null>(null);
  const [tweetError, setTweetError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const load = async () => {
    setSyncing(true);
    try {
      const [b, p] = await Promise.all([
        fetchAll().catch(() => null),
        fetchProfile().catch(() => null),
      ]);
      setBundle(b); setProfile(p);
      try {
        setTweets(await fetchTweets());
        setTweetError(null);
      } catch (e) {
        setTweets([]); setTweetError(e instanceof Error ? e.message : "Tweets unavailable");
      }
      setLastSync(new Date());
    } finally {
      setLoading(false);
      setTimeout(() => setSyncing(false), 600);
    }
  };

  useEffect(() => {
    load();
    const onRefresh = () => load();
    window.addEventListener("app:refresh", onRefresh);
    return () => window.removeEventListener("app:refresh", onRefresh);
  }, []);

  const ch = bundle?.channel;
  const ytAvailable = !!ch && ch.subscribers >= 0;
  const xAvailable = !!profile;

  const tweetMetrics = useMemo(() => {
    const t = tweets ?? [];
    const likes = t.reduce((s, x) => s + x.likes, 0);
    const imps = t.reduce((s, x) => s + x.impressions, 0);
    const eng = imps > 0 ? ((t.reduce((s, x) => s + x.likes + x.retweets + x.replies, 0)) / imps) * 100 : null;
    const views = (ch?.totalViews ?? 0) + imps;
    return { likes, imps, eng, views };
  }, [tweets, ch]);

  const cmp = useMemo(() => {
    const ytSubs = ch?.subscribers ?? 0;
    const xFol = profile?.followers ?? 0;
    const ytContent = ch?.videoCount ?? 0;
    const xContent = profile?.tweetCount ?? 0;
    const ytReach = ch?.totalViews ?? 0;
    const xReach = tweetMetrics.imps;
    const total = (a: number, b: number) => (a + b > 0 ? a + b : 1);
    const bestYt = bundle?.videos?.[0];
    const bestX = (tweets ?? []).slice().sort((a, b) => (b.likes + b.retweets) - (a.likes + a.replies))[0];
    return { ytSubs, xFol, ytContent, xContent, ytReach, xReach, total, bestYt, bestX };
  }, [ch, profile, tweets, tweetMetrics]);

  if (loading) {
    return (
      <div data-testid="dashboard-page" className="space-y-5" aria-busy="true">
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
        <Skeleton className="h-72" />
        <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page" className="space-y-5 md:space-y-6">
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3" data-testid="dashboard-header">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-white">Overview</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${ytAvailable ? "border-red-500/20 bg-red-500/[0.07] text-red-300" : "border-white/10 bg-white/[0.04] text-soft"}`}>
              {YT_ICON}{ch?.channelName || "YouTube not connected"}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${xAvailable ? "border-white/15 bg-white/[0.07] text-white/85" : "border-white/10 bg-white/[0.04] text-soft"}`}>
              {X_SVG}{profile ? `@${profile.username}` : "X not connected"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-soft" aria-live="polite" data-testid="dashboard-sync-status">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Synced {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        <button
          onClick={load}
          data-testid="dashboard-refresh-button"
          className="inline-flex min-h-[38px] items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_0_24px_-6px_rgba(139,92,246,0.6)] transition-all hover:shadow-[0_0_32px_-4px_rgba(139,92,246,0.8)] hover:brightness-110 active:scale-[0.98]"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} aria-hidden="true" />
          {syncing ? "Syncing…" : "Refresh"}
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="dashboard-kpi-grid">
        <KpiCard label="Subscribers" value={ytAvailable ? formatNum(ch!.subscribers) : "—"} platform="yt" icon={<Users className="w-4 h-4" />} delay={0} />
        <KpiCard label="Total Views" value={ytAvailable ? formatNum(ch!.totalViews) : "—"} platform="yt" icon={<Eye className="w-4 h-4" />} delay={40} />
        <KpiCard label="Videos" value={ytAvailable ? formatNum(ch!.videoCount) : "—"} platform="yt" icon={<Film className="w-4 h-4" />} delay={80} />
        <KpiCard label="Followers" value={xAvailable ? formatNum(profile!.followers) : "—"} platform="x" icon={<Users className="w-4 h-4" />} delay={120} />
        <KpiCard label="Following" value={xAvailable ? formatNum(profile!.following) : "—"} platform="x" icon={<Users className="w-4 h-4" />} delay={160} />
        <KpiCard label="Posts" value={xAvailable ? formatNum(profile!.tweetCount) : "—"} platform="x" icon={<XIcon className="w-4 h-4" />} delay={200} />
        <KpiCard label="Engagement" value={tweetMetrics.eng !== null ? `${tweetMetrics.eng.toFixed(1)}%` : (ytAvailable ? "—" : "—")} platform="brand" icon={<Sparkles className="w-4 h-4" />} delay={240} />
        <KpiCard label="Views / Impressions" value={formatNum(tweetMetrics.views)} platform="brand" icon={<Activity className="w-4 h-4" />} delay={280} />
      </div>

      {/* Chart */}
      <PerformanceChart bundle={bundle} tweets={tweets} />

      {/* Content panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* YouTube */}
        <section className="surface p-5" data-testid="dashboard-youtube-section" aria-label="Recent YouTube videos">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-red-600/30 to-rose-500/10 text-red-400 glow-yt">{YT_ICON}</span>
              <div>
                <h2 className="text-sm font-semibold text-white">Latest Videos</h2>
                <p className="text-[11px] text-soft">YouTube · newest uploads</p>
              </div>
            </div>
            <Youtube className="w-4 h-4 text-soft" aria-hidden="true" />
          </div>
          <ul className="mt-4 space-y-1">
            {(bundle?.videos ?? []).slice(0, 5).map((v, i) => <VideoRow key={v.id} v={v} rank={i + 1} />)}
            {(bundle?.videos ?? []).length === 0 && (
              <li className="flex flex-col items-center rounded-xl border border-dashed border-white/[0.08] py-10 text-center">
                <Film className="w-5 h-5 text-soft" aria-hidden="true" />
                <p className="mt-2 text-[13px] text-white/80">No videos found</p>
                <p className="text-[11px] text-soft">Connect YouTube in Integrations to see your latest uploads.</p>
              </li>
            )}
          </ul>
        </section>

        {/* X */}
        <section className="surface p-5" data-testid="dashboard-x-section" aria-label="Recent X posts">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.09] text-white glow-x">{X_SVG}</span>
              <div>
                <h2 className="text-sm font-semibold text-white">Latest Posts</h2>
                <p className="text-[11px] text-soft">X · most recent</p>
              </div>
            </div>
            <XIcon className="w-4 h-4 text-soft" aria-hidden="true" />
          </div>
          <ul className="mt-3 space-y-1.5">
            {(tweets ?? []).slice(0, 3).map((t) => <TweetRow key={t.id} t={t} />)}
            {tweetError && (tweets ?? []).length === 0 && (
              <li className="flex flex-col items-center rounded-xl border border-dashed border-white/[0.08] px-4 py-10 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.07] text-white/70">{X_SVG}</span>
                <p className="mt-2.5 text-[13px] text-white/80">Post metrics unavailable</p>
                <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-soft">{tweetError}</p>
                <Link to="/x" className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/85 hover:bg-white/[0.08] transition-colors">Open X page</Link>
              </li>
            )}
          </ul>
        </section>
      </div>

      {/* Comparison */}
      <section className="surface p-5 md:p-6" data-testid="dashboard-compare-section" aria-label="Platform comparison">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-white">YouTube vs X</h2>
            <p className="mt-0.5 text-[12px] text-soft">Relative platform performance</p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-red-400">{YT_ICON}YouTube</span>
            <span className="flex items-center gap-1.5 text-white/70">{X_SVG}X</span>
          </div>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-5">
            <CompareBar label="Audience" ytPct={(cmp.ytSubs / cmp.total(cmp.ytSubs, cmp.xFol)) * 100} xPct={(cmp.xFol / cmp.total(cmp.ytSubs, cmp.xFol)) * 100} ytVal={formatNum(cmp.ytSubs)} xVal={formatNum(cmp.xFol)} />
            <CompareBar label="Content volume" ytPct={(cmp.ytContent / cmp.total(cmp.ytContent, cmp.xContent)) * 100} xPct={(cmp.xContent / cmp.total(cmp.ytContent, cmp.xContent)) * 100} ytVal={formatNum(cmp.ytContent)} xVal={formatNum(cmp.xContent)} />
            <CompareBar label="Reach" ytPct={(cmp.ytReach / cmp.total(cmp.ytReach, cmp.xReach)) * 100} xPct={(cmp.xReach / cmp.total(cmp.ytReach, cmp.xReach)) * 100} ytVal={formatNum(cmp.ytReach)} xVal={formatNum(cmp.xReach)} />
          </div>
          <div className="space-y-3.5">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4" data-testid="dashboard-compare-engagement">
              <p className="text-[12px] text-soft">Engagement</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums text-white">{tweetMetrics.eng !== null ? `${tweetMetrics.eng.toFixed(1)}%` : "—"}</span>
                <span className="text-[11px] text-soft">recent X posts</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-700" style={{ width: `${Math.min(100, (tweetMetrics.eng ?? 0) * 10)}%` }} />
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4" data-testid="dashboard-compare-best">
              <p className="text-[12px] text-soft">Best performing</p>
              {cmp.bestYt ? (
                <div className="mt-2 flex items-center gap-2.5">
                  {cmp.bestYt.thumbnail && <img src={cmp.bestYt.thumbnail} alt="" className="h-10 w-[68px] rounded-md object-cover border border-white/[0.08]" loading="lazy" />}
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-white/90">{cmp.bestYt.title}</p>
                    <p className="text-[11px] text-red-400">{formatNum(cmp.bestYt.views)} views · YouTube</p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[12px] text-soft">No content data yet</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
