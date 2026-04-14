/**
 * Heartbeat System — Scheduled wake-ups for agents.
 * Each agent has a configurable schedule. When their heartbeat fires,
 * they check for assigned tasks, execute them, and report results.
 */
import { ORG_CHART, AgentDef } from "./org-chart";
import { getAgentTasks, claimTask, completeTask, addComment, createTask } from "./task-manager";
import { canSpend, recordCost } from "./budget-tracker";

export interface HeartbeatResult {
  agentId: string;
  tasksProcessed: number;
  tasksCreated: number;
  errors: string[];
  timestamp: string;
}

export interface HeartbeatSchedule {
  agentId: string;
  cronExpression: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

// Default schedules per role
const DEFAULT_SCHEDULES: Record<string, string> = {
  "CEO / Orchestrator": "0 6 * * *",      // Daily 6am
  "CMO": "0 7 * * *",                      // Daily 7am
  "Social Lead": "0 */4 * * *",            // Every 4 hours
  "Platform Lead": "0 */3 * * *",           // Every 3 hours
  "Content Creator": "0 */2 * * *",         // Every 2 hours
  "Channel Manager": "0 */4 * * *",         // Every 4 hours
  "Specialist": "0 8,14,20 * * *",          // 3x/day
  "Coordinator": "0 */6 * * *",             // Every 6 hours
  "Revenue Lead": "0 9,17 * * *",           // 2x/day
  "CFO": "0 8 * * *",                       // Daily 8am
  "Revenue Specialist": "0 10,16 * * *",    // 2x/day
  "Research Lead": "0 6,12,18 * * *",       // 3x/day
  "Operations Lead": "0 */1 * * *",          // Every hour
  "E-Commerce Manager": "0 */4 * * *",      // Every 4 hours
};

/** Get schedule for an agent */
export function getSchedule(agent: AgentDef): HeartbeatSchedule {
  return {
    agentId: agent.id,
    cronExpression: DEFAULT_SCHEDULES[agent.role] || "0 */6 * * *",
    enabled: true,
    lastRun: null,
    nextRun: null,
  };
}

/** Get all agent schedules */
export function getAllSchedules(): HeartbeatSchedule[] {
  return ORG_CHART.map(getSchedule);
}

/** Execute a single agent heartbeat */
export async function executeHeartbeat(agentId: string): Promise<HeartbeatResult> {
  const result: HeartbeatResult = {
    agentId,
    tasksProcessed: 0,
    tasksCreated: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  const agent = ORG_CHART.find(a => a.id === agentId);
  if (!agent) {
    result.errors.push(`Agent ${agentId} not found`);
    return result;
  }

  // Check budget
  if (!canSpend(agentId, 100)) { // ~$1 minimum
    result.errors.push(`Agent ${agentId} budget exceeded — paused`);
    return result;
  }

  // Get assigned tasks
  const todoTasks = getAgentTasks(agentId, "todo");
  const inProgressTasks = getAgentTasks(agentId, "in_progress");

  // Process in-progress tasks first (check for completion)
  for (const task of inProgressTasks) {
    // Agent checks if work is done
    addComment(task.id, agentId, `Heartbeat check: task still in progress`);
    result.tasksProcessed++;
  }

  // Claim and start todo tasks
  for (const task of todoTasks.slice(0, 3)) { // Max 3 tasks per heartbeat
    const claim = claimTask(task.id, agentId);
    if (claim.success) {
      addComment(task.id, agentId, `Claimed task and starting work`);
      result.tasksProcessed++;
    }
  }

  return result;
}

/** Run heartbeats for all agents */
export async function runAllHeartbeats(): Promise<HeartbeatResult[]> {
  const results: HeartbeatResult[] = [];
  for (const agent of ORG_CHART) {
    const result = await executeHeartbeat(agent.id);
    results.push(result);
  }
  return results;
}

/** Print heartbeat status */
export function getHeartbeatStatus(): string {
  const schedules = getAllSchedules();
  let output = "Agent Heartbeat Status:\n\n";
  for (const s of schedules) {
    const agent = ORG_CHART.find(a => a.id === s.agentId);
    output += `  ${agent?.name || s.agentId}: ${s.cronExpression} [${s.enabled ? "ON" : "OFF"}]\n`;
  }
  return output;
}
