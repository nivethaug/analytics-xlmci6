// Reddit public data via backend routes
import { getApiUrl } from "@/lib/api-config";

export interface RedditPost {
  title: string;
  author: string;
  score: number;
  numComments: number;
  upvoteRatio: number;
  createdUtc: number;
  permalink: string;
  url: string;
  flair: string | null;
}

export interface RedditSub {
  name: string;
  title: string;
  description: string;
  subscribers: number;
  activeUsers: number;
  icon: string;
  createdUtc: number;
  posts: RedditPost[];
}

export async function fetchSubs(subs: string[] = []): Promise<{ subs: Record<string, RedditSub>; errors: Record<string, string> }> {
  const q = subs.length ? `?subreddits=${encodeURIComponent(subs.join(","))}` : "";
  const res = await fetch(getApiUrl(`/api/reddit/subs${q}`));
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || `Error ${res.status}`);
  return res.json();
}
