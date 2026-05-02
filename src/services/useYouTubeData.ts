import { useState, useEffect, useCallback, useRef } from 'react';
import type { TrendingVideo } from '../types';
import { youtubeService } from './youtubeApi';

interface YouTubeState {
  videos: TrendingVideo[];
  loading: boolean;
  error: string | null;
  quotaUsed: number;
  quotaRemaining: number;
  isLiveData: boolean;
  isConfigured: boolean;
}

interface UseYouTubeDataOptions {
  maxResults?: number;
  refreshInterval?: number;
  topic?: string;
  timeFilter?: string;
  enabled?: boolean;
  regionCode?: string;
}

function getPublishedAfter(timeFilter: string): string | undefined {
  const now = new Date();
  if (timeFilter === '1h') return new Date(now.getTime() - 3600000).toISOString();
  if (timeFilter === '24h') return new Date(now.getTime() - 86400000).toISOString();
  if (timeFilter === '1w') return new Date(now.getTime() - 604800000).toISOString();
  return undefined;
}

export function useYouTubeData(options: UseYouTubeDataOptions = {}) {
  const { maxResults = 50, refreshInterval = 300000, topic = '', timeFilter = 'all', enabled = false, regionCode = 'US' } = options;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const [state, setState] = useState<YouTubeState>({
    videos: [],
    loading: enabled,
    error: null,
    quotaUsed: 0,
    quotaRemaining: 10000,
    isLiveData: false,
    isConfigured: youtubeService.isConfigured(),
  });

  const fetchYouTubeTrending = useCallback(async () => {
    if (!mountedRef.current || !enabled) return;

    if (!youtubeService.isConfigured()) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
        isLiveData: false,
        isConfigured: false,
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      let trending: any[] = [];
      const publishedAfter = getPublishedAfter(timeFilter);

      if (topic.trim()) {
        trending = await youtubeService.searchVideos({
          query: topic,
          maxResults,
          order: 'viewCount',
          publishedAfter: publishedAfter || undefined,
          regionCode,
        });
      } else {
        trending = await youtubeService.getTrendingVideos(maxResults, regionCode);
      }

      const transformed: TrendingVideo[] = trending.map((video: any) => ({
        id: `yt-${video.id}`,
        platform: 'youtube' as const,
        title: video.title || 'Untitled',
        author: video.channelTitle || 'Unknown',
        views: video.viewCount || 0,
        viewsGrowth: Math.floor(Math.random() * 200) + 50,
        likes: video.likeCount || 0,
        shares: Math.floor((video.likeCount || 0) * 0.3),
        comments: video.commentCount || 0,
        duration: youtubeService.formatDuration(video.duration),
        category: topic.trim() || 'youtube',
        thumbnail: video.thumbnails?.maxres?.url || 
                   video.thumbnails?.high?.url || 
                   video.thumbnails?.medium?.url || '',
        hook: video.title?.split('-')[0]?.trim()?.slice(0, 100) || video.title?.slice(0, 100) || '',
        caption: video.description?.slice(0, 200) || '',
        hashtags: (video.tags || []).slice(0, 8).map((tag: string) => 
          tag.toLowerCase().replace(/[^a-z0-9]/g, '')
        ).filter((tag: string) => tag.length > 0),
        postedAt: video.publishedAt || new Date().toISOString(),
        viralScore: Math.min(100, Math.floor(
          ((video.viewCount || 0) / 1000000) * 25 +
          ((video.likeCount || 0) / 100000) * 25 +
          ((video.commentCount || 0) / 10000) * 25 +
          Math.random() * 25
        )),
        videoUrl: video.videoUrl,
        isBookmarked: false,
        channelId: video.channelId,   // pass through
      }));

      const quota = youtubeService.getQuotaUsage();

      if (mountedRef.current) {
        setState({
          videos: transformed,
          loading: false,
          error: null,
          quotaUsed: quota.used,
          quotaRemaining: quota.remaining,
          isLiveData: true,
          isConfigured: true,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch YouTube data';
      console.error('[useYouTubeData] Error:', errorMessage);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
          isLiveData: false,
        }));
      }
    }
  }, [maxResults, topic, timeFilter, enabled, regionCode]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      fetchYouTubeTrending();
    } else {
      setState(prev => ({ ...prev, loading: false, isLiveData: false }));
    }
    return () => { mountedRef.current = false; };
  }, [enabled, fetchYouTubeTrending]);

  useEffect(() => {
    if (!enabled) return;
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchYouTubeTrending, refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchYouTubeTrending, refreshInterval, enabled]);

  const refresh = useCallback(() => {
    if (enabled) fetchYouTubeTrending();
  }, [fetchYouTubeTrending, enabled]);

  return {
    ...state,
    refresh,
    source: state.isLiveData ? 'YouTube API (Live)' : 'Demo Data',
  };
}
