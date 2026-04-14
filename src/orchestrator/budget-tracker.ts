/**
 * Budget Tracker — Per-agent cost tracking with hard budget limits.
 * Tracks API token usage, image/video generation costs, and enforces monthly budgets.
 */
import fs from "fs";
import path from "path";

const BUDGET_FILE = path.resolve(__dirname, "../../data/budgets.json");

export interface CostEvent {
  id: string;
  agentId: string;
  provider: string;  // anthropic, xai, huggingface, etc
  type: "tokens" | "image" | "video" | "api_call";
  costCents: number;
  details: string;
  timestamp: string;
}

export interface AgentBudget {
  agentId: string;
  monthlyLimitCents: number;
  currentMonthCents: number;
  totalAllTimeCents: number;
  lastResetDate: string;
  events: CostEvent[];
  paused: boolean;
}

function loadBudgets(): Record<string, AgentBudget> {
  if (!fs.existsSync(BUDGET_FILE)) return {};
  return JSON.parse(fs.readFileSync(BUDGET_FILE, "utf-8"));
}

function saveBudgets(budgets: Record<string, AgentBudget>) {
  const dir = path.dirname(BUDGET_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(budgets, null, 2), "utf-8");
}

/** Initialize budget for an agent */
export function initBudget(agentId: string, monthlyLimitCents: number): AgentBudget {
  const budgets = loadBudgets();
  if (!budgets[agentId]) {
    budgets[agentId] = {
      agentId,
      monthlyLimitCents,
      currentMonthCents: 0,
      totalAllTimeCents: 0,
      lastResetDate: new Date().toISOString().slice(0, 7), // YYYY-MM
      events: [],
      paused: false,
    };
    saveBudgets(budgets);
  }
  return budgets[agentId];
}

/** Record a cost event */
export function recordCost(
  agentId: string,
  provider: string,
  type: CostEvent["type"],
  costCents: number,
  details: string
): { recorded: boolean; budgetExceeded: boolean; remaining: number } {
  const budgets = loadBudgets();
  let budget = budgets[agentId];
  if (!budget) {
    budget = initBudget(agentId, 10000); // default $100/month
  }

  // Check for monthly reset
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (budget.lastResetDate !== currentMonth) {
    budget.currentMonthCents = 0;
    budget.lastResetDate = currentMonth;
    budget.paused = false;
    budget.events = []; // Clear old events
  }

  // Record the event
  budget.events.push({
    id: `cost-${Date.now()}`,
    agentId,
    provider,
    type,
    costCents,
    details,
    timestamp: new Date().toISOString(),
  });

  budget.currentMonthCents += costCents;
  budget.totalAllTimeCents += costCents;

  // Check budget limit
  const exceeded = budget.currentMonthCents >= budget.monthlyLimitCents;
  if (exceeded) budget.paused = true;

  budgets[agentId] = budget;
  saveBudgets(budgets);

  return {
    recorded: true,
    budgetExceeded: exceeded,
    remaining: budget.monthlyLimitCents - budget.currentMonthCents,
  };
}

/** Check if agent can spend */
export function canSpend(agentId: string, costCents: number): boolean {
  const budgets = loadBudgets();
  const budget = budgets[agentId];
  if (!budget) return true; // No budget = no limit
  if (budget.paused) return false;
  return (budget.currentMonthCents + costCents) <= budget.monthlyLimitCents;
}

/** Get budget summary for an agent */
export function getBudget(agentId: string): AgentBudget | null {
  return loadBudgets()[agentId] || null;
}

/** Get all budgets summary */
export function getAllBudgets(): Array<{
  agentId: string;
  spent: number;
  limit: number;
  remaining: number;
  percentage: number;
  paused: boolean;
}> {
  const budgets = loadBudgets();
  return Object.values(budgets).map(b => ({
    agentId: b.agentId,
    spent: b.currentMonthCents,
    limit: b.monthlyLimitCents,
    remaining: b.monthlyLimitCents - b.currentMonthCents,
    percentage: Math.round((b.currentMonthCents / b.monthlyLimitCents) * 100),
    paused: b.paused,
  }));
}

/** Get total agency spend this month */
export function getAgencySpend(): { totalSpent: number; totalBudget: number; agentCount: number } {
  const budgets = loadBudgets();
  const values = Object.values(budgets);
  return {
    totalSpent: values.reduce((s, b) => s + b.currentMonthCents, 0),
    totalBudget: values.reduce((s, b) => s + b.monthlyLimitCents, 0),
    agentCount: values.length,
  };
}
