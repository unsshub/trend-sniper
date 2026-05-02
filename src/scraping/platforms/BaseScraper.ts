import type { TrendingVideo } from '../../types';

export interface ScraperConfig {
  rateLimit: number; // requests per minute
  maxRetries: number;
  timeout: number;
  proxy?: string;
}

export interface ScrapeResult {
  success: boolean;
  videos: TrendingVideo[];
  errors: string[];
  metadata: {
    source: string;
    scrapedAt: Date;
    duration: number;
    totalVideos: number;
  };
}

export abstract class BaseScraper {
  protected config: ScraperConfig;
  protected name: string;

  constructor(name: string, config: ScraperConfig) {
    this.name = name;
    this.config = config;
  }

  abstract scrape(searchTerms?: string[]): Promise<ScrapeResult>;

  protected async rateLimitDelay(): Promise<void> {
    const delayMs = 60000 / this.config.rateLimit;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  protected handleError(error: Error, context: string): string {
    console.error(`[${this.name}] Error in ${context}:`, error.message);
    return `${context}: ${error.message}`;
  }

  protected normalizeToTrendingVideo(raw: any, platform: 'tiktok' | 'instagram' | 'youtube'): TrendingVideo {
    // This will be implemented by each platform scraper
    throw new Error('Must be implemented by subclass');
  }

  getConfig(): ScraperConfig {
    return { ...this.config };
  }
}
