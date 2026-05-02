// Theme service using localStorage and CSS classes
const THEME_KEY = 'trend-sniper-theme';

export type Theme = 'dark' | 'light';

export const themeService = {
  get(): Theme {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {}
    
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  },

  set(theme: Theme): void {
    localStorage.setItem(THEME_KEY, theme);
    this.apply(theme);
  },

  toggle(): Theme {
    const current = this.get();
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    this.set(next);
    return next;
  },

  apply(theme: Theme): void {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  },

  init(): Theme {
    const theme = this.get();
    this.apply(theme);
    return theme;
  },
};
