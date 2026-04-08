/**
 * SkillDailyPay AI Media Agency — Master Entry Point
 *
 * This is the main orchestration layer. It initializes all systems,
 * sets up the daily schedule, and provides the CLI/API interface.
 *
 * Usage:
 *   npm run dev              — Start the agency (interactive mode)
 *   npm run dev -- --daily   — Run the full daily operations cycle
 *   npm run dev -- --agent jake --task daily_plan
 *   npm run dev -- --health  — Run system health check
 */

import { jake } from "./agents/jake";
import { nexus } from "./agents/nexus";
import { leeijann } from "./agents/leeijann";
import { ivy } from "./agents/ivy";
import { social } from "./agents/social";
import { sales } from "./agents/sales";
import { finance } from "./agents/finance";
import { nox } from "./agents/nox";
import { silix } from "./agents/silix";
import { initMissionMemory } from "./memory/elms-layers";
import { initBrandDocs } from "./knowledge/notebooklm-connector";
import { logEntry } from "./memory/wal-logger";
import { sendTelegram, processCommand } from "./departments/command";
import { generateDailySummary, formatSummaryForTelegram } from "./memory/daily-summary";
import { BaseAgent, TaskResult } from "./agents/base-agent";

// ── Agent Registry ──────────────────────────────────────────────
const AGENTS: Record<string, BaseAgent> = {
  jake,
  nexus,
  leeijann,
  ivy,
  social,
  sales,
  finance,
  nox,
  silix,
};

// ── Initialization ──────────────────────────────────────────────
async function initialize() {
  console.log("🏢 SkillDailyPay AI Media Agency — Starting up...\n");

  // Initialize memory and knowledge base
  initMissionMemory();
  initBrandDocs();

  logEntry("jake", "command", "system_init", "completed", {
    output: { agents: Object.keys(AGENTS), timestamp: new Date().toISOString() },
  });

  console.log(`✅ ${Object.keys(AGENTS).length} agents online`);
  console.log("✅ ELMS memory initialized");
  console.log("✅ Knowledge base loaded");
  console.log("✅ WAL logger active\n");
}

// ── Daily Operations Cycle ──────────────────────────────────────
async function runDailyCycle() {
  console.log("📋 Running full daily operations cycle...\n");

  // 6:00 AM — Ivy research
  console.log("🔍 [6:00 AM] Ivy: Researching trends...");
  const trendResult = await ivy.execute("daily_brief");
  console.log(`   ${trendResult.success ? "✅" : "❌"} Trend research complete\n`);

  // 7:00 AM — Nexus video content
  console.log("🎬 [7:00 AM] Nexus: Generating video scripts...");
  const ytResult = await nexus.execute("youtube_script", {
    topic: "How to Start an Online Business in 2025",
    channel: "SkillDailyPay Main",
  });
  const ttResult = await nexus.execute("tiktok_script", {
    topic: "3 Online Business Ideas That Actually Work",
  });
  console.log(`   ${ytResult.success ? "✅" : "❌"} YouTube script`);
  console.log(`   ${ttResult.success ? "✅" : "❌"} TikTok script\n`);

  // 7:30 AM — Leeijann blog
  console.log("📝 [7:30 AM] Leeijann: Writing blog post...");
  const blogResult = await leeijann.execute("blog_post", {
    topic: "The Complete Guide to Building Online Income Streams",
  });
  console.log(`   ${blogResult.success ? "✅" : "❌"} Blog post complete\n`);

  // 8:00 AM — Social captions
  console.log("📱 [8:00 AM] Social: Generating cross-platform posts...");
  const socialResult = await social.execute("multi_platform", {
    topic: "Why most people fail at online business (and how to avoid it)",
  });
  console.log(`   ${socialResult.success ? "✅" : "❌"} All platform posts generated\n`);

  // 12:00 PM — Sales email
  console.log("📧 [12:00 PM] Sales: Sending email sequence...");
  const emailResult = await sales.execute("email_sequence", {
    trigger: "new-subscriber",
    length: 7,
  });
  console.log(`   ${emailResult.success ? "✅" : "❌"} Email sequence generated\n`);

  // 6:00 PM — Finance
  console.log("💰 [6:00 PM] Finance: Logging daily P&L...");
  const pnlResult = await finance.execute("daily_pnl");
  console.log(`   ${pnlResult.success ? "✅" : "❌"} P&L recorded\n`);

  // 9:00 PM — Health check + daily summary
  console.log("🔒 [9:00 PM] Nox: Running health check...");
  const healthResult = await nox.execute("health_check");
  console.log(`   ${healthResult.success ? "✅" : "❌"} Health check complete`);

  console.log("📊 [9:00 PM] Jake: Generating daily summary...");
  const summary = generateDailySummary();
  const telegramMsg = formatSummaryForTelegram(summary);
  console.log(`   Summary: ${summary.completed}/${summary.totalTasks} tasks completed`);

  // Send to Ricardo
  const sent = await sendTelegram(telegramMsg);
  console.log(`   ${sent ? "✅" : "⚠️"} Telegram report ${sent ? "sent" : "skipped (not configured)"}\n`);

  console.log("🏁 Daily cycle complete.");
}

// ── Single Agent Task ───────────────────────────────────────────
async function runAgentTask(agentName: string, task: string, params?: Record<string, unknown>) {
  const agent = AGENTS[agentName];
  if (!agent) {
    console.error(`❌ Unknown agent: ${agentName}. Available: ${Object.keys(AGENTS).join(", ")}`);
    process.exit(1);
  }

  console.log(`🤖 Running ${agentName}.${task}...`);
  const result = await agent.execute(task, params);

  if (result.success) {
    console.log("✅ Task completed successfully.");
    console.log(JSON.stringify(result.output, null, 2));
  } else {
    console.error(`❌ Task failed: ${result.error}`);
  }

  return result;
}

// ── CLI Parser ──────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  await initialize();

  if (args.includes("--daily-run") || args.includes("--daily")) {
    await runDailyCycle();
  } else if (args.includes("--health")) {
    await runAgentTask("nox", "health_check");
  } else if (args.includes("--agent")) {
    const agentIdx = args.indexOf("--agent");
    const taskIdx = args.indexOf("--task");
    const agentName = args[agentIdx + 1];
    const task = taskIdx >= 0 ? args[taskIdx + 1] : "default";
    await runAgentTask(agentName, task);
  } else if (args.includes("--telegram")) {
    const msgIdx = args.indexOf("--telegram");
    const message = args.slice(msgIdx + 1).join(" ");
    if (message) {
      const response = await processCommand(message);
      console.log(response);
    } else {
      console.log("Usage: --telegram <command>");
    }
  } else {
    // Interactive mode — show status
    console.log("─────────────────────────────────────────");
    console.log("  SkillDailyPay AI Media Agency v1.0");
    console.log("─────────────────────────────────────────");
    console.log("");
    console.log("  Commands:");
    console.log("    --daily-run         Run full daily cycle");
    console.log("    --health            System health check");
    console.log("    --agent <name> --task <task>  Run specific agent task");
    console.log("    --telegram <msg>    Process Telegram command");
    console.log("");
    console.log("  Agents:");
    for (const [name, agent] of Object.entries(AGENTS)) {
      console.log(`    ${name.padEnd(12)} ${agent.department}`);
    }
    console.log("");
  }
}

main().catch((err) => {
  console.error("💀 Fatal error:", err.message);
  process.exit(1);
});

export { AGENTS, initialize, runDailyCycle, runAgentTask };
