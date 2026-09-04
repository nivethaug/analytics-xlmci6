import { useEffect, useState } from "react";
import { RefreshCw, MessagesSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetchSubs, RedditSub } from "@/features/reddit";

const DEFAULT_SUBS = [
  "AI_India", "nocode", "developersIndia",
  "NoCodeAppBuilder", "lowcode", "webdev", "SaaS",
  "Entrepreneur", "artificial", "ChatGPT", "OpenAI",
  "vibecoding", "india", "startups_india",
];

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const timeAgo = (utc: number) => {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - utc));
  const units: [number, string][] = [[86400, "d"], [3600, "h"], [60, "m"]];
  for (const [sec, label] of units) if (s >= sec) return `${Math.floor(s / sec)}${label}`;
  return `${s}s`;
};

const SubCard = ({ sub }: { sub: RedditSub }) => (
  <Card data-testid={`reddit-card-${sub.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`}>
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-3 text-base">
        {sub.icon ? (
          <img src={sub.icon} alt="" className="h-9 w-9 rounded-full bg-muted object-cover" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600/20 text-orange-400 font-bold">r/</span>
        )}
        <span>
          r/{sub.name}
          {sub.title ? <span className="block text-xs font-normal text-muted-foreground">{sub.title}</span> : null}
        </span>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex gap-4 text-sm text-muted-foreground" aria-live="polite">
        <span><b className="text-foreground">{fmt(sub.subscribers)}</b> Members</span>
        <span><b className="text-foreground">{fmt(sub.activeUsers)}</b> Online</span>
      </div>

      {sub.posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No posts found.</p>
      ) : (
        <ul className="space-y-2" data-testid={`reddit-posts-${sub.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`}>
          {sub.posts.slice(0, 5).map((p, i) => (
            <li key={i} className="rounded-lg border border-white/[0.06] p-3 text-sm hover:bg-white/[0.03] transition-colors">
              <a href={p.permalink} target="_blank" rel="noreferrer" className="font-medium hover:text-orange-400 line-clamp-2">
                {p.title}
              </a>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>▲ {fmt(p.score)}</span>
                <span className="flex items-center gap-1"><MessagesSquare aria-hidden="true" className="h-3 w-3" /> {fmt(p.numComments)}</span>
                <span>u/{p.author}</span>
                <span>{timeAgo(p.createdUtc)} ago</span>
                {p.flair ? <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{p.flair}</Badge> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

const Reddit = () => {
  const [subs, setSubs] = useState<Record<string, RedditSub>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSubs(DEFAULT_SUBS);
      setSubs(data.subs || {});
      setErrors(data.errors || {});
      if (!data.subs || Object.keys(data.subs).length === 0) setError("Reddit data is temporarily unavailable. Try again in a few minutes.");
    } catch (e: any) {
      setError(e?.message || "Failed to load Reddit data");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div data-testid="reddit-page" className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-600/20 text-orange-400 font-bold text-sm" aria-hidden="true">r/</span>
          Reddit
        </h1>
        <Button variant="outline" size="sm" onClick={load} data-testid="reddit-refresh-button" aria-label="Refresh Reddit data">
          <RefreshCw aria-hidden="true" className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && (
        <Card data-testid="reddit-error-card">
          <CardContent className="pt-6 text-center text-muted-foreground">{error}</CardContent>
        </Card>
      )}

      {loading && Object.keys(subs).length === 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="reddit-loading">
          {DEFAULT_SUBS.map(s => <Skeleton key={s} className="h-64 w-full" />)}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {Object.values(subs).map(sub => <SubCard key={sub.name} sub={sub} />)}
        {Object.entries(errors).map(([name, msg]) => (
          <Card key={name} data-testid={`reddit-error-${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`}>
            <CardContent className="pt-6 text-center text-muted-foreground">
              r/{name}: {msg}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Reddit;
