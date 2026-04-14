/**
 * Jake — CEO Agent Entry Point
 *
 * Two modes:
 *   cli     — Interactive: ask Jake questions, give commands
 *   daemon  — Autonomous: runs scheduler, acts on his own
 *
 * Usage:
 *   npx tsx src/agents/jake/index.ts           # CLI mode (default)
 *   npx tsx src/agents/jake/index.ts --daemon   # Daemon mode
 *   npx tsx src/agents/jake/index.ts --schedule  # Show schedule
 */

import readline from "readline";
import { JakeBrain } from "./brain";
import { tick, printSchedule, listJobs } from "./scheduler";
import { loadState, updateState, createSessionId, logSession, type SessionLog, type SessionMessage, type ToolCallLog } from "./state";
import { readMemory } from "./soul";

// ═══════════════════════════════════════
//  CLI Mode — Interactive
// ═══════════════════════════════════════

async function runCLI(): Promise<void> {
  const brain = new JakeBrain();
  const sessionId = createSessionId();
  const sessionMessages: SessionMessage[] = [];
  const sessionToolCalls: ToolCallLog[] = [];

  updateState({ mode: "cli", startedAt: new Date().toISOString() });

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  JAKE — CEO Agent | SkillDailyPay AI Media Agency      ║");
  console.log("║  Interactive Mode                                       ║");
  console.log("║  Type your message, or:                                 ║");
  console.log("║    /status   — show agent state                         ║");
  console.log("║    /schedule — show scheduled jobs                      ║");
  console.log("║    /memory   — show Jake's memory                       ║");
  console.log("║    /reset    — clear conversation                       ║");
  console.log("║    /quit     — exit                                     ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("close", () => {
    console.log("\nJake: Session ended.\n");
    process.exit(0);
  });

  const prompt = (): void => {
    rl.question("You: ", async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) { prompt(); return; }

      // ── Slash commands ──
      if (trimmed === "/quit" || trimmed === "/exit") {
        console.log("\nJake: Shutting down. See you, Ricardo.\n");
        // Save session
        logSession({
          sessionId,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          mode: "cli",
          messages: sessionMessages,
          toolCalls: sessionToolCalls,
        });
        rl.close();
        process.exit(0);
      }

      if (trimmed === "/status") {
        const state = loadState();
        console.log(`\nJake State:`);
        console.log(`  Mode: ${state.mode}`);
        console.log(`  Total cycles: ${state.totalCyclesRun}`);
        console.log(`  Total tool calls: ${state.totalToolCalls}`);
        console.log(`  Last run: ${state.lastRun || "never"}`);
        console.log(`  Active tasks: ${state.activeTasks.length}\n`);
        prompt();
        return;
      }

      if (trimmed === "/schedule") {
        console.log(`\n${printSchedule()}\n`);
        prompt();
        return;
      }

      if (trimmed === "/memory") {
        const memory = readMemory();
        console.log(`\n${memory}\n`);
        prompt();
        return;
      }

      if (trimmed === "/reset") {
        brain.reset();
        console.log("\nJake: Conversation cleared. Fresh start.\n");
        prompt();
        return;
      }

      // ── Send to Jake's brain ──
      sessionMessages.push({ role: "user", content: trimmed, timestamp: new Date().toISOString() });

      try {
        console.log("\nJake is thinking...\n");
        const result = await brain.run(trimmed);

        console.log(`Jake: ${result.response}\n`);

        if (result.toolCalls.length > 0) {
          console.log(`  [${result.toolCalls.length} tool call(s), ${result.iterations} iteration(s), ${result.totalTokens} tokens]\n`);
        }

        sessionMessages.push({ role: "assistant", content: result.response, timestamp: new Date().toISOString() });
        sessionToolCalls.push(...result.toolCalls);
      } catch (e: any) {
        console.error(`\nError: ${e.message}\n`);
      }

      prompt();
    });
  };

  prompt();
}

// ═══════════════════════════════════════
//  Daemon Mode — Autonomous
// ═══════════════════════════════════════

async function runDaemon(): Promise<void> {
  const brain = new JakeBrain();

  updateState({ mode: "daemon", startedAt: new Date().toISOString() });

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  JAKE — CEO Agent | DAEMON MODE                        ║");
  console.log("║  Running autonomously. Press Ctrl+C to stop.           ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  console.log(printSchedule());
  console.log("\n[daemon] Tick interval: 60 seconds");
  console.log("[daemon] Waiting for scheduled jobs...\n");

  // Run initial tick immediately
  try {
    const executions = await tick(brain);
    if (executions.length > 0) {
      console.log(`[daemon] Initial tick: ${executions.length} job(s) executed`);
    }
  } catch (e: any) {
    console.error(`[daemon] Initial tick error: ${e.message}`);
  }

  // Set up interval — tick every 60 seconds
  const interval = setInterval(async () => {
    try {
      const executions = await tick(brain);
      if (executions.length > 0) {
        for (const exec of executions) {
          console.log(`[daemon] Executed: ${exec.jobName} | Tools: ${exec.result.toolCalls.length} | Response: ${exec.result.response.slice(0, 100)}...`);
        }
      }
    } catch (e: any) {
      console.error(`[daemon] Tick error: ${e.message}`);
    }
  }, 60_000);

  // Graceful shutdown
  const shutdown = () => {
    console.log("\n[daemon] Shutting down Jake...");
    clearInterval(interval);
    updateState({ mode: null });
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// ═══════════════════════════════════════
//  Main
// ═══════════════════════════════════════

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--schedule") || args.includes("-s")) {
    console.log(printSchedule());
    return;
  }

  if (args.includes("--daemon") || args.includes("-d")) {
    await runDaemon();
    return;
  }

  // Default: CLI mode
  await runCLI();
}

main().catch(e => {
  console.error(`Fatal: ${e.message}`);
  process.exit(1);
});
