// Real X (Twitter) data via backend routes (which call the platform integration proxy)
import { getApiUrl } from "@/lib/api-config";

export interface TwitterProfile {
  id: string;
  name: string;
  username: string;
  description: string | null;
  profileImage: string | null;
  followers: number;
  following: number;
  tweetCount: number;
}

export async function fetchProfile(): Promise<TwitterProfile> {
  const res = await fetch(getApiUrl("/api/twitter/profile"));
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || `Error ${res.status}`);
  return res.json();
}
// Tweet/timeline reads removed — paid X API tier. Only profile reads remain.
