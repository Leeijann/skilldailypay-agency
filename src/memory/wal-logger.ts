/**
 * WAL (Write-Ahead Log) — persistent audit trail for every action in the agency.
 * Every task assignment, completion, error, and decision gets logged here.
 * Jake uses this to maintain accountability and generate daily reports.
 */

import fs from "fs";
import path from "path";

export interface WALEntry {
  id: string;
  timestamp: string;
  agent: string;
  department: string;
  action: string;
  status: "queued" | "in_progress" | "completed" | "failed" | "skipped";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  durationMs?: number;
  tokenCost?: number;
}

const WAL_DIR = path.resolve(__dirname, "../../data/wal");
const MAX_ENTRIES_PER_FILE = 1000;

function ensureDir() {
  if (!fs.existsSync(WAL_DIR)) {
    fs.mkdirSync(WAL_DIR, { recursive: true });
  }
}

function getTodayFile(): string {
  const date = new Date().toISOString().split("T")[0];
  return path.join(WAL_DIR, `wal-${date}.jsonl`);
}

function generateId(): string {
  return `wal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function logEntry(
  agent: string,
  department: string,
  action: string,
  status: WALEntry["status"],
  details?: Partial<Pick<WALEntry, "input" | "output" | "error" | "durationMs" | "tokenCost">>
): WALEntry {
  ensureDir();

  const entry: WALEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    agent,
    department,
    action,
    status,
    ...details,
  };

  const file = getTodayFile();
  fs.appendFileSync(file, JSON.stringify(entry) + "\n", "utf-8");

  return entry;
}

export function readTodayLog(): WALEntry[] {
  const file = getTodayFile();
  if (!fs.existsSync(file)) return [];

  return fs
    .readFileSync(file, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function readLogForDate(date: string): WALEntry[] {
  const file = path.join(WAL_DIR, `wal-${date}.jsonl`);
  if (!fs.existsSync(file)) return [];

  return fs
    .readFileSync(file, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function getAgentStats(agent: string, entries?: WALEntry[]): {
  total: number;
  completed: number;
  failed: number;
  totalTokens: number;
} {
  const logs = entries || readTodayLog();
  const agentLogs = logs.filter((e) => e.agent === agent);

  return {
    total: agentLogs.length,
    completed: agentLogs.filter((e) => e.status === "completed").length,
    failed: agentLogs.filter((e) => e.status === "failed").length,
    totalTokens: agentLogs.reduce((sum, e) => sum + (e.tokenCost || 0), 0),
  };
}

export function getDepartmentStats(department: string, entries?: WALEntry[]) {
  const logs = entries || readTodayLog();
  const deptLogs = logs.filter((e) => e.department === department);

  return {
    total: deptLogs.length,
    completed: deptLogs.filter((e) => e.status === "completed").length,
    failed: deptLogs.filter((e) => e.status === "failed").length,
    agents: [...new Set(deptLogs.map((e) => e.agent))],
  };
}
