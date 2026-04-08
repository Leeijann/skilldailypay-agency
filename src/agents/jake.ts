/**
 * JAKE — Chief of Staff / Orchestrator
 * Department: Command Center
 *
 * Responsibilities:
 * - Receives all incoming tasks and routes to correct agent/department
 * - Maintains WAL logs and ELMS memory
 * - Generates daily reports for Ricardo via Telegram
 * - Manages the daily operations schedule
 */

import { BaseAgent, AgentConfig, TaskResult } from "./base-agent";
import { logEntry, readTodayLog } from "../memory/wal-logger";
import { generateDailySummary, formatSummaryForTelegram } from "../memory/daily-summary";
import { recall, remember } from "../memory/elms-layers";

const SYSTEM_PROMPT = `You are Jake, Chief of Staff at SkillDailyPay AI Media Agency.

Your role:
- You are the orchestrator. Every task flows through you first.
- You route tasks to the correct agent based on department and capability.
- You maintain operational awareness of all active tasks and their status.
- You generate daily summaries for Ricardo (the owner) via Telegram.

Department structure:
- CONTENT (Nexus, Leeijann, Social): All content creation
- RESEARCH (Ivy): Trend scraping, competitor intel
- REVENUE (Sales): Funnels, email, ad copy, UGC
- OPERATIONS (Finance, Nox, Silix): Money tracking, security, e-commerce

Routing rules:
- YouTube/TikTok video scripts → Nexus
- Blog posts, SEO, Pinterest → Leeijann
- Social captions (IG, FB, X, LinkedIn) → Social
- Trend research, competitor analysis → Ivy
- Email sequences, ad copy, UGC scripts → Sales
- Revenue/expense tracking → Finance
- Security, health checks → Nox
- Product listings, TikTok Shop → Silix

When routing, always:
1. Log the task assignment in WAL
2. Include relevant context from ELMS memory
3. Specify the output format expected
4. Set priority level (critical / high / normal / low)

Primary product: Legacy Builders Program (skilldailypay.com)
Owner: Ricardo
Communication channel: Telegram`;

export type Priority = "critical" | "high" | "normal" | "low";

export interface TaskAssignment {
  agent: string;
  department: string;
  task: string;
  params: Record<string, unknown>;
  priority: Priority;
  context?: string;
}

// Agent routing table
const ROUTING_TABLE: Record<string, { agent: string; department: string }> = {
  youtube_script: { agent: "nexus", department: "content" },
  tiktok_script: { agent: "nexus", department: "content" },
  shorts_brief: { agent: "nexus", department: "content" },
  blog_post: { agent: "leeijann", department: "content" },
  seo_optimize: { agent: "leeijann", department: "content" },
  pinterest_pin: { agent: "leeijann", department: "content" },
  social_caption: { agent: "social", department: "content" },
  social_thread: { agent: "social", department: "content" },
  trend_research: { agent: "ivy", department: "research" },
  competitor_analysis: { agent: "ivy", department: "research" },
  email_sequence: { agent: "sales", department: "revenue" },
  ad_copy: { agent: "sales", department: "revenue" },
  ugc_script: { agent: "sales", department: "revenue" },
  landing_page: { agent: "sales", department: "revenue" },
  revenue_log: { agent: "finance", department: "operations" },
  expense_log: { agent: "finance", department: "operations" },
  daily_pnl: { agent: "finance", department: "operations" },
  health_check: { agent: "nox", department: "operations" },
  security_alert: { agent: "nox", department: "operations" },
  product_listing: { agent: "silix", department: "operations" },
  tiktok_shop: { agent: "silix", department: "operations" },
};

const config: AgentConfig = {
  name: "jake",
  department: "command",
  role: "Chief of Staff / Orchestrator",
  systemPrompt: SYSTEM_PROMPT,
  defaultTaskKey: "jake.daily_plan",
};

class JakeAgent extends BaseAgent {
  constructor() {
    super(config);
  }

  /** Route an incoming task to the correct agent */
  routeTask(taskType: string, params: Record<string, unknown> = {}, priority: Priority = "normal"): TaskAssignment {
    const route = ROUTING_TABLE[taskType];
    if (!route) {
      logEntry("jake", "command", "route_task", "failed", {
        error: `Unknown task type: ${taskType}`,
      });
      throw new Error(`Unknown task type: ${taskType}. Available: ${Object.keys(ROUTING_TABLE).join(", ")}`);
    }

    // Pull relevant context from memory
    const memories = recall({ tags: [taskType], limit: 5 });
    const context = memories.map((m) => `${m.key}: ${m.value}`).join("\n");

    const assignment: TaskAssignment = {
      agent: route.agent,
      department: route.department,
      task: taskType,
      params,
      priority,
      context: context || undefined,
    };

    logEntry("jake", "command", `route_${taskType}`, "completed", {
      output: { assignedTo: route.agent, priority },
    });

    return assignment;
  }

  /** Execute Jake's own tasks */
  async execute(task: string, params?: Record<string, unknown>): Promise<TaskResult> {
    switch (task) {
      case "daily_plan":
        return this.createDailyPlan();
      case "daily_summary":
        return this.createDailySummary();
      case "route":
        const assignment = this.routeTask(
          params?.taskType as string,
          params?.taskParams as Record<string, unknown>,
          params?.priority as Priority
        );
        return { success: true, output: assignment as unknown as Record<string, unknown> };
      default:
        return {
          success: false,
          output: {},
          error: `Jake doesn't handle task: ${task}`,
        };
    }
  }

  /** Generate the daily operations plan */
  private async createDailyPlan(): Promise<TaskResult> {
    const prompt = `Create today's operations plan for the SkillDailyPay AI Media Agency.

Current date: ${new Date().toISOString().split("T")[0]}

Generate a structured daily plan following this schedule:
- 6:00 AM: Ivy scrapes trends
- 6:30 AM: Jake reviews trends, assigns content tasks
- 7:00 AM: Nexus generates YouTube briefs + TikTok scripts
- 7:30 AM: Leeijann generates blog posts
- 8:00 AM: Social generates captions
- 8:30 AM: n8n publishes content
- 12:00 PM: Sales sends email sequence
- 6:00 PM: Finance logs revenue
- 9:00 PM: Nox health check, Jake sends daily summary

Include any adjustments based on current context.
Output as a structured JSON plan with tasks, agents, and times.`;

    const response = await this.call(prompt, "jake.daily_plan");

    this.noteEpisodic("daily_plan", response, 24);

    return {
      success: true,
      output: { plan: response },
    };
  }

  /** Generate and format daily summary */
  private async createDailySummary(): Promise<TaskResult> {
    const summary = generateDailySummary();
    const telegramMessage = formatSummaryForTelegram(summary);

    return {
      success: true,
      output: {
        summary,
        telegramMessage,
      },
    };
  }

  /** Get the full routing table for reference */
  getRoutingTable() {
    return ROUTING_TABLE;
  }
}

export const jake = new JakeAgent();
