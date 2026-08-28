import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Twitter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProfile, TwitterProfile } from "@/features/twitter";

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const X = () => {
  const [profile, setProfile] = useState<TwitterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await fetchProfile());
    } catch (e: any) {
      setError(e?.message || "Failed to load X profile");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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

      {profile && !loading && !error && (
        <Card data-testid="x-posts-note-card">
          <CardContent className="pt-6 text-center text-muted-foreground">
            Post-level analytics require a paid X API tier and are not available on your current plan.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default X;
