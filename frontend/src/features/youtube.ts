// Mock YouTube channel data (wiring to platform proxy is a PENDING edit)
export interface Video {
  id: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  thumbnail: string;
  duration: string;
}

export interface ChannelStats {
  channelName: string;
  handle: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  viewsLast28: number;
  watchHours: number;
  subsGained: number;
  subsLost: number;
  engagementRate: number;
}

export const channel: ChannelStats = {
  channelName: "My Channel",
  handle: "@mychannel",
  subscribers: 24815,
  totalViews: 1_842_300,
  videoCount: 128,
  viewsLast28: 96420,
  watchHours: 5310,
  subsGained: 412,
  subsLost: 38,
  engagementRate: 5.7,
};

export const videos: Video[] = [
  { id: "v1", title: "Building a Realtime Analytics Dashboard", publishedAt: "2026-08-18", views: 18420, likes: 1240, comments: 186, duration: "14:22", thumbnail: "grad1" },
  { id: "v2", title: "React Query Patterns You Should Know", publishedAt: "2026-08-05", views: 12310, likes: 980, comments: 142, duration: "11:47", thumbnail: "grad2" },
  { id: "v3", title: "I Analyzed 1M Rows in the Browser", publishedAt: "2026-07-27", views: 22105, likes: 2103, comments: 301, duration: "18:03", thumbnail: "grad3" },
  { id: "v4", title: "Tailwind Design Systems in 2026", publishedAt: "2026-07-14", views: 9870, likes: 742, comments: 95, duration: "09:58", thumbnail: "grad4" },
  { id: "v5", title: "YouTube API Deep Dive", publishedAt: "2026-06-30", views: 15430, likes: 1320, comments: 210, duration: "22:31", thumbnail: "grad5" },
];

export const dailyViews = [
  { day: "Aug 01", views: 2840 }, { day: "Aug 04", views: 3120 }, { day: "Aug 07", views: 2980 },
  { day: "Aug 10", views: 3560 }, { day: "Aug 13", views: 4110 }, { day: "Aug 16", views: 3890 },
  { day: "Aug 19", views: 4520 }, { day: "Aug 22", views: 5240 }, { day: "Aug 25", views: 6010 },
  { day: "Aug 28", views: 6840 },
];

export const trafficSources = [
  { label: "YouTube Search", value: 34, color: "#8b5cf6" },
  { label: "Suggested", value: 28, color: "#3b82f6" },
  { label: "Browse", value: 21, color: "#06b6d4" },
  { label: "External", value: 12, color: "#f59e0b" },
  { label: "Other", value: 5, color: "#64748b" },
];

export const topCountries = [
  { country: "United States", pct: 38 }, { country: "India", pct: 17 },
  { country: "Germany", pct: 11 }, { country: "United Kingdom", pct: 9 }, { country: "Brazil", pct: 7 },
];

export const formatNum = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;
