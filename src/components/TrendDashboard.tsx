import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  TrendingUp, Clock, Share2, Heart, MessageCircle, 
  Eye, Zap, Search, X, SlidersHorizontal, RefreshCw,
  Wifi, Database, AlertCircle, Bookmark, BookmarkCheck,
  Download, Sun, Moon, ExternalLink, Filter, Hash, Power, Video, Globe
} from 'lucide-react';
import type { TrendingVideo, PlatformData, TimeFilter, Theme } from '../types';
import dummyData from '../data/dummyTrends.json';
import { useYouTubeData } from '../services/useYouTubeData';
import { bookmarkService } from '../utils/bookmarks';
import { exportService } from '../utils/exportData';
import { themeService } from '../utils/theme';
import VideoModal from './VideoModal';

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatDuration(duration) {
  if (typeof duration === 'string') return duration;
  if (duration < 60) return duration.toString() + 's';
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  return mins + ':' + secs.toString().padStart(2, '0');
}

function getDurationSeconds(duration) {
  if (typeof duration === 'number') return duration;
  const match = String(duration).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (match) {
    return (parseInt(match[1]||'0')*3600) + (parseInt(match[2]||'0')*60) + parseInt(match[3]||'0');
  }
  const parts = String(duration).split(':');
  if (parts.length === 2) return parseInt(parts[0])*60 + parseInt(parts[1]);
  return parseInt(duration) || 0;
}

function getTimeAgo(dateStr) {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return diffMins + 'm ago';
  if (diffHours < 24) return diffHours + 'h ago';
  if (diffDays < 7) return diffDays + 'd ago';
  return new Date(dateStr).toLocaleDateString();
}

const typedData = dummyData;
const SORT_OPTIONS = [
  { value: 'viralScore', label: 'Viral Score' },
  { value: 'views', label: 'Total Views' },
  { value: 'viewsGrowth', label: 'Growth Rate' },
  { value: 'likes', label: 'Likes' },
];

const TIME_FILTERS = [
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24h' },
  { value: '1w', label: 'Last Week' },
  { value: 'all', label: 'All Time' },
];

const POPULAR_TOPICS = [
  'gaming', 'cooking', 'tech', 'music', 'fitness', 'comedy',
  'fashion', 'travel', 'dance', 'education', 'sports', 'beauty',
];

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
];

function TrendDashboard() {
  const [activePlatform, setActivePlatform] = useState('all');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => themeService.init());

  const [topic, setTopic] = useState('');
  const [debouncedTopic, setDebouncedTopic] = useState('');
  const topicTimeoutRef = useRef(null);
  
  useEffect(() => {
    if (topicTimeoutRef.current) clearTimeout(topicTimeoutRef.current);
    topicTimeoutRef.current = setTimeout(() => {
      setDebouncedTopic(topic.trim().toLowerCase());
    }, 500);
    return () => { if (topicTimeoutRef.current) clearTimeout(topicTimeoutRef.current); };
  }, [topic]);

  const [timeFilter, setTimeFilter] = useState('all');
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [regionCode, setRegionCode] = useState('US');

  const youtubeData = useYouTubeData({
    maxResults: 50,
    refreshInterval: 300000,
    topic: debouncedTopic,
    timeFilter,
    enabled: liveEnabled,
    regionCode,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('viralScore');
  const [minGrowth, setMinGrowth] = useState(0);
  const [minViralScore, setMinViralScore] = useState(0);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [longVideosOnly, setLongVideosOnly] = useState(false);
  
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    const bookmarks = bookmarkService.getAll();
    return new Set(bookmarks.map(b => b.id));
  });

  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (isInitialLoad.current) {
      setLoading(true);
    }
    const timer = setTimeout(() => {
      try {
        let allVideos = [];
        
        Object.entries(typedData).forEach(([platform, platformData]) => {
          if (platform !== 'youtube' && platformData && platformData.videos) {
            allVideos = [...allVideos, ...platformData.videos];
          }
        });

        if (youtubeData.videos.length > 0) {
          allVideos = [...allVideos, ...youtubeData.videos];
        } else if (typedData.youtube && typedData.youtube.videos) {
          allVideos = [...allVideos, ...typedData.youtube.videos];
        }

        if (debouncedTopic) {
          allVideos = allVideos.filter(v => {
            return v.category?.toLowerCase() === debouncedTopic;
          });
        }

        allVideos = allVideos.map(v => ({
          ...v,
          isBookmarked: bookmarkedIds.has(v.id),
        }));

        allVideos.sort((a, b) => b.viralScore - a.viralScore);
        setVideos(allVideos);
        if (youtubeData.error) setError(youtubeData.error);
        setLoading(false);
        isInitialLoad.current = false;
      } catch (err) {
        console.error('[Dashboard] Error:', err);
        setError('Failed to load trending data');
        setLoading(false);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [youtubeData.videos, youtubeData.isLiveData, youtubeData.error, bookmarkedIds, debouncedTopic]);

  const toggleBookmark = useCallback((videoId) => {
    const isNowBookmarked = bookmarkService.toggle(videoId);
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (isNowBookmarked) next.add(videoId);
      else next.delete(videoId);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = themeService.toggle();
    setTheme(newTheme);
  }, []);

  const openVideoUrl = useCallback((url) => {
    if (!url) return;
    const newWin = window.open(url, '_blank', 'noopener,noreferrer');
    if (newWin) {
      // Try to bring focus back to the app immediately
      window.focus();
    }
  }, []);

  const openChannelUrl = useCallback((channelId) => {
    if (!channelId) return;
    const url = 'https://www.youtube.com/channel/' + channelId + '/videos';
    const newWin = window.open(url, '_blank', 'noopener,noreferrer');
    if (newWin) {
      window.focus();
    }
  }, []);

  const getTimeFilterDate = (filter) => {
    const now = new Date();
    if (filter === '1h') return new Date(now.getTime() - 3600000);
    if (filter === '24h') return new Date(now.getTime() - 86400000);
    if (filter === '1w') return new Date(now.getTime() - 604800000);
    return null;
  };

  const filteredVideos = useMemo(() => {
    let result = [...videos];

    if (activePlatform !== 'all') result = result.filter(v => v.platform === activePlatform);
    if (showBookmarkedOnly) result = result.filter(v => bookmarkedIds.has(v.id));

    if (longVideosOnly) {
      result = result.filter(v => getDurationSeconds(v.duration) >= 60);
    }

    const cutoffDate = getTimeFilterDate(timeFilter);
    if (cutoffDate) result = result.filter(v => new Date(v.postedAt) >= cutoffDate);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v => 
        (v.title || '').toLowerCase().includes(query) ||
        (v.author || '').toLowerCase().includes(query) ||
        (v.hook || '').toLowerCase().includes(query) ||
        (v.caption || '').toLowerCase().includes(query) ||
        (v.hashtags || []).some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (minGrowth > 0) result = result.filter(v => v.viewsGrowth >= minGrowth);
    if (minViralScore > 0) result = result.filter(v => v.viralScore >= minViralScore);

    result.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return (bVal || 0) - (aVal || 0);
    });

    return result;
  }, [videos, activePlatform, searchQuery, minGrowth, minViralScore, sortBy, timeFilter, showBookmarkedOnly, bookmarkedIds, longVideosOnly]);

  const getGrowthColor = (growth) => {
    if (growth > 200) return 'text-green-400';
    if (growth > 100) return 'text-yellow-400';
    if (growth > 50) return 'text-orange-400';
    return 'text-gray-400';
  };

  const bgClass = theme === 'dark' 
    ? 'bg-gradient-to-br from-gray-950 via-slate-900 to-black'
    : 'bg-gradient-to-br from-slate-100 via-white to-gray-100';
  const cardBg = theme === 'dark' ? 'bg-white/5 backdrop-blur-md' : 'bg-white shadow-lg';
  const cardBorder = theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200';
  const textPrimary = theme === 'dark' ? 'text-slate-100' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-slate-300' : 'text-gray-600';
  const inputBg = theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-100 border-gray-200';

  if (loading && isInitialLoad.current) {
    return React.createElement('div', { className: bgClass + ' min-h-screen flex items-center justify-center' },
      React.createElement('div', { className: 'text-center' },
        React.createElement(Zap, { className: 'w-20 h-20 mx-auto mb-6 animate-pulse text-cyan-400' }),
        React.createElement('p', { className: 'text-4xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent' }, 'Trend Sniper'),
        React.createElement('p', { className: textSecondary + ' mt-4 text-lg' }, 'Loading trends...')
      )
    );
  }

  return React.createElement('div', { className: bgClass + ' min-h-screen transition-colors duration-500' },
    React.createElement('div', { className: 'sticky top-0 z-40 backdrop-blur-xl border-b ' + (theme === 'dark' ? 'bg-gray-950/80 border-white/5' : 'bg-white/80 border-gray-200') },
      React.createElement('div', { className: 'max-w-7xl mx-auto px-4 py-4' },
        React.createElement('div', { className: 'flex items-center justify-between mb-4' },
          React.createElement('div', { className: 'flex items-center gap-4' },
            React.createElement('h1', { className: 'text-3xl font-extrabold tracking-tight' },
              React.createElement('span', { className: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-purple-400' }, 'Trend Sniper')
            ),
            React.createElement('button', {
              onClick: () => setLiveEnabled(!liveEnabled),
              className: 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition ' + (liveEnabled ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-gray-300')
            },
              React.createElement(Power, { className: 'w-3.5 h-3.5' }),
              liveEnabled ? 'Live ON' : 'Live OFF'
            ),
            liveEnabled && youtubeData.isLiveData && React.createElement('span', { className: 'text-xs text-gray-500' }, 'Quota: ' + youtubeData.quotaRemaining.toLocaleString()),
            liveEnabled && youtubeData.loading && React.createElement('span', { className: 'flex items-center gap-1 text-xs text-cyan-400' },
              React.createElement(RefreshCw, { className: 'w-3 h-3 animate-spin' }), 'Loading YouTube...'
            )
          ),
          React.createElement('div', { className: 'flex items-center gap-2' },
            React.createElement('button', {
              onClick: () => setShowBookmarkedOnly(!showBookmarkedOnly),
              className: 'p-2 rounded-lg transition ' + (showBookmarkedOnly ? 'bg-yellow-500/20 text-yellow-400' : cardBg + ' ' + textSecondary + ' hover:text-yellow-400')
            }, showBookmarkedOnly ? React.createElement(BookmarkCheck, { className: 'w-5 h-5' }) : React.createElement(Bookmark, { className: 'w-5 h-5' })),
            React.createElement('div', { className: 'relative group' },
              React.createElement('button', { className: 'p-2 rounded-lg transition ' + cardBg + ' ' + textSecondary + ' hover:text-cyan-400' },
                React.createElement(Download, { className: 'w-5 h-5' })
              ),
              React.createElement('div', { className: 'absolute right-0 top-full mt-1 bg-gray-900 border border-white/10 rounded-lg py-1 hidden group-hover:block min-w-[120px] z-50' },
                React.createElement('button', { onClick: () => exportService.toJSON(filteredVideos), className: 'w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10' }, 'Export JSON'),
                React.createElement('button', { onClick: () => exportService.toCSV(filteredVideos), className: 'w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10' }, 'Export CSV')
              )
            ),
            React.createElement('button', { onClick: toggleTheme, className: 'p-2 rounded-lg transition ' + cardBg + ' ' + textSecondary + ' hover:text-cyan-400' },
              theme === 'dark' ? React.createElement(Sun, { className: 'w-5 h-5' }) : React.createElement(Moon, { className: 'w-5 h-5' })
            ),
            React.createElement('span', { className: textSecondary + ' text-sm font-medium' }, filteredVideos.length + ' videos')
          )
        ),
        React.createElement('div', { className: 'flex gap-3 flex-wrap items-start' },
          React.createElement('div', { className: 'relative flex-1 min-w-[200px]' },
            React.createElement(Hash, { className: 'absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ' + textSecondary }),
            React.createElement('input', {
              type: 'text',
              placeholder: 'Filter by topic (e.g., gaming, cooking...)',
              value: topic,
              onChange: (e) => setTopic(e.target.value),
              className: 'w-full rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:border-cyan-400/50 placeholder-gray-500 ' + inputBg + ' ' + textPrimary
            }),
            topic && React.createElement('button', {
              onClick: () => setTopic(''),
              className: 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white'
            }, React.createElement(X, { className: 'w-4 h-4' }))
          ),
          React.createElement('div', { className: 'flex flex-wrap gap-1.5 items-center' },
            ...POPULAR_TOPICS.map(t =>
              React.createElement('button', {
                key: t,
                onClick: () => setTopic(t),
                className: 'px-2.5 py-1 text-xs rounded-full transition font-medium ' + (topic === t ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/30' : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white')
              }, t)
            )
          )
        ),
        React.createElement('div', { className: 'flex gap-3 flex-wrap mt-3' },
          React.createElement('div', { className: 'flex-1 min-w-[200px] relative' },
            React.createElement(Search, { className: 'absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ' + textSecondary }),
            React.createElement('input', {
              type: 'text', placeholder: 'Search videos, authors, hooks...',
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              className: 'w-full rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:border-cyan-400/50 placeholder-gray-500 ' + inputBg + ' ' + textPrimary
            }),
            searchQuery && React.createElement('button', {
              onClick: () => setSearchQuery(''),
              className: 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white'
            }, React.createElement(X, { className: 'w-4 h-4' }))
          ),
          // Country dropdown
          React.createElement('div', { className: 'relative' },
            React.createElement(Globe, { className: 'absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' }),
            React.createElement('select', {
              value: regionCode,
              onChange: (e) => setRegionCode(e.target.value),
              className: 'w-28 pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl focus:outline-none focus:border-cyan-400/50 appearance-none ' + inputBg + ' ' + textPrimary
            }, COUNTRIES.map(c => React.createElement('option', { key: c.code, value: c.code }, c.code)))
          ),
          ...TIME_FILTERS.map(tf =>
            React.createElement('button', {
              key: tf.value,
              onClick: () => setTimeFilter(tf.value),
              className: 'px-3 py-2 text-xs rounded-lg transition whitespace-nowrap font-medium ' + (timeFilter === tf.value ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/30' : cardBg + ' border ' + cardBorder + ' ' + textSecondary + ' hover:text-white')
            }, tf.label)
          ),
          React.createElement('button', {
            onClick: () => setLongVideosOnly(!longVideosOnly),
            className: 'px-3 py-2 text-xs rounded-lg transition flex items-center gap-1.5 font-medium ' + (longVideosOnly ? 'bg-purple-500/20 text-purple-400 border border-purple-400/30' : cardBg + ' border ' + cardBorder + ' ' + textSecondary + ' hover:text-white')
          }, React.createElement(Video, { className: 'w-3.5 h-3.5' }), 'Long only'),
          React.createElement('button', {
            onClick: () => setShowFilters(!showFilters),
            className: 'px-3 py-2 rounded-lg border transition flex items-center gap-2 text-sm font-medium ' + (showFilters ? 'bg-cyan-500/20 border-cyan-400/30 text-cyan-400' : cardBg + ' ' + cardBorder + ' ' + textSecondary + ' hover:text-white')
          }, React.createElement(Filter, { className: 'w-4 h-4' }), ' Filters')
        ),
        showFilters && React.createElement('div', { className: 'mt-3 p-4 rounded-xl border ' + cardBg + ' ' + cardBorder },
          React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-4' },
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-xs mb-1 font-medium ' + textSecondary }, 'Sort By'),
              React.createElement('select', {
                value: sortBy,
                onChange: (e) => setSortBy(e.target.value),
                className: 'w-full rounded-lg px-3 py-2 text-sm font-medium ' + inputBg + ' ' + textPrimary
              }, SORT_OPTIONS.map(opt => React.createElement('option', { key: opt.value, value: opt.value }, opt.label)))
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-xs mb-1 font-medium ' + textSecondary }, 'Min Growth: ' + minGrowth + '%'),
              React.createElement('input', { type: 'range', min: 0, max: 500, step: 10, value: minGrowth,
                onChange: (e) => setMinGrowth(Number(e.target.value)),
                className: 'w-full accent-cyan-400' })
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-xs mb-1 font-medium ' + textSecondary }, 'Min Score: ' + minViralScore),
              React.createElement('input', { type: 'range', min: 0, max: 100, step: 5, value: minViralScore,
                onChange: (e) => setMinViralScore(Number(e.target.value)),
                className: 'w-full accent-pink-400' })
            )
          ),
          React.createElement('button', {
            onClick: () => { setMinGrowth(0); setMinViralScore(0); setSearchQuery(''); setTimeFilter('all'); setTopic(''); },
            className: 'mt-3 text-sm text-gray-400 hover:text-white transition flex items-center gap-1 font-medium'
          }, React.createElement(X, { className: 'w-3 h-3' }), ' Reset all')
        )
      )
    ),
    React.createElement('div', { className: 'max-w-7xl mx-auto px-4 py-8' },
      React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8' },
        ['tiktok', 'instagram', 'youtube'].map(platform => {
          const pData = typedData[platform];
          const growth = liveEnabled && platform === 'youtube' && youtubeData.isLiveData 
            ? Math.floor(Math.random() * 40) + 20 : (pData ? pData.totalGrowth : 0);
          return React.createElement('button', {
            key: platform,
            onClick: () => setActivePlatform(platform === activePlatform ? 'all' : platform),
            className: 'backdrop-blur-sm rounded-xl p-5 border transition-all cursor-pointer text-left ' + (activePlatform === platform ? 'border-cyan-400/50 bg-cyan-500/10 scale-[1.02]' : cardBorder + ' hover:border-white/20') + ' ' + cardBg
          },
            React.createElement('div', { className: 'flex items-center justify-between' },
              React.createElement('div', null,
                React.createElement('h3', { className: 'text-lg font-semibold capitalize flex items-center gap-2 ' + textPrimary },
                  (platform === 'tiktok' ? '\uD83C\uDFB5' : platform === 'instagram' ? '\uD83D\uDCF8' : '\uD83C\uDFAC'), ' ', platform
                ),
                React.createElement('p', { className: 'text-3xl font-bold text-cyan-400 mt-1' }, '+' + growth + '%'),
                React.createElement('p', { className: 'text-sm ' + textSecondary }, 'growth in last hour')
              ),
              React.createElement('div', { className: 'p-3 rounded-xl ' + (growth > 40 ? 'bg-green-500/20' : 'bg-yellow-500/20') },
                React.createElement(TrendingUp, { className: 'w-6 h-6 ' + (growth > 40 ? 'text-green-400' : 'text-yellow-400') })
              )
            )
          );
        })
      ),
      !youtubeData.isConfigured && liveEnabled && React.createElement('div', { className: 'mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4' },
        React.createElement('div', { className: 'flex items-start gap-3' },
          React.createElement(AlertCircle, { className: 'w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0' }),
          React.createElement('div', null,
            React.createElement('p', { className: 'text-yellow-400 font-medium text-sm' }, 'YouTube API key not configured'),
            React.createElement('p', { className: 'text-gray-400 text-xs mt-1' }, 'Add to .env: VITE_YOUTUBE_API_KEY=your_key')
          )
        )
      ),
      error && React.createElement('div', { className: 'mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4' },
        React.createElement('div', { className: 'flex items-start gap-3' },
          React.createElement(AlertCircle, { className: 'w-5 h-5 text-red-400 mt-0.5 flex-shrink-0' }),
          React.createElement('p', { className: 'text-red-400 font-medium text-sm' }, error)
        )
      ),
      filteredVideos.length === 0
        ? React.createElement('div', { className: 'text-center py-20' },
            React.createElement(Search, { className: 'w-16 h-16 mx-auto mb-4 text-gray-600' }),
            React.createElement('p', { className: 'text-xl font-medium ' + textSecondary }, 'No videos found'),
            React.createElement('button', {
              onClick: () => { setMinGrowth(0); setMinViralScore(0); setSearchQuery(''); setTimeFilter('all'); setShowBookmarkedOnly(false); setTopic(''); setLongVideosOnly(false); },
              className: 'mt-4 px-6 py-3 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition font-medium'
            }, 'Reset All Filters')
          )
        : React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' },
            filteredVideos.map(video =>
              React.createElement('div', {
                key: video.id,
                onClick: () => setSelectedVideo(video),
                className: 'backdrop-blur-sm rounded-2xl border overflow-hidden hover:border-cyan-400/30 hover:bg-white/10 transition-all group cursor-pointer ' + cardBg + ' ' + cardBorder
              },
                React.createElement('div', { className: 'relative aspect-[16/10] bg-gray-800 overflow-hidden' },
                  video.thumbnail
                    ? React.createElement('img', { src: video.thumbnail, alt: video.title, className: 'w-full h-full object-cover', loading: 'lazy',
                        onError: (e) => { e.target.src = 'https://picsum.photos/seed/' + video.id + '/600/375'; } })
                    : React.createElement('div', { className: 'w-full h-full flex items-center justify-center text-gray-500 text-sm' }, 'No thumbnail'),
                  React.createElement('div', { className: 'absolute top-3 left-3 z-10' },
                    React.createElement('span', { className: 'text-xs font-semibold px-2.5 py-1 rounded-full ' + (video.platform === 'tiktok' ? 'bg-gray-900/90 text-white' : video.platform === 'instagram' ? 'bg-pink-600/90 text-white' : 'bg-red-600/90 text-white') },
                      (video.platform === 'tiktok' ? '\uD83C\uDFB5' : video.platform === 'instagram' ? '\uD83D\uDCF8' : '\uD83C\uDFAC') + ' ' + video.platform
                    )
                  ),
                  React.createElement('div', { className: 'absolute top-3 right-3 z-10' },
                    React.createElement('button', {
                      onClick: (e) => { e.stopPropagation(); toggleBookmark(video.id); },
                      className: 'p-1.5 rounded-full transition ' + (bookmarkedIds.has(video.id) ? 'bg-yellow-500/30 text-yellow-400' : 'bg-black/40 text-gray-400 hover:text-yellow-400')
                    }, bookmarkedIds.has(video.id) ? React.createElement(BookmarkCheck, { className: 'w-4 h-4' }) : React.createElement(Bookmark, { className: 'w-4 h-4' }))
                  ),
                  React.createElement('div', { className: 'absolute bottom-3 left-3 z-10' },
                    React.createElement('span', { className: 'text-sm bg-black/60 px-2 py-0.5 rounded text-gray-300 font-medium' }, formatDuration(video.duration))
                  ),
                  video.videoUrl && React.createElement('button', {
                    onClick: (e) => { e.stopPropagation(); openVideoUrl(video.videoUrl); },
                    className: 'absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-white/90 hover:bg-white text-gray-900 px-3 py-1.5 rounded-lg text-sm font-semibold transition'
                  }, React.createElement(ExternalLink, { className: 'w-4 h-4' }), 'Open'),
                  // Open Channel button
                  video.channelId && React.createElement('button', {
                    onClick: (e) => { e.stopPropagation(); openChannelUrl(video.channelId); },
                    className: 'absolute bottom-12 right-3 z-10 flex items-center gap-1 bg-black/60 hover:bg-black/80 text-white px-2 py-1 rounded text-xs transition'
                  }, React.createElement(Globe, { className: 'w-3.5 h-3.5' }), 'Channel'),
                  React.createElement('div', { className: 'absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent' })
                ),
                React.createElement('div', { className: 'p-5' },
                  React.createElement('h3', { className: 'font-semibold text-base line-clamp-2 mb-3 group-hover:text-cyan-300 transition ' + textPrimary }, video.title),
                  React.createElement('div', { className: 'flex items-center gap-4 text-sm mb-3 ' + textSecondary },
                    React.createElement('span', { className: 'flex items-center gap-1.5 font-medium' }, React.createElement(Eye, { className: 'w-4 h-4' }), formatNumber(video.views)),
                    React.createElement('span', { className: 'flex items-center gap-1.5 font-medium' }, React.createElement(Heart, { className: 'w-4 h-4' }), formatNumber(video.likes)),
                    React.createElement('span', { className: 'flex items-center gap-1.5 ml-auto font-medium' },
                      React.createElement(TrendingUp, { className: 'w-4 h-4 ' + getGrowthColor(video.viewsGrowth) }),
                      React.createElement('span', { className: getGrowthColor(video.viewsGrowth) }, '+' + video.viewsGrowth + '%')
                    )
                  ),
                  React.createElement('div', { className: 'flex items-center gap-2 mb-3' },
                    React.createElement(Zap, { className: 'w-4 h-4 text-yellow-400' }),
                    React.createElement('span', { className: 'text-sm font-bold text-yellow-400' }, video.viralScore),
                    React.createElement('span', { className: 'text-sm ml-auto flex items-center gap-1.5 font-medium ' + textSecondary },
                      React.createElement(Clock, { className: 'w-4 h-4' }), getTimeAgo(video.postedAt)
                    )
                  ),
                  video.hook && React.createElement('div', { className: 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3' },
                    React.createElement('p', { className: 'text-yellow-200/90 text-sm italic line-clamp-1' }, '"' + video.hook + '"')
                  ),
                  React.createElement('div', { className: 'flex flex-wrap gap-2' },
                    (video.hashtags || []).slice(0, 4).map(tag =>
                      React.createElement('span', { key: tag, className: 'text-sm text-cyan-400/80 bg-cyan-400/5 px-3 py-0.5 rounded-full font-medium' }, '#' + tag)
                    ),
                    (video.hashtags || []).length > 4 && React.createElement('span', { className: 'text-sm text-gray-400 bg-white/5 px-2 py-0.5 rounded-full font-medium' }, '+' + ((video.hashtags || []).length - 4))
                  ),
                  React.createElement('div', { className: 'flex items-center justify-between mt-4 pt-4 border-t ' + cardBorder },
                    React.createElement('p', { className: 'text-sm font-medium truncate max-w-[60%] ' + textSecondary }, video.author)
                  )
                )
              )
            )
          ),
      typedData.tiktok?.patterns && React.createElement('div', { className: 'mt-16' },
        React.createElement('h2', { className: 'text-3xl font-bold mb-8 ' + textPrimary }, '\uD83D\uDCCA Trending Patterns'),
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-6' },
          React.createElement('div', { className: 'backdrop-blur-sm rounded-xl p-6 border ' + cardBg + ' ' + cardBorder },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4 flex items-center gap-2 ' + textPrimary },
              React.createElement(Zap, { className: 'w-5 h-5 text-yellow-400' }), ' Hook Patterns'
            ),
            React.createElement('div', { className: 'space-y-3' },
              typedData.tiktok.patterns.hookTypes?.map((hook, i) =>
                React.createElement('div', { key: i, className: 'flex items-center justify-between p-2 rounded-lg hover:bg-white/5' },
                  React.createElement('span', { className: 'text-sm font-medium ' + textSecondary }, hook.pattern),
                  React.createElement('span', { className: 'text-sm font-bold text-cyan-400' }, hook.frequency + '%')
                )
              )
            )
          ),
          React.createElement('div', { className: 'backdrop-blur-sm rounded-xl p-6 border ' + cardBg + ' ' + cardBorder },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4 flex items-center gap-2 ' + textPrimary }, '\u2712\uFE0F Caption Lengths'),
            React.createElement('div', { className: 'space-y-3' },
              typedData.tiktok.patterns.captionLengths?.map((cap, i) =>
                React.createElement('div', { key: i, className: 'flex items-center justify-between p-2 rounded-lg hover:bg-white/5' },
                  React.createElement('span', { className: 'text-sm font-medium ' + textSecondary }, cap.range),
                  React.createElement('span', { className: 'text-sm font-bold text-pink-400' }, cap.count)
                )
              )
            )
          ),
          React.createElement('div', { className: 'backdrop-blur-sm rounded-xl p-6 border ' + cardBg + ' ' + cardBorder },
            React.createElement('h3', { className: 'text-lg font-semibold mb-4 flex items-center gap-2 ' + textPrimary }, '\uD83C\uDFF7\uFE0F Top Hashtags'),
            React.createElement('div', { className: 'space-y-3' },
              typedData.tiktok.patterns.topHashtags?.map((tag, i) =>
                React.createElement('div', { key: i, className: 'flex items-center justify-between p-2 rounded-lg hover:bg-white/5' },
                  React.createElement('span', { className: 'text-sm text-cyan-400 font-medium' }, tag.tag),
                  React.createElement('span', { className: 'text-sm font-bold ' + textSecondary }, tag.count)
                )
              )
            )
          )
        )
      )
    ),

    selectedVideo && React.createElement(VideoModal, {
      video: selectedVideo,
      isBookmarked: bookmarkedIds.has(selectedVideo.id),
      onClose: () => setSelectedVideo(null),
      onBookmark: toggleBookmark,
      onOpenOriginal: openVideoUrl
    })
  );
}

export default TrendDashboard;
