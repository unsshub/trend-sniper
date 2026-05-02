// Data structures for the scraping service
export interface ScraperConfig {
  platform: 'tiktok' | 'instagram' | 'youtube';
  interval: number; // polling interval in ms
  maxResults: number;
  keywords?: string[];
}

export interface ScrapedVideo {
  id: string;
  platform: string;
  title: string;
  author: string;
  authorId: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  duration: number;
  description: string;
  hashtags: string[];
  postedAt: string;
  thumbnailUrl: string;
  videoUrl: string;
  engagementRate: number;
  velocity: number; // views per hour
}

export interface ScraperResult {
  success: boolean;
  data?: ScrapedVideo[];
  error?: string;
  timestamp: string;
  platform: string;
}

export interface PlatformScraper {
  name: string;
  scrape: (config: ScraperConfig) => Promise<ScraperResult>;
  validate: (config: ScraperConfig) => boolean;
}
