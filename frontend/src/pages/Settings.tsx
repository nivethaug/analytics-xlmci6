import { useEffect, useState } from "react";
import { Settings as SettingsIcon, User, ShieldCheck, SlidersHorizontal, Save, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Tab = "profile" | "security" | "preferences";

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
];

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("profile");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({ name: "Channel Owner", email: "owner@mychannel.com", channelName: "My Channel", handle: "@mychannel" });
  const [security, setSecurity] = useState({ current: "", next: "", confirm: "" });
  const [prefs, setPrefs] = useState({ emailDigest: true, weeklyReport: true, anomalyAlerts: false, timezone: "UTC", currency: "USD" });

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveProfile = () => {
    if (!profile.name.trim() || !profile.email.includes("@")) {
      showToast("Name is required and email must be valid.", "error");
      return;
    }
    setSaving(true);
    setTimeout(() => { setSaving(false); showToast("Profile saved successfully.", "success"); }, 700);
  };

  const saveSecurity = () => {
    if (security.next.length < 8) { showToast("New password must be at least 8 characters.", "error"); return; }
    if (security.next !== security.confirm) { showToast("Passwords do not match.", "error"); return; }
    setSaving(true);
    setTimeout(() => { setSaving(false); setSecurity({ current: "", next: "", confirm: "" }); showToast("Password updated.", "success"); }, 700);
  };

  const savePrefs = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); showToast("Preferences saved.", "success"); }, 700);
  };

  const inputCls = "w-full";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <span className="p-2 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white"><SettingsIcon className="w-6 h-6" aria-hidden="true" /></span>
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">Manage your profile, security and reporting preferences</p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}
        >
          <span className="flex items-center gap-2"><Check className="w-4 h-4" aria-hidden="true" />{toast.msg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto" role="tablist" aria-label="Settings sections">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors min-h-[44px] whitespace-nowrap ${
              tab === t.id ? "border-violet-600 text-violet-600" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" aria-hidden="true" />{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : (
        <Card className="rounded-2xl border-0 shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl max-w-2xl">
          <CardHeader><CardTitle className="text-lg">{tabs.find(t => t.id === tab)?.label}</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {tab === "profile" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" aria-label="Full name" className={inputCls} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" aria-label="Email address" className={inputCls} value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="channel">Channel name</Label>
                    <Input id="channel" aria-label="Channel name" value={profile.channelName} onChange={e => setProfile({ ...profile, channelName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="handle">Handle</Label>
                    <Input id="handle" aria-label="Channel handle" value={profile.handle} onChange={e => setProfile({ ...profile, handle: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={saveProfile} disabled={saving} aria-label="Save profile settings">{saving ? "Saving…" : "Save changes"}</Button>
                  <Button variant="outline" onClick={() => setProfile({ name: "Channel Owner", email: "owner@mychannel.com", channelName: "My Channel", handle: "@mychannel" })} aria-label="Cancel profile edits">Cancel</Button>
                </div>
              </>
            )}

            {tab === "security" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cur">Current password</Label>
                  <Input id="cur" type="password" aria-label="Current password" value={security.current} onChange={e => setSecurity({ ...security, current: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next">New password</Label>
                  <Input id="next" type="password" aria-label="New password" value={security.next} onChange={e => setSecurity({ ...security, next: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <Input id="confirm" type="password" aria-label="Confirm new password" value={security.confirm} onChange={e => setSecurity({ ...security, confirm: e.target.value })} />
                  <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
                </div>
                <Button onClick={saveSecurity} disabled={saving} aria-label="Update password">{saving ? "Updating…" : "Update password"}</Button>
              </>
            )}

            {tab === "preferences" && (
              <>
                <div className="flex items-center justify-between min-h-[44px]">
                  <div><p className="font-medium text-sm">Daily email digest</p><p className="text-xs text-muted-foreground">Summary of yesterday's channel stats</p></div>
                  <Switch checked={prefs.emailDigest} onCheckedChange={v => setPrefs({ ...prefs, emailDigest: v })} aria-label="Toggle daily email digest" />
                </div>
                <div className="flex items-center justify-between min-h-[44px]">
                  <div><p className="font-medium text-sm">Weekly report</p><p className="text-xs text-muted-foreground">Detailed PDF every Monday</p></div>
                  <Switch checked={prefs.weeklyReport} onCheckedChange={v => setPrefs({ ...prefs, weeklyReport: v })} aria-label="Toggle weekly report" />
                </div>
                <div className="flex items-center justify-between min-h-[44px]">
                  <div><p className="font-medium text-sm">Anomaly alerts</p><p className="text-xs text-muted-foreground">Notify on unusual spikes or drops</p></div>
                  <Switch checked={prefs.anomalyAlerts} onCheckedChange={v => setPrefs({ ...prefs, anomalyAlerts: v })} aria-label="Toggle anomaly alerts" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={prefs.timezone} onValueChange={v => setPrefs({ ...prefs, timezone: v })}>
                      <SelectTrigger aria-label="Timezone"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem><SelectItem value="America/New_York">Eastern</SelectItem><SelectItem value="Europe/Berlin">Berlin</SelectItem><SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={prefs.currency} onValueChange={v => setPrefs({ ...prefs, currency: v })}>
                      <SelectTrigger aria-label="Currency"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="JPY">JPY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={savePrefs} disabled={saving} aria-label="Save preferences">{saving ? "Saving…" : "Save preferences"}</Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Settings;
