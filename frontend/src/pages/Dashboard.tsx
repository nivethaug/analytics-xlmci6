import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Eye, Film, Youtube, Twitter as XIcon, Heart, Repeat2,
  MessageCircle, ThumbsUp, TrendingUp, TrendingDown, RefreshCw, Sparkles, Activity, Zap, BarChart3,
} from "lucide-react";
import { fetchAll, formatNum, formatDate, type ChannelBundle, type Video } from "@/features/youtube";
import { fetchProfile, fetchTweets, type TwitterProfile, type Tweet } from "@/features/twitter";

/* ---------- shared brand assets ---------- */

const YT_ICON = (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z"/></svg>
);
const X_SVG = (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true"><path d="M18.9 1.2h3.7l-8.1 9.3L24 22.8h-7.5l-5.8-7.6-6.7 7.6H.3l8.7-9.9L0 1.2h7.7l5.3 7 5.9-7zm-1.3 19.4h2.1L6.6 3.3H4.4l13.2 17.3z"/></svg>
);

type Platform = "yt" | "x" | "brand";

const accent: Record<Platform, { text: string; bar: string; chip: string; glow: string }> = {
  yt:   { text: "text-red-400", bar: "bg-red-500", chip: "text-red-300 bg-red-500/[0.07] border-red-500/15", glow: "group-hover:shadow-[0_0_28px_-10px_rgba(239,68,68,0.45)]" },
  x:    { text: "text-white/70", bar: "bg-white/60", chip: "text-white/75 bg-white/[0.06] border-white/12", glow: "group-hover:shadow-[0_0_28px_-10px_rgba(255,255,255,0.3)]" },
  brand:{ text: "text-violet-300", bar: "bg-violet-500", chip: "text-violet-300 bg-violet-500/[0.08] border-violet-500/20", glow: "group-hover:shadow-[0_0_28px_-10px_rgba(139,92,246,0.5)]" },
};
const platformLabel: Record<Platform, string> = { yt: "YouTube", x: "X", brand: "Combined" };

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.045] ${className}`} />;
}

/* ---------- micro sparkline ---------- */

function Sparkline({ values, color, className = "" }: { values: number[]; color: string; className?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - (v / max) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={`h-7 w-full ${className}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ---------- PRIMARY KPI (hero metric) ---------- */

interface PrimaryKpiProps {
  label: string;
  value: string | undefined;
  platform: Platform;
  icon: React.ReactNode;
  spark?: number[];
  sub?: string;
}

function PrimaryKpi({ label, value, platform, icon, spark, sub }: PrimaryKpiProps) {
  const stroke = platform === "yt" ? "rgb(248,113,113)" : platform === "x" ? "rgba(255,255,255,0.75)" : "rgb(167,139,250)";
  return (
    <div
      data-testid={`dashboard-kpi-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
      className="surface surface-hover group relative overflow-hidden p-5"
    >
      <div className={`absolute left-0 top-0 h-full w-px ${accent[platform].bar} opacity-40 transition-opacity duration-300 group-hover:opacity-100`} aria-hidden="true" />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${accent[platform].text}`}>
            <span className="inline-block h-1 w-1 rounded-full bg-current" aria-hidden="true" />
            {platformLabel[platform]}
          </p>
          <p className="mt-1 text-[12px] text-soft">{label}</p>
        </div>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${accent[platform].chip}`}>{icon}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        {value === undefined ? (
          <Skeleton className="h-10 w-24" />
        ) : (
          <p className="text-[34px] font-semibold leading-none tracking-tight text-white tabular-nums">{value}</p>
        )}
        {spark && spark.length > 1 && (
          <div className="w-24 shrink-0 opacity-50 transition-opacity duration-300 group-hover:opacity-100">
            <Sparkline values={spark} color={stroke} />
          </div>
        )}
      </div>
      {sub && <p className="mt-2 text-[11px] text-soft/80">{sub}</p>}
    </div>
  );
}

/* ---------- SECONDARY KPI (compact) ---------- */

function SecondaryKpi({ label, value, platform, delay = 0 }: { label: string; value: string | undefined; platform: Platform; delay?: number }) {
  return (
    <div
      data-testid={`dashboard-kpi-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
      className="group flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 transition-all duration-200 hover:border-white/[0.1] hover:bg-white/[0.035]"
      style={{ animation: `fadeUp 0.45s ease both ${delay}ms` }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${accent[platform].bar}`} aria-hidden="true" />
        <span className="truncate text-[12px] text-soft">{label}</span>
      </div>
      {value === undefined ? (
        <Skeleton className="h-5 w-12" />
      ) : (
        <span className="text-[15px] font-semibold text-white/90 tabular-nums">{value}</span>
      )}
    </div>
  );
}

/* ---------- Performance hero chart ---------- */

type Range = 7 | 14 | 30 | 90;
type PlatformFilter = "all" | "yt" | "x";

function Segmented<T extends string | number>({ options, value, onChange, format, testPrefix }:
  { options: readonly T[]; value: T; onChange: (v: T) => void; format: (v: T) => string; testPrefix: string }) {
  return (
    <div className="flex rounded-[10px] border border-white/[0.06] bg-white/[0.025] p-0.5" role="group">
      {options.map((o) => (
        <button
          key={String(o)}
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          data-testid={`${testPrefix}-${String(o).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          className={`min-h-[30px] whitespace-nowrap rounded-lg px-3 py-1 text-[12px] font-medium transition-all duration-150 ${
            value === o
              ? "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(139,92,246,0.28),0_0_14px_-4px_rgba(139,92,246,0.4)]"
              : "text-soft hover:text-foreground"
          }`}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}

function PerformanceChart({ bundle }: { bundle: ChannelBundle | null }) {
  const [filter, setFilter] = useState<PlatformFilter>("all");
  const [range, setRange] = useState<Range>(30);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const days = bundle?.analytics.days ?? [];
  const series = useMemo(() => {
    const sliced = days.slice(-range);
    return sliced.map((d) => ({
      label: new Date(d.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      yt: d.views,
    }));
  }, [days, range]);

  const showYt = filter !== "x";
  const hasData = series.length > 1 && series.some((s) => s.yt > 0);

  const W = 800, H = 230, PADX = 6, TOP = 26, BOT = 26;
  const max = Math.max(1, ...series.map((p) => p.yt));
  const xAt = (i: number) => PADX + (i / Math.max(1, series.length - 1)) * (W - PADX * 2);
  const yAt = (v: number) => H - BOT - (v / max) * (H - TOP - BOT);
  const pts = series.map((p, i) => `${xAt(i)},${yAt(p.yt)}`).join(" ");

  // smooth path (cardinal-ish via midpoints)
  const smooth = series.length > 1
    ? series.reduce((acc, p, i) => {
        if (i === 0) return `M ${xAt(0)},${yAt(p.yt)}`;
        const px = xAt(i - 1), py = yAt(series[i - 1].yt), cx = xAt(i), cy = yAt(p.yt);
        const mx = (px + cx) / 2;
        return `${acc} C ${mx},${py} ${mx},${cy} ${cx},${cy}`;
      }, "")
    : "";

  return (
    <section className="surface overflow-hidden" data-testid="dashboard-performance-section" aria-label="Performance overview">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 md:p-6 pb-0">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-white">Performance</h2>
          <p className="mt-0.5 text-[12px] text-soft">Views &amp; impressions across your connected platforms</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented options={["all", "yt", "x"] as const} value={filter} onChange={setFilter}
            format={(f) => (f === "all" ? "All" : f === "yt" ? "YouTube" : "X")} testPrefix="dashboard-filter" />
          <div className="overflow-x-auto no-scrollbar">
            <Segmented options={[7, 14, 30, 90] as const} value={range} onChange={setRange}
              format={(r) => `${r}D`} testPrefix="dashboard-range" />
          </div>
        </div>
      </div>

      <div className="relative px-3 pb-4 pt-5 md:px-4">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-white/[0.08] bg-white/[0.012] py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/[0.09] text-violet-300 shadow-[0_0_24px_-8px_rgba(139,92,246,0.5)]">
              <BarChart3 className="w-5 h-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-[14px] font-medium text-white">Performance data will appear here</p>
            <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-soft">
              {bundle?.analytics.message || "Connect analytics access to unlock historical trends. Your live totals are shown above."}
            </p>
          </div>
        ) : (
          <div className="relative" onMouseLeave={() => setHoverIdx(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} className="h-60 w-full md:h-72" role="img" aria-label="Performance trend chart">
              <defs>
                <linearGradient id="ytFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(239,68,68)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="rgb(239,68,68)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                const y = TOP + f * (H - TOP - BOT);
                return <line key={f} x1={0} x2={W} y1={y} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray={f === 1 ? "0" : "3 7"} />;
              })}
              {showYt && (
                <>
                  <path d={`M ${xAt(0)},${H - BOT} ${smooth.replace("M", "L")} L ${xAt(series.length - 1)},${H - BOT} Z`} fill="url(#ytFill)" />
                  <path d={smooth} fill="none" stroke="rgb(248,113,113)" strokeWidth="2" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 8px rgba(239,68,68,0.45))" }} />
                </>
              )}
              {/* y axis labels */}
              {[1, 0.5, 0].map((f) => (
                <text key={f} x={4} y={TOP + (1 - f) * (H - TOP - BOT) - 5} fill="rgba(255,255,255,0.3)" fontSize="10" className="tabular-nums">
                  {formatNum(max * f)}
                </text>
              ))}
              {/* x labels */}
              {series.length > 1 && [0, Math.floor(series.length / 2), series.length - 1].map((i) => (
                <text key={i} x={Math.min(W - 30, Math.max(18, xAt(i)))} y={H - 8} fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="middle">{series[i].label}</text>
              ))}
              {hoverIdx !== null && (
                <>
                  <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={TOP - 8} y2={H - BOT} stroke="rgba(139,92,246,0.55)" strokeWidth="1" />
                  <circle cx={xAt(hoverIdx)} cy={yAt(series[hoverIdx].yt)} r="4" fill="rgb(248,113,113)" stroke="#0a0a0c" strokeWidth="2" />
                </>
              )}
              {series.map((p, i) => (
                <rect key={i} x={xAt(i) - (W / series.length) / 2} y={0} width={W / series.length} height={H} fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
              ))}
            </svg>
            {hoverIdx !== null && (
              <div
                className="pointer-events-none absolute top-3 z-10 rounded-xl border border-white/[0.09] bg-[hsl(240,10%,4.5%)]/95 px-3 py-2 text-[11px] shadow-[0_8px_28px_-8px_rgba(0,0,0,0.8)] backdrop-blur-md"
                style={{ left: `calc(${(hoverIdx / Math.max(1, series.length - 1)) * 100}% + 12px)`, transform: hoverIdx > series.length / 2 ? "translateX(-100%)" : "none" }}
                role="status"
              >
                <p className="font-semibold text-white/90">{series[hoverIdx].label}</p>
                <p className="mt-1 flex items-center gap-1.5 text-red-300 tabular-nums"><span className="h-1 w-3 rounded-full bg-red-400" />{formatNum(series[hoverIdx].yt)} views</p>
              </div>
            )}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-4 px-2 text-[11px] text-soft">
          {showYt && <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded-full bg-red-400" />YouTube views</span>}
          {filter !== "yt" && <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded-full bg-white/60" />X impressions — requires API tier</span>}
        </div>
      </div>
    </section>
  );
}

/* ---------- section header ---------- */

function SectionHeader({ icon, title, sub, platform, testId }:
  { icon: React.ReactNode; title: string; sub: string; platform: Platform; testId: string }) {
  return (
    <div className="flex items-center gap-3" data-testid={testId}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${accent[platform].chip}`}>{icon}</span>
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold tracking-tight text-white">{title}</h2>
        <p className="text-[11px] text-soft">{sub}</p>
      </div>
    </div>
  );
}

/* ---------- YouTube video row ---------- */

function VideoRow({ v, rank, showRank = false }: { v: Video; rank?: number; showRank?: boolean }) {
  const best = v.views > 0;
  return (
    <li className="group/row flex items-center gap-3.5 rounded-xl p-2.5 transition-colors duration-200 hover:bg-white/[0.035]" data-testid="dashboard-video-row">
      <div className="relative shrink-0">
        {v.thumbnail ? (
          <img src={v.thumbnail} alt="" className="h-[52px] w-[92px] rounded-lg border border-white/[0.08] object-cover transition-transform duration-200 group-hover/row:scale-[1.04]" loading="lazy" />
        ) : (
          <div className="flex h-[52px] w-[92px] items-center justify-center rounded-lg bg-white/[0.05]"><Film className="h-5 w-5 text-soft" aria-hidden="true" /></div>
        )}
        {showRank && (
          <span className="absolute -left-2 -top-2 flex h-5 items-center rounded-md bg-[hsl(240,10%,7%)] px-1 text-[10px] font-bold tabular-nums text-white/70 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
            {String(rank).padStart(2, "0")}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white/85 transition-colors group-hover/row:text-white">{v.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-soft">
          <span className="inline-flex items-center gap-1 tabular-nums"><Eye className="h-3 w-3" aria-hidden="true" />{formatNum(v.views)}</span>
          <span className="inline-flex items-center gap-1 tabular-nums"><ThumbsUp className="h-3 w-3" aria-hidden="true" />{formatNum(v.likes)}</span>
          <span>{formatDate(v.publishedAt)}</span>
        </div>
      </div>
      <span className={`hidden shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:inline-flex ${
        best ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300" : "border-white/10 bg-white/[0.03] text-soft"
      }`}>
        {best ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <Activity className="h-3 w-3" aria-hidden="true" />}
        {best ? "Active" : "No data"}
      </span>
    </li>
  );
}

/* ---------- X post card ---------- */

function TweetCard({ t, rank, showRank = false }: { t: Tweet; rank?: number; showRank?: boolean }) {
  const eng = t.impressions > 0 ? ((t.likes + t.retweets + t.replies) / t.impressions) * 100 : 0;
  return (
    <li className="group/row rounded-xl border border-white/[0.04] bg-white/[0.015] p-3.5 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.03]" data-testid="dashboard-post-row">
      <div className="flex items-start gap-2.5">
        {showRank && <span className="mt-0.5 text-[11px] font-bold tabular-nums text-white/35">{String(rank).padStart(2, "0")}</span>}
        <span className="mt-0.5 shrink-0 text-white/80">{X_SVG}</span>
        <p className="line-clamp-2 text-[13px] leading-relaxed text-white/80">{t.text}</p>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-soft">
        <span className="inline-flex items-center gap-1 tabular-nums"><Eye className="h-3 w-3" aria-hidden="true" />{formatNum(t.impressions)}</span>
        <span className="inline-flex items-center gap-1 tabular-nums"><Heart className="h-3 w-3" aria-hidden="true" />{formatNum(t.likes)}</span>
        <span className="inline-flex items-center gap-1 tabular-nums"><Repeat2 className="h-3 w-3" aria-hidden="true" />{formatNum(t.retweets)}</span>
        <span className="inline-flex items-center gap-1 tabular-nums"><MessageCircle className="h-3 w-3" aria-hidden="true" />{formatNum(t.replies)}</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/[0.07] px-2 py-0.5 font-semibold tabular-nums text-violet-300">
          <Zap className="h-3 w-3" aria-hidden="true" />{eng.toFixed(1)}%
        </span>
      </div>
    </li>
  );
}

/* ---------- comparison bar ---------- */

function CompareBar({ label, ytPct, xPct, ytVal, xVal }: { label: string; ytPct: number; xPct: number; ytVal: string; xVal: string }) {
  return (
    <div data-testid={`dashboard-compare-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-soft">{label}</span>
        <span className="text-[11px] tabular-nums text-white/70">{ytVal} <span className="text-soft/50">vs</span> {xVal}</span>
      </div>
      <div className="mt-1.5 space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.05]">
            <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-700" style={{ width: `${ytPct}%` }} />
          </div>
          <span className="w-9 text-right text-[10px] font-semibold tabular-nums text-red-400">{Math.round(ytPct)}%</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.05]">
            <div className="h-full rounded-full bg-white/45 transition-all duration-700" style={{ width: `${xPct}%` }} />
          </div>
          <span className="w-9 text-right text-[10px] font-semibold tabular-nums text-white/60">{Math.round(xPct)}%</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function Dashboard() {
  const [bundle, setBundle] = useState<ChannelBundle | null>(null);
  const [profile, setProfile] = useState<TwitterProfile | null>(null);
  const [tweets, setTweets] = useState<Tweet[] | null>(null);
  const [tweetError, setTweetError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [topTab, setTopTab] = useState<"all" | "yt" | "x">("all");

  const load = async () => {
    setSyncing(true);
    try {
      const [b, p] = await Promise.all([fetchAll().catch(() => null), fetchProfile().catch(() => null)]);
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
      setTimeout(() => setSyncing(false), 700);
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
    const eng = imps > 0 ? (t.reduce((s, x) => s + x.likes + x.retweets + x.replies, 0) / imps) * 100 : null;
    const views = (ch?.totalViews ?? 0) + imps;
    return { likes, imps, eng, views };
  }, [tweets, ch]);

  const sparkYt = useMemo(() => (bundle?.analytics.days ?? []).slice(-14).map((d) => d.views), [bundle]);

  const cmp = useMemo(() => {
    const ytSubs = ch?.subscribers ?? 0, xFol = profile?.followers ?? 0;
    const ytContent = ch?.videoCount ?? 0, xContent = profile?.tweetCount ?? 0;
    const ytReach = ch?.totalViews ?? 0, xReach = tweetMetrics.imps;
    const total = (a: number, b: number) => (a + b > 0 ? a + b : 1);
    return { ytSubs, xFol, ytContent, xContent, ytReach, xReach, total };
  }, [ch, profile, tweetMetrics]);

  const topVideos = useMemo(() => (bundle?.videos ?? []).slice().sort((a, b) => b.views - a.views).slice(0, 3), [bundle]);
  const topTweets = useMemo(() => (tweets ?? []).slice().sort((a, b) => b.likes - a.likes).slice(0, 3), [tweets]);

  if (loading) {
    return (
      <div data-testid="dashboard-page" className="space-y-5" aria-busy="true">
        <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-6 w-80" /></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        <Skeleton className="h-[420px]" />
        <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
      </div>
    );
  }

  const sinceSync = Math.max(0, Math.round((Date.now() - lastSync.getTime()) / 60000));

  return (
    <div data-testid="dashboard-page" className="space-y-6 md:space-y-8">
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>

      {/* ---- Page header ---- */}
      <div className="flex flex-wrap items-start justify-between gap-4" data-testid="dashboard-header" style={{ animation: "fadeUp .5s ease both" }}>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white md:text-[26px]">Overview</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${ytAvailable ? "border-red-500/15 bg-red-500/[0.06] text-red-300" : "border-white/[0.08] bg-white/[0.03] text-soft"}`}>
              {YT_ICON}{ch?.channelName || "YouTube not connected"}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${xAvailable ? "border-white/[0.1] bg-white/[0.05] text-white/80" : "border-white/[0.08] bg-white/[0.03] text-soft"}`}>
              {X_SVG}{profile ? `@${profile.username}` : "X not connected"}
            </span>
            <span className="inline-flex items-center gap-1.5 pl-1 text-[11px] text-soft" aria-live="polite" data-testid="dashboard-sync-status">
              <span className={`h-1.5 w-1.5 rounded-full ${syncing ? "animate-pulse bg-violet-400" : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"}`} />
              {syncing ? "Syncing…" : sinceSync < 1 ? "Synced just now" : `Synced ${sinceSync} min ago`}
            </span>
          </div>
        </div>
        <button
          onClick={load}
          disabled={syncing}
          data-testid="dashboard-refresh-button"
          className="inline-flex min-h-[36px] items-center gap-2 rounded-[10px] border border-violet-500/25 bg-violet-500/[0.1] px-3.5 py-2 text-[12px] font-semibold text-violet-200 shadow-[0_0_20px_-8px_rgba(139,92,246,0.55)] transition-all duration-150 hover:bg-violet-500/[0.16] hover:shadow-[0_0_26px_-6px_rgba(139,92,246,0.7)] active:scale-[0.98] disabled:opacity-70"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} aria-hidden="true" />
          {syncing ? "Syncing" : "Refresh"}
        </button>
      </div>

      {/* ---- Primary metrics ---- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="dashboard-kpi-grid">
        <PrimaryKpi label="Views" value={ytAvailable ? formatNum(ch!.totalViews) : "—"} platform="yt" icon={<Eye className="h-3.5 w-3.5" />} spark={sparkYt} sub="All-time channel views" />
        <PrimaryKpi label="Subscribers" value={ytAvailable ? formatNum(ch!.subscribers) : "—"} platform="yt" icon={<Users className="h-3.5 w-3.5" />} sub="Channel subscribers" />
        <PrimaryKpi label="Followers" value={xAvailable ? formatNum(profile!.followers) : "—"} platform="x" icon={<Users className="h-3.5 w-3.5" />} sub={`@${profile?.username ?? "—"}`} />
        <PrimaryKpi label="Views / Impressions" value={formatNum(tweetMetrics.views)} platform="brand" icon={<Activity className="h-3.5 w-3.5" />} sub="Combined across platforms" />
      </div>

      {/* ---- Secondary metrics strip ---- */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" data-testid="dashboard-secondary-grid">
        <SecondaryKpi label="Videos" value={ytAvailable ? formatNum(ch!.videoCount) : "—"} platform="yt" delay={0} />
        <SecondaryKpi label="Following" value={xAvailable ? formatNum(profile!.following) : "—"} platform="x" delay={40} />
        <SecondaryKpi label="Posts" value={xAvailable ? formatNum(profile!.tweetCount) : "—"} platform="x" delay={80} />
        <SecondaryKpi label="Engagement" value={tweetMetrics.eng !== null ? `${tweetMetrics.eng.toFixed(1)}%` : "—"} platform="brand" delay={120} />
      </div>

      {/* ---- Performance hero ---- */}
      <PerformanceChart bundle={bundle} />

      {/* ---- Content intelligence ---- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-5" data-testid="dashboard-youtube-section" aria-label="Recent YouTube videos">
          <SectionHeader icon={YT_ICON} title="Latest Videos" sub="YouTube · newest uploads" platform="yt" testId="dashboard-youtube-header" />
          <ul className="mt-3 space-y-0.5">
            {(bundle?.videos ?? []).slice(0, 5).map((v) => <VideoRow key={v.id} v={v} />)}
            {(bundle?.videos ?? []).length === 0 && (
              <li className="flex flex-col items-center rounded-xl border border-dashed border-white/[0.08] py-12 text-center">
                <Film className="h-5 w-5 text-soft" aria-hidden="true" />
                <p className="mt-2.5 text-[13px] text-white/80">No videos found</p>
                <p className="mt-0.5 text-[11px] text-soft">Uploads will appear here once available.</p>
              </li>
            )}
          </ul>
        </section>

        <section className="surface p-5" data-testid="dashboard-x-section" aria-label="Recent X posts">
          <SectionHeader icon={X_SVG} title="Latest Posts" sub="X · most recent" platform="x" testId="dashboard-x-header" />
          <ul className="mt-3 space-y-2">
            {(tweets ?? []).slice(0, 3).map((t) => <TweetCard key={t.id} t={t} />)}
            {tweetError && (tweets ?? []).length === 0 && (
              <li className="flex flex-col items-center rounded-xl border border-dashed border-white/[0.08] px-4 py-12 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-white/70">{X_SVG}</span>
                <p className="mt-3 text-[13px] font-medium text-white/85">Post metrics unavailable</p>
                <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-soft">{tweetError}</p>
                <Link to="/x" className="mt-3.5 rounded-[10px] border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/85 transition-colors hover:bg-white/[0.08]">Open X page</Link>
              </li>
            )}
          </ul>
        </section>
      </div>

      {/* ---- Platform comparison + Top content ---- */}
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="surface p-5 lg:col-span-2" data-testid="dashboard-compare-section" aria-label="Platform comparison">
          <SectionHeader icon={<BarChart3 className="h-3.5 w-3.5" />} title="Platform Overview" sub="YouTube vs X" platform="brand" testId="dashboard-compare-header" />
          <div className="mt-5 space-y-5">
            <CompareBar label="Audience" ytPct={(cmp.ytSubs / cmp.total(cmp.ytSubs, cmp.xFol)) * 100} xPct={(cmp.xFol / cmp.total(cmp.ytSubs, cmp.xFol)) * 100} ytVal={formatNum(cmp.ytSubs)} xVal={formatNum(cmp.xFol)} />
            <CompareBar label="Content volume" ytPct={(cmp.ytContent / cmp.total(cmp.ytContent, cmp.xContent)) * 100} xPct={(cmp.xContent / cmp.total(cmp.ytContent, cmp.xContent)) * 100} ytVal={formatNum(cmp.ytContent)} xVal={formatNum(cmp.xContent)} />
            <CompareBar label="Reach" ytPct={(cmp.ytReach / cmp.total(cmp.ytReach, cmp.xReach)) * 100} xPct={(cmp.xReach / cmp.total(cmp.ytReach, cmp.xReach)) * 100} ytVal={formatNum(cmp.ytReach)} xVal={formatNum(cmp.xReach)} />
          </div>
          <div className="mt-5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4" data-testid="dashboard-compare-engagement">
            <div className="flex items-baseline justify-between">
              <p className="text-[12px] text-soft">Engagement</p>
              <p className="text-lg font-semibold tabular-nums text-white">{tweetMetrics.eng !== null ? `${tweetMetrics.eng.toFixed(1)}%` : "—"}</p>
            </div>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-700" style={{ width: `${Math.min(100, (tweetMetrics.eng ?? 0) * 10)}%` }} />
            </div>
            <p className="mt-1.5 text-[10px] text-soft/70">Recent X posts</p>
          </div>
        </section>

        <section className="surface p-5 lg:col-span-3" data-testid="dashboard-top-section" aria-label="Top content">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeader icon={<Sparkles className="h-3.5 w-3.5" />} title="Top Content" sub="Best performing recently" platform="brand" testId="dashboard-top-header" />
            <div className="overflow-x-auto no-scrollbar">
              <Segmented options={["all", "yt", "x"] as const} value={topTab} onChange={setTopTab}
                format={(t) => (t === "all" ? "All" : t === "yt" ? "YouTube" : "X")} testPrefix="dashboard-top-tab" />
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {(topTab === "all" || topTab === "yt") && (
              <div>
                {topTab === "all" && <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-400">{YT_ICON}YouTube</p>}
                <ul className="space-y-0.5" data-testid="dashboard-top-videos">
                  {topVideos.map((v, i) => <VideoRow key={v.id} v={v} rank={i + 1} showRank />)}
                  {topVideos.length === 0 && <p className="py-4 text-center text-[12px] text-soft">No video data yet</p>}
                </ul>
              </div>
            )}
            {(topTab === "all" || topTab === "x") && (
              <div>
                {topTab === "all" && <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">{X_SVG}X</p>}
                <ul className="space-y-2" data-testid="dashboard-top-posts">
                  {topTweets.map((t, i) => <TweetCard key={t.id} t={t} rank={i + 1} showRank />)}
                  {topTweets.length === 0 && (
                    <li className="flex flex-col items-center rounded-xl border border-dashed border-white/[0.08] py-8 text-center">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-white/60">{X_SVG}</span>
                      <p className="mt-2.5 text-[12px] text-white/75">X post metrics need a higher API tier</p>
                      <p className="mt-0.5 text-[11px] text-soft">Your profile stats remain live above.</p>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
