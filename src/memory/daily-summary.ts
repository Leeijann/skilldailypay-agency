/**
 * Daily Summary Generator
 * Jake uses this at 9 PM to compile the day's activity into a report for Ricardo.
 */

import { readTodayLog, getAgentStats, WALEntry } from "./wal-logger";
import { recall } from "./elms-layers";

export interface DailySummary {
  date: string;
  totalTasks: number;
  completed: number;
  failed: number;
  agentBreakdown: Record<string, { completed: number; failed: number; tokens: number }>;
  contentProduced: ContentItem[];
  revenue?: RevenueSnapshot;
  issues: string[];
  highlights: string[];
}

interface ContentItem {
  type: string;
  platform: string;
  title: string;
  agent: string;
  status: string;
}

interface RevenueSnapshot {
  totalToday: number;
  sources: Record<string, number>;
}

const AGENTS = ["jake", "nexus", "leeijann", "ivy", "social", "sales", "finance", "nox", "silix"];

export function generateDailySummary(): DailySummary {
  const entries = readTodayLog();
  const date = new Date().toISOString().split("T")[0];

  // Agent breakdown
  const agentBreakdown: DailySummary["agentBreakdown"] = {};
  for (const agent of AGENTS) {
    const stats = getAgentStats(agent, entries);
    if (stats.total > 0) {
      agentBreakdown[agent] = {
        completed: stats.completed,
        failed: stats.failed,
        tokens: stats.totalTokens,
      };
    }
  }

  // Content produced
  const contentEntries = entries.filter(
    (e) =>
      e.status === "completed" &&
      ["content", "research"].includes(e.department)
  );
  const contentProduced: ContentItem[] = contentEntries.map((e) => ({
    type: e.action,
    platform: (e.output?.platform as string) || "unknown",
    title: (e.output?.title as string) || e.action,
    agent: e.agent,
    status: e.status,
  }));

  // Issues — any failed tasks
  const issues = entries
    .filter((e) => e.status === "failed")
    .map((e) => `[${e.agent}] ${e.action}: ${e.error || "unknown error"}`);

  // Highlights — notable completions
  const highlights = entries
    .filter((e) => e.status === "completed" && e.department !== "command")
    .slice(0, 5)
    .map((e) => `${e.agent} completed ${e.action}`);

  return {
    date,
    totalTasks: entries.length,
    completed: entries.filter((e) => e.status === "completed").length,
    failed: entries.filter((e) => e.status === "failed").length,
    agentBreakdown,
    contentProduced,
    issues,
    highlights,
  };
}

export function formatSummaryForTelegram(summary: DailySummary): string {
  let msg = `📊 *Daily Report — ${summary.date}*\n\n`;
  msg += `✅ Completed: ${summary.completed}/${summary.totalTasks}\n`;
  msg += `❌ Failed: ${summary.failed}\n\n`;

  if (Object.keys(summary.agentBreakdown).length > 0) {
    msg += `*Agent Activity:*\n`;
    for (const [agent, stats] of Object.entries(summary.agentBreakdown)) {
      msg += `  • ${agent}: ${stats.completed} done, ${stats.failed} failed\n`;
    }
    msg += "\n";
  }

  if (summary.contentProduced.length > 0) {
    msg += `*Content Produced:*\n`;
    for (const item of summary.contentProduced) {
      msg += `  • [${item.platform}] ${item.title}\n`;
    }
    msg += "\n";
  }

  if (summary.issues.length > 0) {
    msg += `*Issues:*\n`;
    for (const issue of summary.issues) {
      msg += `  ⚠️ ${issue}\n`;
    }
    msg += "\n";
  }

  if (summary.highlights.length > 0) {
    msg += `*Highlights:*\n`;
    for (const h of summary.highlights) {
      msg += `  🌟 ${h}\n`;
    }
  }

  return msg;
}
