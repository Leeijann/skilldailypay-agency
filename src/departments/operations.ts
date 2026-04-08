/**
 * FINANCE & OPERATIONS — Department 5
 * Tracks money and system health.
 *
 * Agents: Finance, Nox, Silix
 */

import { logEntry } from "../memory/wal-logger";
import { remember, recall } from "../memory/elms-layers";
import fs from "fs";
import path from "path";

export interface RevenueEntry {
  date: string;
  source: string;
  amount: number;
  currency: string;
  notes?: string;
}

export interface ExpenseEntry {
  date: string;
  category: string;
  amount: number;
  currency: string;
  description: string;
}

export interface HealthCheck {
  timestamp: string;
  service: string;
  status: "healthy" | "degraded" | "down";
  latencyMs?: number;
  details?: string;
}

const DATA_DIR = path.resolve(__dirname, "../../data/finance");

function ensureFinanceDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** Log a revenue entry */
export function logRevenue(entry: RevenueEntry) {
  ensureFinanceDir();
  const file = path.join(DATA_DIR, `revenue-${entry.date.slice(0, 7)}.jsonl`);
  fs.appendFileSync(file, JSON.stringify(entry) + "\n", "utf-8");
  logEntry("finance", "operations", "revenue_log", "completed", {
    output: { source: entry.source, amount: entry.amount },
  });
}

/** Log an expense entry */
export function logExpense(entry: ExpenseEntry) {
  ensureFinanceDir();
  const file = path.join(DATA_DIR, `expenses-${entry.date.slice(0, 7)}.jsonl`);
  fs.appendFileSync(file, JSON.stringify(entry) + "\n", "utf-8");
  logEntry("finance", "operations", "expense_log", "completed", {
    output: { category: entry.category, amount: entry.amount },
  });
}

/** Get daily P&L */
export function getDailyPnl(date: string): { revenue: number; expenses: number; net: number } {
  ensureFinanceDir();
  const month = date.slice(0, 7);

  let revenue = 0;
  const revFile = path.join(DATA_DIR, `revenue-${month}.jsonl`);
  if (fs.existsSync(revFile)) {
    const lines = fs.readFileSync(revFile, "utf-8").trim().split("\n").filter(Boolean);
    for (const line of lines) {
      const entry: RevenueEntry = JSON.parse(line);
      if (entry.date === date) revenue += entry.amount;
    }
  }

  let expenses = 0;
  const expFile = path.join(DATA_DIR, `expenses-${month}.jsonl`);
  if (fs.existsSync(expFile)) {
    const lines = fs.readFileSync(expFile, "utf-8").trim().split("\n").filter(Boolean);
    for (const line of lines) {
      const entry: ExpenseEntry = JSON.parse(line);
      if (entry.date === date) expenses += entry.amount;
    }
  }

  return { revenue, expenses, net: revenue - expenses };
}

/** Services to monitor */
export const MONITORED_SERVICES = [
  { name: "Claude API", endpoint: "https://api.anthropic.com", critical: true },
  { name: "n8n", endpoint: "http://localhost:5678/healthz", critical: true },
  { name: "Telegram Bot", endpoint: "https://api.telegram.org", critical: false },
  { name: "skilldailypay.com", endpoint: "https://skilldailypay.com", critical: true },
];

/** Run a basic health check on a URL */
export async function checkHealth(service: { name: string; endpoint: string }): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const response = await fetch(service.endpoint, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000),
    });
    return {
      timestamp: new Date().toISOString(),
      service: service.name,
      status: response.ok ? "healthy" : "degraded",
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      timestamp: new Date().toISOString(),
      service: service.name,
      status: "down",
      latencyMs: Date.now() - start,
      details: err.message,
    };
  }
}

/** Run health checks on all monitored services */
export async function runAllHealthChecks(): Promise<HealthCheck[]> {
  const results = await Promise.all(MONITORED_SERVICES.map(checkHealth));
  for (const result of results) {
    logEntry("nox", "operations", "health_check", "completed", {
      output: { service: result.service, status: result.status },
    });
  }
  return results;
}
