/**
 * ELMS (Episodic Layered Memory System)
 *
 * Four memory layers that give agents persistent context:
 *
 * 1. EPISODIC  — What happened today / this session (short-term)
 * 2. LEARNED   — Patterns, preferences, and lessons from past runs
 * 3. MISSION   — Core brand identity, goals, and constraints (rarely changes)
 * 4. SEMANTIC  — Facts, data points, and reference material
 *
 * Each agent can read from all layers but only writes to Episodic and Learned.
 * Mission and Semantic layers are curated by Jake or manually.
 */

import fs from "fs";
import path from "path";

const ELMS_DIR = path.resolve(__dirname, "../../data/elms");

export type MemoryLayer = "episodic" | "learned" | "mission" | "semantic";

export interface MemoryEntry {
  id: string;
  layer: MemoryLayer;
  agent: string;
  key: string;
  value: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string; // only episodic memories expire
}

function ensureDir(subdir?: string) {
  const dir = subdir ? path.join(ELMS_DIR, subdir) : ELMS_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getLayerFile(layer: MemoryLayer): string {
  ensureDir();
  return path.join(ELMS_DIR, `${layer}.json`);
}

function readLayer(layer: MemoryLayer): MemoryEntry[] {
  const file = getLayerFile(layer);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeLayer(layer: MemoryLayer, entries: MemoryEntry[]) {
  const file = getLayerFile(layer);
  fs.writeFileSync(file, JSON.stringify(entries, null, 2), "utf-8");
}

function generateId(): string {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Store a memory entry */
export function remember(
  layer: MemoryLayer,
  agent: string,
  key: string,
  value: string,
  tags: string[] = [],
  ttlHours?: number
): MemoryEntry {
  const entries = readLayer(layer);

  // Update existing entry with same key+agent, or create new
  const existingIdx = entries.findIndex((e) => e.key === key && e.agent === agent);

  const entry: MemoryEntry = {
    id: existingIdx >= 0 ? entries[existingIdx].id : generateId(),
    layer,
    agent,
    key,
    value,
    tags,
    createdAt: existingIdx >= 0 ? entries[existingIdx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: ttlHours
      ? new Date(Date.now() + ttlHours * 3600_000).toISOString()
      : undefined,
  };

  if (existingIdx >= 0) {
    entries[existingIdx] = entry;
  } else {
    entries.push(entry);
  }

  writeLayer(layer, entries);
  return entry;
}

/** Recall memories by key, agent, or tags */
export function recall(options: {
  layer?: MemoryLayer;
  agent?: string;
  key?: string;
  tags?: string[];
  limit?: number;
}): MemoryEntry[] {
  const layers: MemoryLayer[] = options.layer
    ? [options.layer]
    : ["episodic", "learned", "mission", "semantic"];

  let results: MemoryEntry[] = [];

  for (const layer of layers) {
    let entries = readLayer(layer);

    // Prune expired episodic memories
    if (layer === "episodic") {
      const now = new Date().toISOString();
      entries = entries.filter((e) => !e.expiresAt || e.expiresAt > now);
      writeLayer(layer, entries);
    }

    results.push(...entries);
  }

  // Filter
  if (options.agent) {
    results = results.filter((e) => e.agent === options.agent);
  }
  if (options.key) {
    results = results.filter((e) => e.key.includes(options.key!));
  }
  if (options.tags?.length) {
    results = results.filter((e) => options.tags!.some((t) => e.tags.includes(t)));
  }

  // Sort by most recent
  results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (options.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/** Get all memories for a specific agent (for injecting into system prompt) */
export function getAgentContext(agent: string): string {
  const memories = recall({ agent, limit: 50 });

  if (memories.length === 0) return "";

  const grouped: Record<string, MemoryEntry[]> = {};
  for (const m of memories) {
    if (!grouped[m.layer]) grouped[m.layer] = [];
    grouped[m.layer].push(m);
  }

  let context = "## Agent Memory Context\n\n";
  for (const [layer, entries] of Object.entries(grouped)) {
    context += `### ${layer.toUpperCase()}\n`;
    for (const entry of entries) {
      context += `- **${entry.key}**: ${entry.value}\n`;
    }
    context += "\n";
  }

  return context;
}

/** Clear expired episodic memories */
export function pruneExpired(): number {
  const entries = readLayer("episodic");
  const now = new Date().toISOString();
  const valid = entries.filter((e) => !e.expiresAt || e.expiresAt > now);
  const pruned = entries.length - valid.length;
  writeLayer("episodic", valid);
  return pruned;
}

/** Initialize mission layer with core brand data */
export function initMissionMemory() {
  const missions = [
    {
      key: "primary_product",
      value: "Legacy Builders Program — an online business education program at skilldailypay.com",
      tags: ["brand", "product"],
    },
    {
      key: "business_units",
      value: "SkillDailyPay (main), Leeijann Design (blog/content), Silix LLC (e-commerce), Hell Corner (TBD)",
      tags: ["brand", "structure"],
    },
    {
      key: "revenue_goal",
      value: "Drive traffic from 7 platforms and 4 YouTube channels into Legacy Builders Program sales funnel",
      tags: ["strategy", "revenue"],
    },
    {
      key: "owner",
      value: "Ricardo — receives daily summaries via Telegram, has final say on all strategy decisions",
      tags: ["team", "leadership"],
    },
    {
      key: "tone",
      value: "Professional but approachable. Educational but not preachy. Results-focused. Authentic.",
      tags: ["brand", "voice"],
    },
  ];

  for (const m of missions) {
    remember("mission", "system", m.key, m.value, m.tags);
  }
}
