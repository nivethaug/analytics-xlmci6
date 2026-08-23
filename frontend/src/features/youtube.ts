// Real YouTube data via backend routes (which call the platform integration proxy)
import { getApiUrl } from "@/lib/api-config";

export interface Video {
  id: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  thumbnail: string | null;
}

export interface ChannelStats {
  id: string;
  channelName: string;
  handle: string;
  description: string;
  thumbnail: string | null;
  subscribers: number;
  totalViews: number;
  videoCount: number;
}

export interface AnalyticsDay {
  day: string;
  views: number;
  watchMinutes: number;
}

export interface AnalyticsData {
  available: boolean;
  startDate?: string;
  endDate?: string;
  totalViews?: number;
  totalWatchMinutes?: number;
  days: AnalyticsDay[];
  message?: string;
}

export interface ChannelBundle {
  channel: ChannelStats;
  videos: Video[];
  analytics: AnalyticsData;
}

export async function fetchChannel(): Promise<ChannelStats> {
  const res = await fetch(getApiUrl("/api/youtube/channel"));
  if (!res.ok) throw new Error(`Failed to load channel (${res.status})`);
  return res.json();
}

export async function fetchVideos(): Promise<Video[]> {
  const res = await fetch(getApiUrl("/api/youtube/videos"));
  if (!res.ok) throw new Error(`Failed to load videos (${res.status})`);
  const data = await res.json();
  return data.videos ?? [];
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch(getApiUrl("/api/youtube/analytics"));
  if (!res.ok) throw new Error(`Failed to load analytics (${res.status})`);
  return res.json();
}

export async function fetchAll(): Promise<ChannelBundle> {
  const [channel, videos, analytics] = await Promise.all([
    fetchChannel(),
    fetchVideos(),
    fetchAnalytics().catch(() => ({ available: false, days: [], message: "Analytics unavailable" })),
  ]);
  return { channel, videos, analytics };
}

export function formatNum(n: number | undefined | null): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return `${v}`;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
