import { useEffect, useState } from "react";
import { Youtube, Twitter, Plug, CheckCircle2, XCircle, Link2, RefreshCw, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

interface Integration {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  scopes: string[];
}

const initial: Integration[] = [
  { id: "youtube", name: "YouTube", description: "Channel statistics, video performance and subscriber data via your connected Google account.", connected: true, scopes: ["youtube.readonly", "yt-analytics.readonly"] },
  { id: "x", name: "X (Twitter)", description: "Your connected X profile and the 3 most recent tweets with engagement metrics.", connected: true, scopes: ["tweet.read", "users.read", "offline.access"] },
  { id: "slack", name: "Slack", description: "Post weekly analytics digests to a channel.", connected: false, scopes: ["chat:write"] },
  { id: "notion", name: "Notion", description: "Sync monthly reports into a Notion database.", connected: false, scopes: ["insert_content"] },
];

const Integrations = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Integration[]>(initial);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const toggle = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, connected: !i.connected } : i));
  };

  const sync = (id: string) => {
    setSyncing(id);
    setTimeout(() => setSyncing(null), 1200);
  };

  return (
    <div className="space-y-6" aria-live="polite">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <span className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white"><Plug className="w-6 h-6" aria-hidden="true" /></span>
          Integrations
        </h1>
        <p className="text-muted-foreground mt-1">Connect your accounts — no API keys needed, one-click OAuth.</p>
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map(integ => (
            <Card key={integ.id} className="rounded-2xl border-0 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className={`p-3 rounded-xl text-white ${integ.id === "youtube" ? "bg-gradient-to-br from-red-600 to-rose-500" : integ.id === "x" ? "bg-gradient-to-br from-slate-900 to-slate-700" : "bg-gradient-to-br from-slate-500 to-slate-600"}`}>
                      {integ.id === "youtube" ? <Youtube className="w-6 h-6" aria-hidden="true" /> : integ.id === "x" ? <Twitter className="w-6 h-6" aria-hidden="true" /> : <Link2 className="w-6 h-6" aria-hidden="true" />}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-lg">{integ.name}</h2>
                        {integ.connected
                          ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="w-3 h-3 mr-1" aria-hidden="true" />Connected</Badge>
                          : <Badge variant="secondary" className="bg-slate-100 text-slate-500"><XCircle className="w-3 h-3 mr-1" aria-hidden="true" />Not connected</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{integ.description}</p>
                      {integ.connected && (
                        <p className="text-xs text-muted-foreground mt-2">Scopes: {integ.scopes.join(", ")}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-5">
                  <Switch
                    checked={integ.connected}
                    onCheckedChange={() => toggle(integ.id)}
                    aria-label={`Toggle ${integ.name} connection`}
                  />
                  <Button
                    size="sm"
                    variant={integ.connected ? "outline" : "default"}
                    disabled={!integ.connected || syncing === integ.id}
                    onClick={() => sync(integ.id)}
                    aria-label={`Sync ${integ.name} data now`}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing === integ.id ? "animate-spin" : ""}`} />
                    {syncing === integ.id ? "Syncing…" : integ.connected ? "Sync now" : "Connect"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="rounded-2xl border-0 shadow-md bg-gradient-to-r from-violet-600 to-blue-600 text-white">
        <CardHeader><CardTitle className="text-lg">Why OAuth?</CardTitle></CardHeader>
        <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p className="text-sm text-white/90 max-w-xl">
            Integrations use the platform OAuth proxy — tokens stay server-side, never in your browser or .env.
            Manage authorizations from this page with one click.
          </p>
          <Button variant="secondary" className="shrink-0" aria-label="Open integration documentation">
            <ExternalLink className="w-4 h-4 mr-2" />Docs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Integrations;
