/**
 * RESEARCH & INTELLIGENCE — Department 3
 * Feeds the content and sales departments with trending data.
 *
 * Agent: Ivy
 */

import { logEntry } from "../memory/wal-logger";
import { remember, recall } from "../memory/elms-layers";

export interface TrendReport {
  date: string;
  platform: string;
  trends: TrendItem[];
  competitorInsights?: string[];
}

export interface TrendItem {
  topic: string;
  platform: string;
  score: number; // 1-10 relevance score
  source: string;
  angle: string; // suggested content angle
}

export interface CompetitorIntel {
  competitor: string;
  platform: string;
  observation: string;
  opportunity: string;
  date: string;
}

/** Platforms Ivy monitors for trends */
export const MONITORED_PLATFORMS = [
  { name: "YouTube", searchTerms: ["make money online", "online business", "passive income", "legacy builders"] },
  { name: "TikTok", searchTerms: ["side hustle", "make money online", "affiliate marketing", "tiktok shop"] },
  { name: "X", searchTerms: ["online income", "digital products", "solopreneur", "passive income"] },
  { name: "Reddit", searchTerms: ["r/Entrepreneur", "r/sidehustle", "r/passive_income", "r/affiliate_marketing"] },
];

/** Legacy Builders Program competitors to watch */
export const COMPETITORS = [
  "Legendary Marketer",
  "Between the Bookends",
  "Authority Hacker",
  "Income School",
];

/** Store trend research results in ELMS */
export function storeTrendReport(report: TrendReport) {
  const key = `trends_${report.platform}_${report.date}`;
  remember("episodic", "ivy", key, JSON.stringify(report), ["trends", report.platform], 48);
  logEntry("ivy", "research", "store_trends", "completed", {
    output: { platform: report.platform, trendCount: report.trends.length },
  });
}

/** Get latest trends for content agents */
export function getLatestTrends(platform?: string): TrendItem[] {
  const memories = recall({
    agent: "ivy",
    tags: ["trends"],
    limit: 10,
  });

  const allTrends: TrendItem[] = [];
  for (const mem of memories) {
    try {
      const report: TrendReport = JSON.parse(mem.value);
      if (!platform || report.platform === platform) {
        allTrends.push(...report.trends);
      }
    } catch {
      // skip malformed entries
    }
  }

  return allTrends.sort((a, b) => b.score - a.score);
}

/** Store competitor intelligence */
export function storeCompetitorIntel(intel: CompetitorIntel) {
  const key = `competitor_${intel.competitor}_${intel.date}`;
  remember("learned", "ivy", key, JSON.stringify(intel), ["competitor", intel.competitor]);
}
