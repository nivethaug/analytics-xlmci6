import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Repeat2, MessageCircle, Eye, RefreshCw, Twitter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProfile, fetchTweets, TwitterProfile, Tweet } from "@/features/twitter";

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const timeAgo = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (isNaN(d)) return "";
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const X = () => {
  const [profile, setProfile] = useState<TwitterProfile | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setError(null);
    let hadError: string | null = null;
    try {
      setProfile(await fetchProfile());
    } catch (e: any) {
      hadError = e?.message || "Failed to load X profile";
    }
    try {
      setTweets(await fetchTweets());
    } catch (e: any) {
      hadError = e?.message || "Failed to load tweets";
    }
    setError(hadError);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalLikes = tweets.reduce((a, t) => a + t.likes, 0);
  const totalRts = tweets.reduce((a, t) => a + t.retweets, 0);
  const totalImp = tweets.reduce((a, t) => a + t.impressions, 0);

  return (
    <div data-testid="x-page" className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Twitter aria-hidden="true" className="h-6 w-6 text-sky-500" /> X (Twitter)
        </h1>
        <Button variant="outline" size="sm" onClick={load} data-testid="x-refresh-button" aria-label="Refresh X data">
          <RefreshCw aria-hidden="true" className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {error && (
        <Card data-testid="x-error-card">
          <CardContent className="pt-6 text-center space-y-3">
            <p className="text-muted-foreground">{error}</p>
            <Button asChild>
              <Link to="/integrations" data-testid="x-goto-integrations">Go to Integrations</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && !profile && (
        <div className="space-y-4" data-testid="x-loading">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {profile && (
        <Card data-testid="x-profile-card">
          <CardContent className="pt-6 flex items-start gap-4">
            <img
              src={profile.profileImage || ""}
              alt={`${profile.name} avatar`}
              className="h-16 w-16 rounded-full object-cover bg-muted"
            />
            <div className="space-y-1">
              <div className="font-semibold text-lg">{profile.name}</div>
              <div className="text-muted-foreground">@{profile.username}</div>
              {profile.description && <p className="text-sm">{profile.description}</p>}
              <div className="flex gap-4 text-sm text-muted-foreground" aria-live="polite">
                <span><b className="text-foreground">{fmt(profile.followers)}</b> Followers</span>
                <span><b className="text-foreground">{fmt(profile.following)}</b> Following</span>
                <span><b className="text-foreground">{fmt(profile.tweetCount)}</b> Posts</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {profile && tweets.length > 0 && (
        <Card data-testid="x-summary-card">
          <CardContent className="pt-6 grid grid-cols-3 gap-4 text-center">
            <div><div className="text-xl font-bold">{fmt(totalLikes)}</div><div className="text-xs text-muted-foreground">Likes (3 posts)</div></div>
            <div><div className="text-xl font-bold">{fmt(totalRts)}</div><div className="text-xs text-muted-foreground">Reposts (3 posts)</div></div>
            <div><div className="text-xl font-bold">{fmt(totalImp)}</div><div className="text-xs text-muted-foreground">Impressions (3 posts)</div></div>
          </CardContent>
        </Card>
      )}

      {tweets.map((t, i) => (
        <Card key={t.id || i} data-testid={`x-tweet-card-${i}`}>
          <CardContent className="pt-6 space-y-3">
            <p className="whitespace-pre-wrap">{t.text}</p>
            <div className="text-xs text-muted-foreground">{timeAgo(t.createdAt)}</div>
            <div className="flex gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Heart aria-hidden="true" className="h-4 w-4" /> {fmt(t.likes)}</span>
              <span className="flex items-center gap-1"><Repeat2 aria-hidden="true" className="h-4 w-4" /> {fmt(t.retweets)}</span>
              <span className="flex items-center gap-1"><MessageCircle aria-hidden="true" className="h-4 w-4" /> {fmt(t.replies)}</span>
              <span className="flex items-center gap-1"><Eye aria-hidden="true" className="h-4 w-4" /> {fmt(t.impressions)}</span>
            </div>
          </CardContent>
        </Card>
      ))}

      {profile && !loading && tweets.length === 0 && !error && (
        <Card data-testid="x-empty-card">
          <CardContent className="pt-6 text-center text-muted-foreground">No tweets found.</CardContent>
        </Card>
      )}
    </div>
  );
};

export default X;
