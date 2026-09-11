import type { copy } from "@/lib/copy";

export type StoryAuthor = {
  username: string;
  displayName: string;
  avatar?: string;
};

type StoryBase = {
  id: string;
  views?: number;
  coverUrl?: string;
  duration?: number;
  createdAt?: string;
  expiresAt?: string;
  author: StoryAuthor;
};

export type TikTokStory = StoryBase & (
  | { type: "video"; videoUrl: string; imageUrl?: never }
  | { type: "image"; imageUrl: string; videoUrl?: never }
);

export type TikTokStoryResult = {
  username: string;
  hasStory: boolean;
  stories: TikTokStory[];
  author?: StoryAuthor;
};

export type StoryErrorCode = keyof typeof copy.errors;
export type StoryApiResponse =
  | ({ success: true } & TikTokStoryResult)
  | { success: false; error: { code: StoryErrorCode; message: string } };
