/**
 * Jake — State Persistence
 * JSON-file-based state management. No external dependencies.
 *
 * Storage layout:
 *   ~/.jake/state.json       — current runtime state
 *   ~/.jake/sessions/        — conversation logs per session
 *   ~/.jake/reports/         — daily reports
 *   ~/.jake/MEMORY.md        — persistent memory
 *   ~/.jake/jobs.json        — scheduled jobs
 */

import fs from "fs";
import path from "path";

// ═══════════════════════════════════════
//  Home Directory
// ═══════════════════════════════════════

const HOME = process.env.USERPROFILE || process.env.HOME || "~";
export const JAKE_HOME = path.join(HOME, ".jake");
export const STATE_FILE = path.join(JAKE_HOME, "state.json");
export const SESSIONS_DIR = path.join(JAKE_HOME, "sessions");
export const REPORTS_DIR = path.join(JAKE_HOME, "reports");
export const MEMORY_FILE = path.join(JAKE_HOME, "MEMORY.md");
export const JOBS_FILE = path.join(JAKE_HOME, "jobs.json");

/** Ensure all directories exist */
export function ensureDirs(): void {
  for (const dir of [JAKE_HOME, SESSIONS_DIR, REPORTS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// ═══════════════════════════════════════
//  State Types
// ═══════════════════════════════════════

export interface JakeState {
  lastRun: string | null;
  lastCycleResult: string | null;
  activeTasks: ActiveTask[];
  totalCyclesRun: number;
  totalToolCalls: number;
  startedAt: string | null;
  mode: "cli" | "daemon" | null;
}

export interface ActiveTask {
  id: string;
  description: string;
  status: "pending" | "running" | "done" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface SessionLog {
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
  mode: "cli" | "daemon";
  messages: SessionMessage[];
  toolCalls: ToolCallLog[];
}

export interface SessionMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
}

export interface ToolCallLog {
  tool: string;
  args: Record<string, any>;
  result: string;
  timestamp: string;
  durationMs: number;
}

// ═══════════════════════════════════════
//  Default State
// ═══════════════════════════════════════

function defaultState(): JakeState {
  return {
    lastRun: null,
    lastCycleResult: null,
    activeTasks: [],
    totalCyclesRun: 0,
    totalToolCalls: 0,
    startedAt: null,
    mode: null,
  };
}

// ═══════════════════════════════════════
//  State Read/Write
// ═══════════════════════════════════════

export function loadState(): JakeState {
  ensureDirs();
  if (!fs.existsSync(STATE_FILE)) return defaultState();
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

export function saveState(state: JakeState): void {
  ensureDirs();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export function updateState(patch: Partial<JakeState>): JakeState {
  const state = loadState();
  Object.assign(state, patch);
  saveState(state);
  return state;
}

// ═══════════════════════════════════════
//  Session Logging
// ═══════════════════════════════════════

export function createSessionId(): string {
  const now = new Date();
  return `${now.toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;
}

export function logSession(session: SessionLog): void {
  ensureDirs();
  const file = path.join(SESSIONS_DIR, `${session.sessionId}.json`);
  fs.writeFileSync(file, JSON.stringify(session, null, 2), "utf-8");
}

export function loadSession(sessionId: string): SessionLog | null {
  const file = path.join(SESSIONS_DIR, `${sessionId}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

export function getRecentSessions(count: number = 10): SessionLog[] {
  ensureDirs();
  if (!fs.existsSync(SESSIONS_DIR)) return [];
  const files = fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, count);

  const sessions: SessionLog[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(SESSIONS_DIR, file), "utf-8");
      sessions.push(JSON.parse(raw));
    } catch {
      // skip corrupt files
    }
  }
  return sessions;
}

// ═══════════════════════════════════════
//  Reports
// ═══════════════════════════════════════

export function saveReport(report: string): string {
  ensureDirs();
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(REPORTS_DIR, `${date}.md`);
  fs.writeFileSync(file, report, "utf-8");
  return file;
}

export function loadReport(date: string): string | null {
  const file = path.join(REPORTS_DIR, `${date}.md`);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf-8");
}

export function getRecentReports(count: number = 7): Array<{ date: string; content: string }> {
  ensureDirs();
  if (!fs.existsSync(REPORTS_DIR)) return [];
  const files = fs.readdirSync(REPORTS_DIR)
    .filter(f => f.endsWith(".md"))
    .sort()
    .reverse()
    .slice(0, count);

  return files.map(f => ({
    date: f.replace(".md", ""),
    content: fs.readFileSync(path.join(REPORTS_DIR, f), "utf-8"),
  }));
}
