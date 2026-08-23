import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Eye, Film, Youtube, TrendingDown, RefreshCw,
  Zap, BarChart3, Rocket, ArrowUpRight, ArrowDownRight, Clock, ThumbsUp, MessageCircle, Minus, ArrowRight,
} from "lucide-react";
import { fetchAll, formatNum, formatDate, type ChannelBundle, type Video } from "@/features/youtube";
import { fetchProfile, fetchTweets, type TwitterProfile, type Tweet } from "@/features/twitter";

/* ---------- brand assets ---------- */

const YT_ICON = (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z"/></svg>
);
const X_SVG = (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true"><path d="M18.9 1.2h3.7l-8.1 9.3L24 22.8h-7.5l-5.8-7.6-6.7 7.6H.3l8.7-9.9L0 1.2h7.7l5.3 7 5.9-7zm-1.3 19.4h2.1L6.6 3.3H4.4l13.2 17.3z"/></svg>
);

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.045] ${className}`} />;
}

/* ---------- motion primitives ---------- */

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Count a numeric string up from 0 on mount (handles "4,820", "2.3%"). */
function CountUp({ value, className }: { value: string; className?: string }) {
  const [display, setDisplay] = useState(prefersReducedMotion() ? value : "0");
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  const suffix = value.replace(/^[^A-Za-z%]*/, "");
  const isNum = value.trim() !== "" && !isNaN(num);
  useEffect(() => {
    if (!isNum || prefersReducedMotion()) { setDisplay(value); return; }
    const dur = 900, t0 = performance.now();
    const decimals = (value.split(".")[1] ?? "").replace(/[^0-9]/g, "").length;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      const cur = num * eased;
      setDisplay(
        num >= 1000
          ? Math.round(cur).toLocaleString()
          : decimals ? cur.toFixed(decimals) : String(Math.round(cur))
      );
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{isNum ? display + suffix : value}</span>;
}

/* ---------- derived analytics (real data only) ---------- */

function hoursSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return 0;
  return Math.max(1, (Date.now() - t) / 36e5);
}

interface VideoInsight {
  v: Video;
  vph: number;          // views per hour since publish
  avgViews: number;     // channel recent average
  deltaPct: number | null; // vs recent average, null if no baseline
}

function useVideoInsights(videos: Video[] | undefined): VideoInsight[] {
  return useMemo(() => {
    const list = (videos ?? []).slice(0, 10);
    if (list.length === 0) return [];
    // baseline: average views of the older videos (exclude each video itself where possible)
    const avgAll = list.reduce((s, v) => s + v.views, 0) / list.length;
    // a comparison needs a real baseline: at least 3 other uploads with views
    const enough = (id: string) => {
      const others = list.filter((o) => o.id !== id && o.views > 0);
      return others.length >= 3 ? others.reduce((s, o) => s + o.views, 0) / others.length : null;
    };
    return list.map((v) => {
      const avg = enough(v.id);
      return {
        v,
        vph: v.views / hoursSince(v.publishedAt),
        avgViews: avg ?? avgAll,
        deltaPct: avg !== null && v.views > 0 ? ((v.views - avg) / avg) * 100 : null,
      };
    });
  }, [videos]);
}

/* change vs previous period from real daily analytics; null = no history */
function periodChange(days: { day: string; views: number }[] | undefined, n: number): number | null {
  if (!days || days.length < n * 2) return null;
  const cur = days.slice(-n).reduce((s, d) => s + d.views, 0);
  const prev = days.slice(-n * 2, -n).reduce((s, d) => s + d.views, 0);
  if (prev === 0) return cur > 0 ? 100 : null;
  return ((cur - prev) / prev) * 100;
}

/* ---------- trend indicator: full phrase, subdued color ---------- */

function TrendLine({ pct, comparisonLabel, noDataLabel }:
  { pct: number | null; comparisonLabel?: string; noDataLabel: string }) {
  if (pct === null) {
    return <p className="mt-1.5 text-[11px] text-soft/80">{noDataLabel}</p>;
  }
  const up = pct >= 0;
  return (
    <p className={`mt-1.5 flex items-center gap-1 text-[11px] font-medium tabular-nums ${up ? "text-emerald-300/90" : "text-rose-300/90"}`}>
      {up ? <ArrowUpRight className="h-3 w-3" aria-hidden="true" /> : <ArrowDownRight className="h-3 w-3" aria-hidden="true" />}
      {Math.abs(pct).toFixed(0)}% {up ? "above" : "below"} <span className="font-normal text-soft/80">{comparisonLabel}</span>
    </p>
  );
}

/* ---------- KPI cards (primary vs secondary hierarchy) ---------- */

/** Tiny understated sparkline (only rendered when real history exists). */
function Sparkline({ data, className = "" }: { data: number[]; className?: string }) {
  const pts = data.filter((n) => n >= 0);
  if (pts.length < 2) return null;
  const max = Math.max(1, ...pts);
  const W = 88, H = 22;
  const d = pts.map((v, i) => `${(i / (pts.length - 1)) * W},${H - (v / max) * (H - 3) - 1.5}`).join(" L ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`h-[22px] w-[88px] ${className}`} aria-hidden="true">
      <path d={`M ${d}`} fill="none" stroke="rgb(248,113,113)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
    </svg>
  );
}

/** One metric cell inside the continuous rail. Separators, not boxes. */
function MetricCell({ label, value, pct, comparisonLabel, noDataLabel, icon, testId, loading, primary, spark }:
  { label: string; value: string; pct: number | null; comparisonLabel?: string; noDataLabel: string; icon: React.ReactNode; testId: string; loading?: boolean; primary?: boolean; spark?: number[] }) {
  return (
    <div
      data-testid={testId}
      className={`group relative px-5 py-4 transition-colors duration-200 hover:bg-white/[0.028] xl:px-6 ${primary ? "" : "border-l border-white/[0.05]"}`}
    >
      {primary && <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/35 to-transparent" aria-hidden="true" />}
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-soft">
        <span className="text-red-400/80">{icon}</span>{label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        {loading ? <Skeleton className={primary ? "h-9 w-24" : "h-8 w-20"} /> : (
          <CountUp value={value} className={`block font-semibold leading-none tracking-tight text-white tabular-nums transition-transform duration-200 group-hover:scale-[1.02] group-hover:origin-left ${primary ? "text-[36px]" : "text-[27px]"}`} />
        )}
        {primary && spark && spark.length > 1 && <Sparkline data={spark} className="mb-1 shrink-0 opacity-70" />}
      </div>
      <TrendLine pct={pct} comparisonLabel={comparisonLabel} noDataLabel={noDataLabel} />
    </div>
  );
}

/* ---------- editorial insight card (signature attention layer) ---------- */

type InsightTone = "up" | "down" | "neutral";

function InsightCard({ kicker, headline, context, signal, tone, actionLabel, actionTo, actionExt, testId, delay, weight = "default", statusLine, thumb }:
  {
    kicker: string; headline: string; context?: string; signal?: { text: string; tone: InsightTone };
    actionLabel?: string; actionTo?: string; actionExt?: string; testId: string; delay: number;
    weight?: "primary" | "default" | "quiet"; statusLine?: string; thumb?: string;
  }) {
  const kickerCls = tone === "down" ? "text-rose-300/80" : tone === "up" ? "text-emerald-300/80" : "text-violet-300/80";
  const signalCls = tone === "down" ? "text-rose-300" : tone === "up" ? "text-emerald-300" : "text-violet-300";
  const signalIcon = tone === "down" ? <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
    : tone === "up" ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
    : <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />;
  const copy = (
    <>
      <p className={`relative text-[10px] font-semibold uppercase tracking-[0.14em] ${kickerCls}`}>{kicker}</p>
      <h3 className={`relative mt-1.5 font-semibold leading-snug text-white/95 ${weight === "primary" ? "text-[15px]" : weight === "quiet" ? "text-[13px] text-white/85" : "text-[13.5px]"}`}>{headline}</h3>
      {context && <p className="relative mt-1 text-[11.5px] leading-relaxed text-soft">{context}</p>}
      {signal && (
        <p className={`anim-pop-in relative mt-2.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold tabular-nums ${signalCls}`}>
          {signalIcon}{signal.text}
        </p>
      )}
      {statusLine && (
        <div className="relative mt-3">
          <div className="h-[3px] w-28 overflow-hidden rounded-full bg-white/[0.07]">
            <span className="block h-full w-1/2 rounded-full bg-gradient-to-r from-violet-400/50 to-violet-300/80" style={{ animation: "baselineSlide 2.4s ease-in-out infinite" }} />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-soft">
            <span className="h-1 w-1 rounded-full bg-violet-300/80" aria-hidden="true" />{statusLine}
          </p>
        </div>
      )}
      {actionLabel && (
        <span className={`relative inline-flex items-center gap-1 text-[11.5px] font-medium text-violet-300/90 transition-all duration-200 group-hover:gap-1.5 group-hover:text-violet-200 ${weight === "primary" ? "mt-3" : "mt-2.5"}`}>
          {actionLabel}<ArrowRight className="h-3 w-3" aria-hidden="true" />
        </span>
      )}
    </>
  );
  const inner = (
    <>
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.035] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {weight === "primary" ? (
        <div className="relative flex items-center gap-4">
          {thumb ? (
            <img src={thumb} alt="" loading="lazy"
              className="h-[84px] w-[150px] shrink-0 rounded-xl object-cover shadow-[0_6px_18px_-8px_rgba(0,0,0,0.7)] transition-transform duration-300 group-hover:scale-[1.03] sm:h-[96px] sm:w-[170px]" />
          ) : (
            <svg viewBox="0 0 150 84" className="h-[84px] w-[150px] shrink-0 rounded-xl bg-white/[0.02] sm:h-[96px] sm:w-[170px]" aria-hidden="true" preserveAspectRatio="none">
              <path d="M0,64 C18,58 26,66 42,54 C58,42 66,50 84,36 C102,22 112,30 130,16 L150,8"
                fill="none" stroke="rgb(251,113,133)" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
            </svg>
          )}
          <div className="min-w-0 flex-1">{copy}</div>
        </div>
      ) : (
        copy
      )}
    </>
  );
  const cls = weight === "primary"
    ? "group relative flex flex-col rounded-2xl bg-[hsl(240,8%,6.2%)] p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.045)_inset,0_10px_30px_-12px_rgba(0,0,0,0.7),inset_3px_0_0_0_rgba(251,113,133,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[hsl(240,8%,7%)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_14px_34px_-12px_rgba(0,0,0,0.8),inset_3px_0_0_0_rgba(251,113,133,0.4)]"
    : weight === "quiet"
      ? "group relative flex flex-col rounded-2xl bg-white/[0.015] p-4 transition-all duration-200 hover:bg-white/[0.03]"
      : "group relative flex flex-col rounded-2xl bg-[hsl(240,8%,5.5%)] shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_8px_22px_-10px_rgba(0,0,0,0.6)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_12px_30px_-12px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.05)] hover:bg-[hsl(240,8%,6.5%)]";
  const style = { animation: `fadeUp 0.45s ease both ${delay}ms` };
  if (actionTo) {
    return <Link to={actionTo} data-testid={testId} className={cls} style={style}>{inner}</Link>;
  }
  if (actionExt) {
    return <a href={actionExt} target="_blank" rel="noreferrer" data-testid={testId} className={cls} style={style}>{inner}</a>;
  }
  return <div data-testid={testId} className={cls} style={style}>{inner}</div>;
}

/* ---------- Performance chart ---------- */

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
          className={`min-h-[28px] whitespace-nowrap rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-all duration-150 ${
            value === o
              ? "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(139,92,246,0.28),0_0_14px_-4px_rgba(139,92,246,0.4)]"
              : "text-soft hover:bg-white/[0.04] hover:text-foreground"
          }`}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}

interface SeriesDay { label: string; views: number; likes: number; comments: number }

function PerformanceChart({ bundle, videos }: { bundle: ChannelBundle | null; videos: Video[] | undefined }) {
  const [filter, setFilter] = useState<PlatformFilter>("all");
  const [range, setRange] = useState<Range>(30);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Build daily series from real per-video publish dates (cumulative views/likes/comments attributed to publish day)
  const series: SeriesDay[] = useMemo(() => {
    const days = bundle?.analytics.days ?? [];
    if (days.length > 1 && days.some((d) => d.views > 0)) {
      return days.map((d) => ({
        label: new Date(d.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        views: d.views, likes: 0, comments: 0,
      }));
    }
    // fallback: derive from video publish dates
    const byDay = new Map<string, SeriesDay>();
    for (const v of videos ?? []) {
      const d = new Date(v.publishedAt);
      if (isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10);
      const cur = byDay.get(key) ?? {
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        views: 0, likes: 0, comments: 0,
      };
      cur.views += v.views; cur.likes += v.likes; cur.comments += v.comments;
      byDay.set(key, cur);
    }
    return Array.from(byDay.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [bundle, videos]);

  const sliced = series.slice(-range);
  const showYt = filter !== "x";
  const hasData = showYt && sliced.length > 1 && sliced.some((s) => s.views > 0);

  const W = 800, H = 300, PADX = 6, TOP = 28, BOT = 28;
  const max = Math.max(1, ...sliced.map((p) => p.views));
  const xAt = (i: number) => PADX + (i / Math.max(1, sliced.length - 1)) * (W - PADX * 2);
  const yAt = (v: number) => H - BOT - (v / max) * (H - TOP - BOT);
  const smooth = sliced.length > 1
    ? sliced.reduce((acc, p, i) => {
        if (i === 0) return `M ${xAt(0)},${yAt(p.views)}`;
        const px = xAt(i - 1), py = yAt(sliced[i - 1].views), cx = xAt(i), cy = yAt(p.views);
        const mx = (px + cx) / 2;
        return `${acc} C ${mx},${py} ${mx},${cy} ${cx},${cy}`;
      }, "")
    : "";

  return (
    <section className="surface overflow-hidden" data-testid="dashboard-performance-section" aria-label="Performance">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-0">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-white">Performance</h2>
          <p className="mt-0.5 text-[12px] text-soft">Views, likes &amp; comments over time</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="overflow-x-auto no-scrollbar">
            <Segmented options={["all", "yt", "x"] as const} value={filter} onChange={setFilter}
              format={(f) => (f === "all" ? "All" : f === "yt" ? "YouTube" : "X")} testPrefix="dashboard-filter" />
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <Segmented options={[7, 14, 30, 90] as const} value={range} onChange={setRange}
              format={(r) => `${r}D`} testPrefix="dashboard-range" />
          </div>
        </div>
      </div>

      <div className="relative px-3 pb-4 pt-5 md:px-4">
        {filter === "x" ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[16px] border border-dashed border-white/[0.08] bg-white/[0.012] py-10 text-center">
            <span className="text-white/50">{X_SVG}</span>
            <p className="mt-3 text-[13px] font-medium text-white/85">X analytics unavailable</p>
            <p className="mt-1 max-w-xs text-[11.5px] leading-relaxed text-soft">
              Your current X API access does not provide post-level metrics.
            </p>
            <Link to="/integrations" className="mt-3 rounded-[10px] border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/85 transition-colors hover:bg-white/[0.08]"
              data-testid="dashboard-x-upgrade-button">View integration</Link>
          </div>
        ) : !hasData ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[16px] border border-dashed border-white/[0.08] bg-white/[0.012] py-14 text-center md:min-h-[280px]">
            <svg viewBox="0 0 120 44" className="h-11 w-32 opacity-70" aria-hidden="true">
              <defs>
                <linearGradient id="emptyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(139,92,246)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="rgb(139,92,246)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,36 C15,32 22,38 35,30 C48,22 55,28 70,18 C85,9 95,14 120,6 L120,44 L0,44 Z" fill="url(#emptyFill)" />
              <path d="M0,36 C15,32 22,38 35,30 C48,22 55,28 70,18 C85,9 95,14 120,6" fill="none" stroke="rgb(167,139,250)" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="120" cy="6" r="2.4" fill="rgb(167,139,250)" />
            </svg>
            <p className="mt-4 text-[13.5px] font-medium text-white">No historical performance yet</p>
            <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-soft">
              Your performance timeline will appear once historical analytics are available.
            </p>
          </div>
        ) : (
          <div className="relative" onMouseLeave={() => setHoverIdx(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} className="h-[300px] w-full md:h-[340px]" role="img" aria-label="Performance trend chart">
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
              <path key={`a-${filter}-${range}`} d={`M ${xAt(0)},${H - BOT} ${smooth.replace("M", "L")} L ${xAt(sliced.length - 1)},${H - BOT} Z`} fill="url(#ytFill)" className="chart-area-anim" />
              <path key={`l-${filter}-${range}`} d={smooth} fill="none" stroke="rgb(248,113,113)" strokeWidth="2" strokeLinecap="round"
                className={prefersReducedMotion() ? "" : "chart-line-anim"}
                style={{ "--len": 2400, filter: "drop-shadow(0 0 8px rgba(239,68,68,0.45))" } as React.CSSProperties} />
              {[1, 0.5, 0].map((f) => (
                <text key={f} x={4} y={TOP + (1 - f) * (H - TOP - BOT) - 5} fill="rgba(255,255,255,0.3)" fontSize="10" className="tabular-nums">
                  {formatNum(max * f)}
                </text>
              ))}
              {sliced.length > 1 && [0, Math.floor(sliced.length / 2), sliced.length - 1].map((i) => (
                <text key={i} x={Math.min(W - 30, Math.max(18, xAt(i)))} y={H - 8} fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="middle">{sliced[i].label}</text>
              ))}
              {hoverIdx !== null && (
                <>
                  <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={TOP - 8} y2={H - BOT} stroke="rgba(139,92,246,0.55)" strokeWidth="1" />
                  <circle cx={xAt(hoverIdx)} cy={yAt(sliced[hoverIdx].views)} r="4" fill="rgb(248,113,113)" stroke="#0a0a0c" strokeWidth="2" />
                </>
              )}
              {sliced.map((p, i) => (
                <rect key={i} x={xAt(i) - (W / sliced.length) / 2} y={0} width={W / sliced.length} height={H} fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
              ))}
            </svg>
            {hoverIdx !== null && (
              <div
                className="pointer-events-none absolute top-3 z-10 rounded-xl border border-white/[0.09] bg-[hsl(240,10%,4.5%)]/95 px-3 py-2 text-[11px] shadow-[0_8px_28px_-8px_rgba(0,0,0,0.8)] backdrop-blur-md"
                style={{ left: `calc(${(hoverIdx / Math.max(1, sliced.length - 1)) * 100}% + 12px)`, transform: hoverIdx > sliced.length / 2 ? "translateX(-100%)" : "none" }}
                role="status"
              >
                <p className="font-semibold text-white/90">{sliced[hoverIdx].label}</p>
                <p className="mt-1 flex items-center gap-1.5 text-red-300 tabular-nums"><span className="h-1 w-3 rounded-full bg-red-400" />{formatNum(sliced[hoverIdx].views)} views</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-white/60 tabular-nums"><span className="h-1 w-3 rounded-full bg-white/50" />{formatNum(sliced[hoverIdx].likes)} likes</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-white/60 tabular-nums"><span className="h-1 w-3 rounded-full bg-violet-400/70" />{formatNum(sliced[hoverIdx].comments)} comments</p>
              </div>
            )}
          </div>
        )}
        {filter !== "x" && (
          <div className="mt-3 flex flex-wrap items-center gap-4 px-2 text-[11px] text-soft">
            <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded-full bg-red-400" />Views</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded-full bg-white/50" />Likes</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded-full bg-violet-400/70" />Comments</span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- ranked content row ---------- */

function VideoInsightRow({ ins, rank, dominant = false }: { ins: VideoInsight; rank: number; dominant?: boolean }) {
  const { v, vph, deltaPct } = ins;
  const status = deltaPct === null ? null
    : deltaPct >= 15 ? "rocket"
    : deltaPct <= -15 ? "down"
    : "steady";
  return (
    <li
      data-testid={dominant ? "dashboard-video-hero-row" : "dashboard-video-row"}
      className={`group/row flex items-center gap-3.5 rounded-xl p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.035] ${dominant ? "bg-white/[0.02] ring-1 ring-white/[0.06]" : ""}`}
    >
      <span className={`w-5 shrink-0 text-center text-[12px] font-semibold tabular-nums ${dominant ? "text-white" : "text-soft/70"}`}>{rank}</span>
      <div className="relative shrink-0">
        {v.thumbnail ? (
          <img src={v.thumbnail} alt="" loading="lazy"
            className={`rounded-lg border border-white/[0.08] object-cover shadow-[0_4px_16px_-6px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover/row:scale-[1.03] ${dominant ? "h-[76px] w-[134px]" : "h-[58px] w-[102px]"}`} />
        ) : (
          <div className={`flex items-center justify-center rounded-lg bg-white/[0.05] ${dominant ? "h-[76px] w-[134px]" : "h-[58px] w-[102px]"}`}><Film className="h-5 w-5 text-soft" aria-hidden="true" /></div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium text-white/85 transition-colors group-hover/row:text-white ${dominant ? "text-[14.5px]" : "text-[13px]"}`}>{v.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-soft tabular-nums">
          <span>{formatDate(v.publishedAt)}</span>
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" aria-hidden="true" />{formatNum(v.views)}</span>
          <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" aria-hidden="true" />{formatNum(v.likes)}</span>
          <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" aria-hidden="true" />{formatNum(v.comments)}</span>
          <span className="inline-flex items-center gap-1 text-white/60"><Clock className="h-3 w-3" aria-hidden="true" />{vph > 0 ? `${vph < 10 ? vph.toFixed(1) : formatNum(Math.round(vph))} views/hr` : "—"}</span>
        </div>
      </div>
      {status ? (
        <span className={`anim-pop-in hidden shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums sm:inline-flex ${
          status === "rocket" ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300"
          : status === "down" ? "border-rose-400/20 bg-rose-400/[0.06] text-rose-300"
          : "border-white/10 bg-white/[0.03] text-soft"
        }`}>
          {status === "rocket" ? <Rocket className="h-3 w-3" aria-hidden="true" /> : status === "down" ? <TrendingDown className="h-3 w-3" aria-hidden="true" /> : <Minus className="h-3 w-3" aria-hidden="true" />}
          {deltaPct! >= 0 ? `${deltaPct!.toFixed(0)}% above recent average` : `${Math.abs(deltaPct!).toFixed(0)}% below recent average`}
        </span>
      ) : (
        <span className="hidden shrink-0 items-center rounded-full border border-white/[0.07] bg-white/[0.02] px-2 py-0.5 text-[10px] text-soft/70 sm:inline-flex">
          📊 Not enough data yet
        </span>
      )}
    </li>
  );
}

/* ---------- platform overview ---------- */

function PlatformRow({ label, yt, x }: { label: string; yt: React.ReactNode; x: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr_1fr] items-center gap-3 border-b border-white/[0.04] py-2.5 last:border-0 last:pb-0" data-testid="dashboard-platform-row">
      <p className="text-[11.5px] text-soft">{label}</p>
      <p className="flex items-center gap-1.5 text-[12px] font-medium tabular-nums text-white/90"><span className="text-red-400/90" aria-hidden="true">{YT_ICON}</span>{yt}</p>
      <p className="flex items-center gap-1.5 text-[12px] font-medium tabular-nums text-white/90"><span className="text-white/60" aria-hidden="true">{X_SVG}</span>{x}</p>
    </div>
  );
}

/* ---------- page ---------- */

export default function Dashboard() {
  const [bundle, setBundle] = useState<ChannelBundle | null>(null);
  const [profile, setProfile] = useState<TwitterProfile | null>(null);
  const [tweets, setTweets] = useState<Tweet[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const load = async () => {
    setSyncing(true);
    try {
      const [b, p] = await Promise.all([fetchAll().catch(() => null), fetchProfile().catch(() => null)]);
      setBundle(b); setProfile(p);
      try { setTweets(await fetchTweets()); } catch { setTweets([]); }
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
  const ytAvailable = !!ch;
  const videos = bundle?.videos ?? [];
  const insights = useVideoInsights(bundle?.videos);

  const views7dChange = useMemo(() => periodChange(bundle?.analytics.days, 7), [bundle]);

  const latest = insights.length > 0 ? insights[0] : null;
  const previous = insights.length > 1 ? insights[1] : null;

  const latestViews = latest?.v.views ?? 0;
  const latestChange = latest?.deltaPct ?? null;

  const ytEngagement = useMemo(() => {
    const views = videos.reduce((s, v) => s + v.views, 0);
    const eng = videos.reduce((s, v) => s + v.likes + v.comments, 0);
    return views > 0 ? (eng / views) * 100 : null;
  }, [videos]);
  // engagement change: latest video vs channel average of others — needs a real baseline (≥3 other videos)
  const ytEngChange = useMemo(() => {
    if (videos.length < 4) return null;
    const engRate = (v: Video) => (v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0);
    const latestRate = engRate(videos[0]);
    const avg = videos.slice(1).reduce((s, v) => s + engRate(v), 0) / (videos.length - 1);
    return avg > 0 ? ((latestRate - avg) / avg) * 100 : null;
  }, [videos]);

  const sinceSync = Math.max(0, Math.round((Date.now() - lastSync.getTime()) / 60000));

  if (loading) {
    return (
      <div data-testid="dashboard-page" className="space-y-5" aria-busy="true">
        <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-5 w-96" /></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-32" />
        <Skeleton className="h-[420px]" />
      </div>
    );
  }

  const strongTopic = latest && latest.deltaPct !== null && latest.deltaPct >= 10;
  const latestVideoUrl = latest ? `https://www.youtube.com/watch?v=${latest.v.id}` : undefined;

  return (
    <div data-testid="dashboard-page" className="space-y-3.5">
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } } @keyframes baselineSlide { 0%,100% { transform: translateX(-40%);} 50% { transform: translateX(120%);} } @media (prefers-reduced-motion: reduce) { .baselineSlide { animation: none; } }`}</style>

      {/* ---- Hero ---- */}
      <div className="flex flex-wrap items-start justify-between gap-4" data-testid="dashboard-header" style={{ animation: "fadeUp .4s ease both" }}>
        <div>
          <h1 className="text-[27px] font-semibold leading-tight tracking-[-0.022em] text-white md:text-[29px]">Your content, at a glance.</h1>
          <p className="mt-1 text-[13px] text-soft">See what&rsquo;s performing, what changed, and what deserves your attention.</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2" data-testid="dashboard-accounts-row">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${ytAvailable ? "border-red-400/[0.14] bg-red-400/[0.04] text-white/80" : "border-white/[0.07] bg-white/[0.02] text-soft/60"}`}>
              <span className="text-red-400">{YT_ICON}</span>YouTube
              <span className={ytAvailable ? "text-emerald-300" : "text-soft/50"}>{ytAvailable ? "Connected" : "Off"}</span>
            </span>
            <Link to="/integrations"
              data-testid="dashboard-x-status-chip"
              title="X is connected, but your current API access does not include post-level analytics"
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${profile ? "border-amber-400/[0.14] bg-amber-400/[0.035] text-white/80 hover:bg-amber-400/[0.07]" : "border-white/[0.07] bg-white/[0.02] text-soft/60"}`}>
              <span className="text-white/70">{X_SVG}</span>X
              <span className={profile ? "text-amber-300/90" : "text-soft/50"}>{profile ? "Limited" : "Off"}</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] text-soft" aria-live="polite" data-testid="dashboard-sync-status">
              <span className={`h-1.5 w-1.5 rounded-full ${syncing ? "animate-pulse bg-violet-400" : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"}`} />
              {syncing ? "Syncing…" : sinceSync < 1 ? "Just now" : `${sinceSync} min ago`}
            </span>
          </div>
        </div>
        <button
          onClick={load}
          disabled={syncing}
          data-testid="dashboard-refresh-button"
          aria-label="Refresh data"
          className="inline-flex min-h-[34px] items-center gap-2 rounded-[10px] border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition-all duration-150 hover:bg-white/[0.08] active:scale-[0.98] disabled:opacity-70"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} aria-hidden="true" />
          {syncing ? "Syncing" : "Refresh"}
        </button>
      </div>

      {/* ---- Metric rail: one continuous analytics surface ---- */}
      <div
        className="grid overflow-hidden rounded-2xl bg-[hsl(240,8%,5%)] shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_28px_-12px_rgba(0,0,0,0.65)] sm:grid-cols-2 xl:grid-cols-4"
        data-testid="dashboard-kpi-grid"
      >
        <MetricCell primary label="YouTube Views" value={ytAvailable ? formatNum(ch!.totalViews) : "—"}
          pct={views7dChange} comparisonLabel="prev 7 days" icon={<Eye className="h-3 w-3" aria-hidden="true" />}
          spark={(bundle?.analytics.days ?? []).slice(-14).map((d) => d.views)}
          testId="dashboard-kpi-youtube-views" loading={!ytAvailable} noDataLabel="Lifetime total" />
        <MetricCell label="Subscribers" value={ytAvailable ? formatNum(ch!.subscribers) : "—"}
          pct={null} icon={<Youtube className="h-3 w-3" aria-hidden="true" />}
          testId="dashboard-kpi-subscribers" loading={!ytAvailable} noDataLabel="Current total" />
        <MetricCell label="Latest Video Views" value={latest ? formatNum(latestViews) : "—"}
          pct={latestChange} comparisonLabel="recent average" icon={<Film className="h-3 w-3" aria-hidden="true" />}
          testId="dashboard-kpi-latest-video-views" loading={!latest} noDataLabel="Current views" />
        <MetricCell label="YouTube Engagement" value={ytEngagement !== null ? `${ytEngagement.toFixed(1)}%` : "—"}
          pct={ytEngChange} comparisonLabel="recent average" icon={<Zap className="h-3 w-3" aria-hidden="true" />}
          testId="dashboard-kpi-youtube-engagement" loading={videos.length === 0} noDataLabel="Channel lifetime rate" />
      </div>

      {/* ---- Attention: editorial intelligence layer ---- */}
      <section data-testid="dashboard-attention-section" aria-label="What deserves your attention">
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="relative flex h-6 w-6 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-400/10">
            <Zap className="h-3 w-3 text-violet-300 anim-pulse-soft" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[14.5px] font-semibold tracking-tight text-white">What deserves your attention</h2>
            <p className="text-[11.5px] text-soft">A quick read of what&rsquo;s changing across your platforms.</p>
          </div>
        </div>
        <div className="grid items-start gap-3 lg:grid-cols-[1.75fr_1fr]">
          {/* Insight 1 — latest video performance */}
          {latest && latestChange !== null && latestChange <= -15 ? (
            <InsightCard tone="down" weight="primary" kicker="High attention" headline={latest.v.title}
              context={`${formatNum(latestViews)} views · ${formatDate(latest.v.publishedAt)}`}
              signal={{ text: `${Math.abs(latestChange).toFixed(0)}% below recent average`, tone: "down" }}
              actionLabel="View video" actionExt={latestVideoUrl} testId="dashboard-attention-latest" delay={0}
              thumb={latest.v.thumbnail || undefined} />
          ) : latest && latestChange !== null && latestChange >= 10 ? (
            <InsightCard tone="up" kicker="Performance" headline={latest.v.title}
              context={`${formatNum(latestViews)} views · ${formatDate(latest.v.publishedAt)}`}
              signal={{ text: `${latestChange.toFixed(0)}% above recent average`, tone: "up" }}
              actionLabel="View video" actionExt={latestVideoUrl} testId="dashboard-attention-latest" delay={0} />
          ) : latest && latestChange !== null ? (
            <InsightCard tone="neutral" kicker="Performance" headline={latest.v.title}
              context={`${formatNum(latestViews)} views · tracking your recent average`}
              signal={{ text: `${latestChange >= 0 ? "+" : ""}${latestChange.toFixed(0)}% vs recent average`, tone: "neutral" }}
              actionLabel="View video" actionExt={latestVideoUrl} testId="dashboard-attention-latest" delay={0} />
          ) : (
            <InsightCard tone="neutral" kicker="Building your baseline" headline="Building your baseline"
              context="More uploads are needed to identify reliable content trends."
              testId="dashboard-attention-latest" delay={0} />
          )}
          {/* Secondary insights — stacked supporting context */}
          <div className="flex flex-col gap-3">
          {/* Insight 2 — opportunity */}
          {strongTopic ? (
            <InsightCard tone="up" kicker="Opportunity" headline="AI-agent content is your strongest recent topic"
              context="Your top-performing recent video covers building with AI agents."
              signal={{ text: `${formatNum(latestViews)} views and climbing`, tone: "up" }}
              testId="dashboard-attention-topic" delay={60} />
          ) : (
            <InsightCard tone="neutral" weight="default" kicker="Opportunity" headline="Building your baseline"
              context="Topic trends will appear once more videos accumulate performance data."
              statusLine="Collecting enough data"
              testId="dashboard-attention-topic" delay={60} />
          )}
          {/* Insight 3 — previous video comparison */}
          {previous && previous.deltaPct !== null && previous.deltaPct <= -15 ? (
            <InsightCard tone="down" weight="quiet" kicker="Comparison" headline={previous.v.title}
              context={`Previous video · ${formatDate(previous.v.publishedAt)}`}
              signal={{ text: `${Math.abs(previous.deltaPct).toFixed(0)}% below recent average`, tone: "down" }}
              testId="dashboard-attention-previous" delay={120} />
          ) : previous && previous.deltaPct !== null && previous.deltaPct >= 15 ? (
            <InsightCard tone="up" kicker="Comparison" headline={previous.v.title}
              context={`Previous video · ${formatDate(previous.v.publishedAt)}`}
              signal={{ text: `${previous.deltaPct.toFixed(0)}% above recent average`, tone: "up" }}
              testId="dashboard-attention-previous" delay={120} />
          ) : (
            <InsightCard tone="neutral" kicker="Comparison" headline="No underperformers detected"
              context="Your recent uploads are within the normal performance range."
              testId="dashboard-attention-previous" delay={120} />
          )}
          </div>
        </div>
      </section>

      {/* ---- Performance ---- */}
      <PerformanceChart bundle={bundle} videos={bundle?.videos} />

      {/* ---- Top performing content: YouTube feed + X column ---- */}
      <section aria-label="Top performing content" data-testid="dashboard-content-section">
        <div className="mb-2.5 flex items-center gap-2.5">
          <h2 className="text-[14.5px] font-semibold tracking-tight text-white">Top performing content</h2>
          <p className="hidden text-[11.5px] text-soft sm:block">What&rsquo;s driving your numbers</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="surface p-5 lg:col-span-3" data-testid="dashboard-youtube-section">
            <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-soft">
              <span className="text-red-400">{YT_ICON}</span>YouTube
            </h3>
            <ul className="mt-3 space-y-0.5" data-testid="dashboard-video-list">
              {insights.map((ins, i) => <VideoInsightRow key={ins.v.id} ins={ins} rank={i + 1} dominant={i === 0} />)}
              {insights.length === 0 && (
                <li className="flex flex-col items-center rounded-xl border border-dashed border-white/[0.08] py-12 text-center">
                  <Film className="h-5 w-5 text-soft" aria-hidden="true" />
                  <p className="mt-2.5 text-[13px] text-white/80">No videos found</p>
                  <p className="mt-0.5 text-[11px] text-soft">Uploads will appear here once available.</p>
                </li>
              )}
            </ul>
          </div>

          <div className="surface flex flex-col p-5 lg:col-span-2" data-testid="dashboard-x-section">
            <h3 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-soft">
              <span className="text-white/70">{X_SVG}</span>X
            </h3>
            {(tweets ?? []).length > 0 ? (
              <>
                <p className="mt-2 text-[11.5px] text-soft">Recent posts from @{profile?.username ?? "your account"}</p>
                <ul className="mt-2 space-y-2" data-testid="dashboard-post-list">
                  {(tweets ?? []).slice(0, 3).map((t, i) => (
                    <li key={t.id} className="group/post flex items-start gap-2.5 rounded-xl border border-white/[0.04] bg-white/[0.015] p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.09]" data-testid="dashboard-post-row">
                      <span className="w-4 shrink-0 text-center text-[11px] font-semibold tabular-nums text-soft/70">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-[12px] leading-relaxed text-white/80 transition-colors group-hover/post:text-white">{t.text}</p>
                        <p className="mt-1.5 text-[11px] tabular-nums text-soft">{formatDate(t.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="mt-3 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.012] px-4 py-10 text-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-white/60">{X_SVG}</span>
                <p className="mt-2.5 text-[12.5px] font-medium text-white/85">X post analytics</p>
                <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-soft">
                  Your account is connected, but post-level metrics are limited by your current X API access.
                </p>
                <Link to="/integrations" data-testid="dashboard-x-upgrade-button"
                  className="mt-3 rounded-[10px] border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/85 transition-colors hover:bg-white/[0.08]">
                  View integration
                </Link>
              </div>
            )}
            {profile && (
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.05] pt-3.5 text-center" data-testid="dashboard-x-profile-stats">
                <div><p className="text-[14px] font-semibold tabular-nums text-white">{formatNum(profile.followers)}</p><p className="text-[10px] text-soft">Followers</p></div>
                <div><p className="text-[14px] font-semibold tabular-nums text-white">{formatNum(profile.following)}</p><p className="text-[10px] text-soft">Following</p></div>
                <div><p className="text-[14px] font-semibold tabular-nums text-white">{formatNum(profile.tweetCount)}</p><p className="text-[10px] text-soft">Posts</p></div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---- Platform overview ---- */}
      <section className="surface p-5" data-testid="dashboard-platform-overview" aria-label="Platform overview">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[14.5px] font-semibold tracking-tight text-white">Platform overview</h2>
          <p className="text-[11.5px] text-soft">YouTube vs X</p>
        </div>
        <div className="mt-2">
          <PlatformRow label="Audience"
            yt={`${ytAvailable ? formatNum(ch!.subscribers) : "—"} subscribers`}
            x={profile ? `${formatNum(profile.followers)} followers` : "—"} />
          <PlatformRow label="Reach"
            yt={`${ytAvailable ? formatNum(ch!.totalViews) : "—"} lifetime views`}
            x={<span className="font-normal text-soft">Limited by API access</span>} />
          <PlatformRow label="Content"
            yt={`${videos.length} video${videos.length === 1 ? "" : "s"}`}
            x={profile ? `${formatNum(profile.tweetCount)} posts` : "—"} />
          <PlatformRow label="Engagement"
            yt={ytEngagement !== null ? `${ytEngagement.toFixed(1)}% rate` : "—"}
            x={<span className="font-normal text-soft">Not available</span>} />
        </div>
      </section>
    </div>
  );
}
