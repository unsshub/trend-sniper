import { ScraperConfig, ScraperResult } from './types';
import { tiktokScraper } from './scrapers/tiktokScraper';
import { instagramScraper } from './scrapers/instagramScraper';
import { youtubeScraper } from './scrapers/youtubeScraper';
import { useState, useEffect, useCallback } from 'react';

// Scraper Manager - handles all platform scraping
class ScraperManager {
  private scrapers = {
    tiktok: tiktokScraper,
    instagram: instagramScraper,
    youtube: youtubeScraper
  };

  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private results: Map<string, ScraperResult> = new Map();

  async scrapeAll(config: ScraperConfig): Promise<Map<string, ScraperResult>> {
    const results = new Map<string, ScraperResult>();
    
    for (const [platform, scraper] of Object.entries(this.scrapers)) {
      const platformConfig = { ...config, platform: platform as any };
      const result = await scraper.scrape(platformConfig);
      results.set(platform, result);
      this.results.set(platform, result);
    }
    
    return results;
  }

  startContinuousScraping(config: ScraperConfig) {
    this.stopContinuousScraping();
    
    for (const [platform, scraper] of Object.entries(this.scrapers)) {
      const interval = setInterval(async () => {
        const platformConfig = { ...config, platform: platform as any };
        const result = await scraper.scrape(platformConfig);
        this.results.set(platform, result);
        this.onResult?.(result);
      }, config.interval);
      
      this.intervals.set(platform, interval);
    }
  }

  stopContinuousScraping() {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
  }

  getLatestResults(): Map<string, ScraperResult> {
    return this.results;
  }

  onResult?: (result: ScraperResult) => void;
}

export const scraperManager = new ScraperManager();

// React hook for using the scraper
export function useScraper() {
  const [results, setResults] = useState<Map<string, ScraperResult>>(new Map());
  const [isScraping, setIsScraping] = useState(false);

  const startScraping = useCallback(async (config: ScraperConfig) => {
    setIsScraping(true);
    scraperManager.onResult = (result) => {
      setResults(prev => new Map(prev).set(result.platform, result));
    };
    
    scraperManager.startContinuousScraping(config);
  }, []);

  const stopScraping = useCallback(() => {
    scraperManager.stopContinuousScraping();
    setIsScraping(false);
  }, []);

  const scrapeOnce = useCallback(async (config: ScraperConfig) => {
    setIsScraping(true);
    const newResults = await scraperManager.scrapeAll(config);
    setResults(newResults);
    setIsScraping(false);
    return newResults;
  }, []);

  useEffect(() => {
    return () => {
      scraperManager.stopContinuousScraping();
    };
  }, []);

  return { results, isScraping, startScraping, stopScraping, scrapeOnce };
}
