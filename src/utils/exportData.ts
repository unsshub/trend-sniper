import type { TrendingVideo } from '../types';

// Export service - generates downloadable files
export const exportService = {
  toJSON(videos: TrendingVideo[]): void {
    const data = JSON.stringify(videos, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    this.download(blob, `trend-sniper-export-${Date.now()}.json`);
  },

  toCSV(videos: TrendingVideo[]): void {
    const headers = ['Title', 'Platform', 'Author', 'Views', 'Growth %', 'Likes', 'Shares', 'Viral Score', 'Posted At', 'URL'];
    
    const rows = videos.map(v => [
      `"${(v.title || '').replace(/"/g, '""')}"`,
      v.platform,
      `"${(v.author || '').replace(/"/g, '""')}"`,
      v.views,
      v.viewsGrowth,
      v.likes,
      v.shares,
      v.viralScore,
      new Date(v.postedAt).toLocaleString(),
      v.videoUrl || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.download(blob, `trend-sniper-export-${Date.now()}.csv`);
  },

  download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
