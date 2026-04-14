/**
 * Jake — Autonomous Scheduler
 * Cron-like job scheduling using simple time checks.
 * Jobs are persisted in ~/.jake/jobs.json.
 *
 * node-cron IS available in the project, but we use a simpler
 * approach: store schedules as { hour, minute } and check on each tick.
 */

import fs from "fs";
import { JOBS_FILE, ensureDirs } from "./state";
import { JakeBrain, type CycleResult } from "./brain";

// ═══════════════════════════════════════
//  Types
// ═══════════════════════════════════════

export interface ScheduledJob {
  id: string;
  name: string;
  /** Cron-like schedule: hours and minutes when this job should run */
  schedule: JobSchedule;
  /** The prompt to send to Jake's brain when this job fires */
  prompt: string;
  /** Whether this job is active */
  enabled: boolean;
  /** Last time this job ran (ISO string) */
  lastRun: string | null;
  /** How many times this job has run */
  runCount: number;
}

export interface JobSchedule {
  /** Hours of the day to run (0-23). Use [every] with intervalHours for repeating. */
  hours: number[];
  /** Minute of the hour to run (0-59) */
  minute: number;
}

interface JobExecution {
  jobId: string;
  jobName: string;
  executedAt: string;
  result: CycleResult;
}

// ═══════════════════════════════════════
//  Default Jobs
// ═══════════════════════════════════════

const DEFAULT_JOBS: ScheduledJob[] = [
  {
    id: "morning-deploy",
    name: "Morning Content Deploy",
    schedule: { hours: [9], minute: 0 },
    prompt: "It's morning deploy time. Review the current state of the agency, then deploy content for all brands. After deploying, save a brief summary to memory noting any successes or failures.",
    enabled: true,
    lastRun: null,
    runCount: 0,
  },
  {
    id: "afternoon-deploy",
    name: "Afternoon Content Deploy",
    schedule: { hours: [14], minute: 0 },
    prompt: "It's afternoon deploy time. Deploy fresh content for all brands. Focus on any brands that may have failed during the morning deploy. Update memory with results.",
    enabled: true,
    lastRun: null,
    runCount: 0,
  },
  {
    id: "evening-deploy",
    name: "Evening Content Deploy",
    schedule: { hours: [19], minute: 0 },
    prompt: "It's the evening content deploy. Deploy content for all brands — this is the last deploy of the day. Make sure every brand gets content out. Log results to memory.",
    enabled: true,
    lastRun: null,
    runCount: 0,
  },
  {
    id: "daily-report",
    name: "Daily Report",
    schedule: { hours: [23], minute: 0 },
    prompt: "Generate the daily agency report. Review your memory for today's actions, check analytics, and create a comprehensive report summarizing: what was deployed, any failures, insights, and recommendations for tomorrow. Save the report using send_report.",
    enabled: true,
    lastRun: null,
    runCount: 0,
  },
  {
    id: "memory-review-1",
    name: "Memory Review (Morning)",
    schedule: { hours: [6], minute: 0 },
    prompt: "Review your recent actions and memory. Are there any patterns, recurring failures, or insights you should note? Update your memory with any observations. Check if there are tasks that need attention today.",
    enabled: true,
    lastRun: null,
    runCount: 0,
  },
  {
    id: "memory-review-2",
    name: "Memory Review (Afternoon)",
    schedule: { hours: [12], minute: 0 },
    prompt: "Mid-day memory review. Check how today's deploys have gone. List the brands and note any patterns. Update memory if needed.",
    enabled: true,
    lastRun: null,
    runCount: 0,
  },
  {
    id: "memory-review-3",
    name: "Memory Review (Evening)",
    schedule: { hours: [18], minute: 0 },
    prompt: "Evening memory review. Reflect on today's activity so far. Any brands underperforming? Any platforms with issues? Save observations to memory.",
    enabled: true,
    lastRun: null,
    runCount: 0,
  },
  {
    id: "memory-review-4",
    name: "Memory Review (Night)",
    schedule: { hours: [0], minute: 0 },
    prompt: "Nightly memory review. The day is done. Consolidate your observations from today into clear, concise memory entries. Remove any outdated observations if needed.",
    enabled: true,
    lastRun: null,
    runCount: 0,
  },
];

// ═══════════════════════════════════════
//  Job Persistence
// ═══════════════════════════════════════

export function loadJobs(): ScheduledJob[] {
  ensureDirs();
  if (!fs.existsSync(JOBS_FILE)) {
    saveJobs(DEFAULT_JOBS);
    return DEFAULT_JOBS;
  }
  try {
    const raw = fs.readFileSync(JOBS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return DEFAULT_JOBS;
  }
}

function saveJobs(jobs: ScheduledJob[]): void {
  ensureDirs();
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), "utf-8");
}

// ═══════════════════════════════════════
//  Public API
// ═══════════════════════════════════════

export function listJobs(): ScheduledJob[] {
  return loadJobs();
}

export function addJob(job: ScheduledJob): ScheduledJob[] {
  const jobs = loadJobs();
  // Replace if same ID exists
  const idx = jobs.findIndex(j => j.id === job.id);
  if (idx >= 0) {
    jobs[idx] = job;
  } else {
    jobs.push(job);
  }
  saveJobs(jobs);
  return jobs;
}

export function removeJob(jobId: string): ScheduledJob[] {
  let jobs = loadJobs();
  jobs = jobs.filter(j => j.id !== jobId);
  saveJobs(jobs);
  return jobs;
}

export function enableJob(jobId: string, enabled: boolean): ScheduledJob[] {
  const jobs = loadJobs();
  const job = jobs.find(j => j.id === jobId);
  if (job) job.enabled = enabled;
  saveJobs(jobs);
  return jobs;
}

// ═══════════════════════════════════════
//  Tick — Check & Execute Due Jobs
// ═══════════════════════════════════════

/**
 * Check if any jobs are due and execute them.
 * Call this every 60 seconds from the daemon loop.
 *
 * A job is "due" if:
 *   1. It's enabled
 *   2. The current hour is in job.schedule.hours
 *   3. The current minute matches job.schedule.minute (within a 2-minute window)
 *   4. It hasn't already run in the current hour
 */
export async function tick(brain: JakeBrain): Promise<JobExecution[]> {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const jobs = loadJobs();
  const executions: JobExecution[] = [];

  for (const job of jobs) {
    if (!job.enabled) continue;

    // Check if current hour matches
    if (!job.schedule.hours.includes(currentHour)) continue;

    // Check if current minute is within window of scheduled minute
    const minuteDiff = Math.abs(currentMinute - job.schedule.minute);
    if (minuteDiff > 2) continue;

    // Check if already ran this hour
    if (job.lastRun) {
      const lastRunDate = new Date(job.lastRun);
      if (
        lastRunDate.getFullYear() === now.getFullYear() &&
        lastRunDate.getMonth() === now.getMonth() &&
        lastRunDate.getDate() === now.getDate() &&
        lastRunDate.getHours() === currentHour
      ) {
        continue; // Already ran this hour
      }
    }

    // ── Execute the job ──
    console.log(`\n[scheduler] Running job: ${job.name} (${job.id})`);
    try {
      const result = await brain.run(job.prompt);

      // Update job state
      job.lastRun = now.toISOString();
      job.runCount++;

      executions.push({
        jobId: job.id,
        jobName: job.name,
        executedAt: now.toISOString(),
        result,
      });

      console.log(`[scheduler] Job '${job.name}' completed: ${result.iterations} iterations, ${result.toolCalls.length} tool calls`);

      // Refresh system prompt after each job (memory may have changed)
      brain.refreshSystemPrompt();
    } catch (e: any) {
      console.error(`[scheduler] Job '${job.name}' failed: ${e.message}`);
    }
  }

  // Save updated job states
  saveJobs(jobs);

  return executions;
}

/**
 * Print a human-readable schedule overview.
 */
export function printSchedule(): string {
  const jobs = loadJobs();
  const lines = jobs.map(j => {
    const hours = j.schedule.hours.map(h => `${h.toString().padStart(2, "0")}:${j.schedule.minute.toString().padStart(2, "0")}`).join(", ");
    const status = j.enabled ? "ON" : "OFF";
    const lastRun = j.lastRun ? new Date(j.lastRun).toLocaleString() : "never";
    return `  [${status}] ${j.name.padEnd(30)} | Times: ${hours.padEnd(20)} | Runs: ${j.runCount} | Last: ${lastRun}`;
  });
  return `Scheduled Jobs (${jobs.length}):\n${lines.join("\n")}`;
}
