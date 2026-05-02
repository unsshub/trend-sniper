// YouTube Data API v3 - Native fetch implementation
// Free tier: 10,000 quota units/day

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

function getApiKey(): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return (import.meta as any).env.VITE_YOUTUBE_API_KEY || '';
    }
  } catch (e) {}
  return '';
}

interface YouTubeSnippet {
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  thumbnails: {
    default: { url: string; width: number; height: number };
    medium: { url: string; width: number; height: number };
    high: { url: string; width: number; height: number };
    maxres?: { url: string; width: number; height: number };
  };
  tags?: string[];
  categoryId: string;
}

interface YouTubeStatistics {
  viewCount: string;
  likeCount: string;
  commentCount: string;
  favoriteCount: string;
}

interface YouTubeContentDetails {
  duration: string;
}

interface YouTubeVideoItem {
  id: string;
  snippet: YouTubeSnippet;
  statistics: YouTubeStatistics;
  contentDetails: YouTubeContentDetails;
}

interface YouTubeSearchItem {
  id: { videoId: string; kind: string };
  snippet: YouTubeSnippet;
}

interface YouTubeAPIResponse<T> {
  items: T[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  error?: {
    code: number;
    message: string;
    errors: Array<{ reason: string; message: string }>;
  };
}

export interface TransformedVideo {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  thumbnails: YouTubeSnippet['thumbnails'];
  tags: string[];
  categoryId: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  videoUrl: string;
}

export class YouTubeService {
  private apiKey: string;
  private quotaUsed: number = 0;
  private readonly maxQuota: number = 10000;

  constructor() {
    this.apiKey = getApiKey();
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0 && this.apiKey !== 'your_youtube_api_key_here';
  }

  getQuotaUsage() {
    return {
      used: this.quotaUsed,
      remaining: Math.max(0, this.maxQuota - this.quotaUsed),
      total: this.maxQuota,
    };
  }

  private async fetchAPI<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('YouTube API key not configured');
    }

    const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
    url.searchParams.set('key', this.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value && key !== 'key') {
        url.searchParams.set(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData?.error?.message || errorMsg;
      } catch (e) {}
      throw new Error(`YouTube API: ${errorMsg}`);
    }

    const data: YouTubeAPIResponse<T> = await response.json();
    if (data.error) {
      throw new Error(`YouTube API: ${data.error.message}`);
    }

    return data as unknown as T;
  }

  private transformVideo(item: YouTubeVideoItem): TransformedVideo {
    return {
      id: item.id,
      title: item.snippet?.title || 'Untitled',
      description: item.snippet?.description || '',
      channelTitle: item.snippet?.channelTitle || 'Unknown',
      channelId: item.snippet?.channelId || '',
      publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
      thumbnails: item.snippet?.thumbnails || {
        default: { url: '', width: 120, height: 90 },
        medium: { url: '', width: 320, height: 180 },
        high: { url: '', width: 480, height: 360 },
      },
      tags: item.snippet?.tags || [],
      categoryId: item.snippet?.categoryId || '0',
      duration: item.contentDetails?.duration || 'PT0S',
      viewCount: parseInt(item.statistics?.viewCount || '0'),
      likeCount: parseInt(item.statistics?.likeCount || '0'),
      commentCount: parseInt(item.statistics?.commentCount || '0'),
      videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
    };
  }

  async getTrendingVideos(maxResults: number = 12, regionCode: string = 'US'): Promise<TransformedVideo[]> {
    const data = await this.fetchAPI<{ items: YouTubeVideoItem[] }>('videos', {
      part: 'snippet,statistics,contentDetails',
      chart: 'mostPopular',
      maxResults: String(Math.min(maxResults, 50)),
      regionCode,
    });

    this.quotaUsed += 1 + (data.items.length || 0);
    return data.items.map(video => this.transformVideo(video));
  }


  async searchVideos(params: {
    query?: string;
    maxResults?: number;
    order?: string;
    publishedAfter?: string;
    regionCode?: string;
  }): Promise<TransformedVideo[]> {
    const searchParams: Record<string, string> = {
      part: 'snippet',
      maxResults: String(Math.min(params.maxResults || 12, 50)),
      q: params.query || '',
      order: params.order || 'viewCount',
      type: 'video',
      regionCode: params.regionCode || 'US',
      relevanceLanguage: 'en',
    };
    if (params.publishedAfter) {
      searchParams.publishedAfter = params.publishedAfter;
    }

    const searchData = await this.fetchAPI<{ items: YouTubeSearchItem[] }>('search', searchParams);
    this.quotaUsed += 100; // search costs 100 units

    if (!searchData.items?.length) return [];

    const videoIds = searchData.items.map(item => item.id.videoId).filter(Boolean).join(',');
    if (!videoIds) return [];

    const videoData = await this.fetchAPI<{ items: YouTubeVideoItem[] }>('videos', {
      part: 'snippet,statistics,contentDetails',
      id: videoIds,
    });
    this.quotaUsed += 1 + (videoData.items?.length || 0);

    return videoData.items.map(video => this.transformVideo(video));
  }

  formatDuration(isoDuration: string): string {
    if (!isoDuration) return '0:00';
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return '0:00';
    const hours = parseInt(match[1]?.replace('H', '') || '0');
    const minutes = parseInt(match[2]?.replace('M', '') || '0');
    const seconds = parseInt(match[3]?.replace('S', '') || '0');
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

export const youtubeService = new YouTubeService();
