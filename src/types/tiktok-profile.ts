import type { StoryAuthor } from "./tiktok-story";

export const profileSections = ["posts", "reposts", "highlights", "followers", "following"] as const;
export type ProfileSection = typeof profileSections[number];
export type ProfileSummary = StoryAuthor & { bio?: string; followers?: number; following?: number; likes?: number; posts?: number };
export type ProfileItem = {
  id: string;
  title: string;
  cover?: string;
  url?: string;
  video?: string;
  images?: string[];
  author?: StoryAuthor;
  count?: number;
};
export type ProfileResult = { username: string; section: ProfileSection; profile?: ProfileSummary; items: ProfileItem[]; limited: boolean; limit?: number };
