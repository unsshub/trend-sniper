// Bookmark service using localStorage
const BOOKMARKS_KEY = 'trend-sniper-bookmarks';

export interface BookmarkedVideo {
  id: string;
  bookmarkedAt: string;
}

export const bookmarkService = {
  getAll(): BookmarkedVideo[] {
    try {
      const data = localStorage.getItem(BOOKMARKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  isBookmarked(videoId: string): boolean {
    const bookmarks = this.getAll();
    return bookmarks.some(b => b.id === videoId);
  },

  toggle(videoId: string): boolean {
    const bookmarks = this.getAll();
    const index = bookmarks.findIndex(b => b.id === videoId);
    
    if (index >= 0) {
      bookmarks.splice(index, 1);
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      return false; // Unbookmarked
    } else {
      bookmarks.push({
        id: videoId,
        bookmarkedAt: new Date().toISOString(),
      });
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      return true; // Bookmarked
    }
  },

  toggleMultiple(videoIds: string[]): void {
    videoIds.forEach(id => this.toggle(id));
  },

  clear(): void {
    localStorage.removeItem(BOOKMARKS_KEY);
  },
};
