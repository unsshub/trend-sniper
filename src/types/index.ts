export interface TrendingVideo {
  id: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  title: string;
  author: string;
  views: number;
  viewsGrowth: number;
  likes: number;
  shares: number;
  comments: number;
  duration: number | string;
  category: string;
  thumbnail: string;
  hook: string;
  caption: string;
  hashtags: string[];
  postedAt: string;
  viralScore: number;
  videoUrl?: string; // Link to original video
  isBookmarked?: boolean;
  channelId?: string; // YouTube channel ID
}

export interface HookPattern {
  pattern: string;
  frequency: number;
}

export interface CaptionLength {
  range: string;
  count: number;
}

export interface HashtagData {
  tag: string;
  count: number;
}

export interface PlatformPatterns {
  hookTypes: HookPattern[];
  captionLengths: CaptionLength[];
  topHashtags: HashtagData[];
  peakPostingTimes: string[];
  averageEngagementRate: number;
}

export interface PlatformData {
  platform: 'tiktok' | 'instagram' | 'youtube';
  videos: TrendingVideo[];
  patterns: PlatformPatterns;
  totalGrowth: number;
  trendingTopics: string[];
}

export type TimeFilter = '1h' | '24h' | '1w' | 'all';
export type ThemeMode = 'dark' | 'light';
export type SortOption = 'viralScore' | 'views' | 'viewsGrowth' | 'likes' | 'shares';
