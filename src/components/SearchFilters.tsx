import { useState } from 'react';
import { Search, Filter, SlidersHorizontal, X, TrendingUp, Clock, Eye, Heart, Activity, Timer } from 'lucide-react';
import type { SortBy, TimeFrame } from '../types';

interface SearchFiltersProps {
  onSearch: (query: string) => void;
  onSortChange: (sort: SortBy) => void;
  onTimeFrameChange: (time: TimeFrame) => void;
  onCategoryChange: (category: string) => void;
  currentSort: SortBy;
  currentTimeFrame: TimeFrame;
  currentCategory: string;
  categories: string[];
}

function SearchFilters({ 
  onSearch, 
  onSortChange, 
  onTimeFrameChange, 
  onCategoryChange, 
  currentSort, 
  currentTimeFrame, 
  currentCategory,
  categories 
}: SearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sortOptions: { value: SortBy; label: string; icon: React.ReactNode }[] = [
    { value: 'viralScore', label: 'Viral Score', icon: <TrendingUp className="w-4 h-4" /> },
    { value: 'viewsGrowth', label: 'Growth Rate', icon: <Activity className="w-4 h-4" /> },
    { value: 'views', label: 'Total Views', icon: <Eye className="w-4 h-4" /> },
    { value: 'likes', label: 'Likes', icon: <Heart className="w-4 h-4" /> },
    { value: 'engagementRate', label: 'Engagement', icon: <Timer className="w-4 h-4" /> },
    { value: 'watchTimeSeconds', label: 'Watch Time', icon: <Clock className="w-4 h-4" /> },
  ];

  const timeFrames: { value: TimeFrame; label: string }[] = [
    { value: '1h', label: 'Last Hour' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last Week' },
  ];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search trending content..."
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white 
            placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 transition-all"
        />
        {searchQuery && (
          <button 
            onClick={() => { setSearchQuery(''); onSearch(''); }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg 
            text-gray-300 hover:text-white hover:border-cyan-400/30 transition-all"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          <SlidersHorizontal className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* Active Filters Count */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {currentSort !== 'viralScore' && (
            <span className="px-2 py-1 bg-cyan-400/10 border border-cyan-400/20 rounded-full text-cyan-400">
              Sort: {sortOptions.find(o => o.value === currentSort)?.label}
            </span>
          )}
          {currentTimeFrame !== '1h' && (
            <span className="px-2 py-1 bg-purple-400/10 border border-purple-400/20 rounded-full text-purple-400">
              {timeFrames.find(t => t.value === currentTimeFrame)?.label}
            </span>
          )}
          {currentCategory !== 'all' && (
            <span className="px-2 py-1 bg-pink-400/10 border border-pink-400/20 rounded-full text-pink-400">
              {currentCategory}
            </span>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6 animate-fadeIn">
          {/* Sort Options */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Sort By</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {sortOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => onSortChange(option.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                    ${currentSort === option.value 
                      ? 'bg-cyan-400/20 border border-cyan-400/30 text-cyan-300' 
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'}`}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Frame */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Time Frame</h4>
            <div className="flex gap-2 flex-wrap">
              {timeFrames.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => onTimeFrameChange(tf.value)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all
                    ${currentTimeFrame === tf.value 
                      ? 'bg-purple-400/20 border border-purple-400/30 text-purple-300' 
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'}`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Categories</h4>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onCategoryChange('all')}
                className={`px-4 py-2 rounded-lg text-sm transition-all
                  ${currentCategory === 'all' 
                    ? 'bg-pink-400/20 border border-pink-400/30 text-pink-300' 
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'}`}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  className={`px-4 py-2 rounded-lg text-sm capitalize transition-all
                    ${currentCategory === category 
                      ? 'bg-pink-400/20 border border-pink-400/30 text-pink-300' 
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchFilters;
