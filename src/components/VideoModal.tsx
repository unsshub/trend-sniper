import { X, ExternalLink, Heart, Share2, MessageCircle, Eye, Clock, Bookmark, BookmarkCheck } from 'lucide-react';
import type { TrendingVideo } from '../types';

interface VideoModalProps {
  video: TrendingVideo | null;
  isBookmarked: boolean;
  onClose: () => void;
  onBookmark: (videoId: string) => void;
  onOpenOriginal: (url: string) => void;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function VideoModal({ video, isBookmarked, onClose, onBookmark, onOpenOriginal }: VideoModalProps) {
  if (!video) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Thumbnail Header */}
        <div className="relative aspect-video bg-gray-800 rounded-t-2xl overflow-hidden">
          {video.thumbnail ? (
            <img 
              src={video.thumbnail} 
              alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              No thumbnail available
            </div>
          )}
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Platform badge */}
          <div className="absolute top-3 left-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              video.platform === 'tiktok' ? 'bg-gray-900/90 text-white' :
              video.platform === 'instagram' ? 'bg-pink-600/90 text-white' :
              'bg-red-600/90 text-white'
            }`}>
              {video.platform}
            </span>
          </div>

          {/* Open original button */}
          {video.videoUrl && (
            <button
              onClick={() => onOpenOriginal(video.videoUrl!)}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 hover:bg-white text-gray-900 px-3 py-2 rounded-lg text-sm font-medium transition"
            >
              <ExternalLink className="w-4 h-4" />
              Open in {video.platform}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Title & Bookmark */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-white flex-1">{video.title}</h2>
            <button
              onClick={() => onBookmark(video.id)}
              className={`flex-shrink-0 p-2 rounded-lg transition ${
                isBookmarked ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-gray-400 hover:text-yellow-400'
              }`}
            >
              {isBookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
            </button>
          </div>

          {/* Author & Date */}
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-4">
            <span className="font-medium text-gray-300">{video.author}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDate(video.postedAt)}
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <Eye className="w-4 h-4 text-gray-400 mx-auto mb-1" />
              <p className="text-white font-bold text-sm">{formatNumber(video.views)}</p>
              <p className="text-gray-500 text-xs">Views</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <Heart className="w-4 h-4 text-pink-400 mx-auto mb-1" />
              <p className="text-white font-bold text-sm">{formatNumber(video.likes)}</p>
              <p className="text-gray-500 text-xs">Likes</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <Share2 className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
              <p className="text-white font-bold text-sm">{formatNumber(video.shares)}</p>
              <p className="text-gray-500 text-xs">Shares</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <MessageCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-white font-bold text-sm">{formatNumber(video.comments)}</p>
              <p className="text-gray-500 text-xs">Comments</p>
            </div>
          </div>

          {/* Hook */}
          {video.hook && (
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
              <h3 className="text-yellow-400 font-semibold text-sm mb-2">🔥 Viral Hook</h3>
              <p className="text-yellow-200/90 text-sm italic">"{video.hook}"</p>
            </div>
          )}

          {/* Caption */}
          {video.caption && (
            <div className="mb-4">
              <h3 className="text-gray-400 font-semibold text-sm mb-2">📝 Caption</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{video.caption}</p>
            </div>
          )}

          {/* Hashtags */}
          {video.hashtags && video.hashtags.length > 0 && (
            <div>
              <h3 className="text-gray-400 font-semibold text-sm mb-2">🏷️ Hashtags</h3>
              <div className="flex flex-wrap gap-2">
                {video.hashtags.map(tag => (
                  <span key={tag} className="text-sm text-cyan-400/80 bg-cyan-400/5 px-3 py-1 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoModal;
