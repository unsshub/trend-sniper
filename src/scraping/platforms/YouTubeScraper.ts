import { BaseScraper, ScrapeResult } from './BaseScraper';
import type { TrendingVideo } from '../../types';

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
    tags?: string[];
    categoryId: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

export class YouTubeScraper extends BaseScraper {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey: string) {
    super('YouTube', {
      rateLimit: 50, // YouTube allows 10,000 requests/day = ~7/minute
      maxRetries: 3,
      timeout: 10000,
    });
    this.apiKey = apiKey;
  }

  async scrape(searchTerms?: string[]): Promise<ScrapeResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const videos: TrendingVideo[] = [];

    try {
      // Fetch trending videos with retry logic
      const trendingVideos = await this.fetchWithRetry(
        () => this.fetchTrendingVideos(searchTerms),
        this.config.maxRetries
      );

      for (const rawVideo of trendingVideos) {
        try {
          const normalized = this.normalizeToTrendingVideo(rawVideo, 'youtube');
          videos.push(normalized);
          await this.rateLimitDelay();
        } catch (err) {
          errors.push(this.handleError(err as Error, `Normalize video ${rawVideo.id}`));
        }
      }

    } catch (err) {
      errors.push(this.handleError(err as Error, 'Main scrape loop'));
    }

    return {
      success: errors.length === 0,
      videos,
      errors,
      metadata: {
        source: 'youtube-api',
        scrapedAt: new Date(),
        duration: Date.now() - startTime,
        totalVideos: videos.length,
      },
    };
  }

  private async fetchTrendingVideos(searchTerms?: string[]): Promise<YouTubeVideo[]> {
    const params = new URLSearchParams({
      part: 'snippet,statistics',
      chart: 'mostPopular',
      maxResults: '50',
      regionCode: 'US',
      key: this.apiKey,
    });

    if (searchTerms && searchTerms.length > 0) {
      params.set('q', searchTerms.join(' OR '));
    }

    const response = await fetch(`${this.baseUrl}/videos?${params}`);
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  private async fetchWithRetry<T>(
    fn: () => Promise<T>,
    retries: number
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    throw new Error('Max retries exceeded');
  }

  protected normalizeToTrendingVideo(raw: YouTubeVideo, platform: 'youtube'): TrendingVideo {
    const views = parseInt(raw.statistics.viewCount) || 0;
    const likes = parseInt(raw.statistics.likeCount) || 0;
    const comments = parseInt(raw.statistics.commentCount) || 0;
    
    // Extract first sentence as hook (first 3 seconds of video content)
    const hook = raw.snippet.description
      ? raw.snippet.description.split(/[.!?]/)[0].trim().substring(0, 100)
      : 'Check out this video';

    return {
      id: `yt_${raw.id}`,
      platform: 'youtube',
      title: raw.snippet.title,
      author: raw.snippet.channelTitle,
      authorFollowers: 0, // Would need separate API call
      views,
      viewsGrowth: 0, // Would need historical data
      likes,
      shares: 0, // YouTube doesn't expose share count in basic API
      comments,
      saves: 0,
      thumbnail: raw.snippet.thumbnails?.high?.url || raw.snippet.thumbnails?.default?.url || '',
      hook,
      hookDuration: 3, // Estimated
      category: this.mapCategoryId(raw.snippet.categoryId),
      caption: raw.snippet.description?.substring(0, 200) || '',
      hashtags: this.extractHashtags(raw.snippet.description || ''),
      sounds: 'N/A',
      postedAt: raw.snippet.publishedAt,
      viralScore: this.calculateViralScore(views, likes, comments),
      engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0,
      watchTimeSeconds: 0, // Would need YouTube Analytics API
    };
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.slice(1)) : [];
  }

  private mapCategoryId(categoryId: string): string {
    const categories: Record<string, string> = {
      '1': 'entertainment',
      '2': 'music',
      '10': 'music',
      '15': 'gaming',
      '17': 'sports',
      '19': 'travel',
      '20': 'gaming',
      '22': 'education',
      '23': 'comedy',
      '24': 'entertainment',
      '25': 'news',
      '26': 'howto',
      '27': 'education',
      '28': 'science',
      '29': 'nonprofit',
    };
    return categories[categoryId] || 'entertainment';
  }

  private calculateViralScore(views: number, likes: number, comments: number): number {
    // Weighted formula: 40% views velocity, 30% engagement, 20% comments, 10% freshness
    const viewScore = Math.min(views / 100000, 40);
    const likeScore = Math.min((likes / views) * 100, 30);
    const commentScore = Math.min((comments / views) * 100, 20);
    const baseScore = 10;
    
    return Math.min(Math.round(viewScore + likeScore + commentScore + baseScore), 100);
  }
}
