/**
 * COMMAND CENTER — Department 1
 * Runs the whole operation. Jake lives here.
 *
 * Responsibilities:
 * - Task routing and orchestration
 * - WAL/ELMS memory management
 * - Daily reports to Ricardo via Telegram
 * - Cross-department coordination
 */

import { jake } from "../agents/jake";
import { logEntry } from "../memory/wal-logger";
import { env } from "../config/env";

export interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: "Markdown" | "HTML";
}

/** Send a message to Ricardo via Telegram */
export async function sendTelegram(text: string): Promise<boolean> {
  if (!env.telegram.botToken || !env.telegram.chatId) {
    logEntry("jake", "command", "telegram_send", "skipped", {
      error: "Telegram not configured",
    });
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${env.telegram.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.telegram.chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    const ok = response.ok;
    logEntry("jake", "command", "telegram_send", ok ? "completed" : "failed", {
      output: { statusCode: response.status },
    });
    return ok;
  } catch (err: any) {
    logEntry("jake", "command", "telegram_send", "failed", {
      error: err.message,
    });
    return false;
  }
}

/** Process an incoming command from Ricardo via Telegram */
export async function processCommand(command: string): Promise<string> {
  // Normalize: Git Bash expands /command to full paths, so extract the command name
  let normalized = command.trim();
  normalized = normalized.replace(/^[A-Za-z]:[\/\\].*[\/\\]([a-zA-Z_]+)/, "/$1");
  const parts = normalized.split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1).join(" ");

  switch (cmd) {
    case "/status":
      const summary = await jake.execute("daily_summary");
      return (summary.output.telegramMessage as string) || "No activity yet today.";

    case "/plan":
      const plan = await jake.execute("daily_plan");
      return (plan.output.plan as string) || "Could not generate plan.";

    case "/assign": {
      const [taskType, ...rest] = args.split(" ");
      try {
        const assignment = jake.routeTask(taskType, { notes: rest.join(" ") });
        return `✅ Assigned ${taskType} to ${assignment.agent} (${assignment.department})`;
      } catch (err: any) {
        return `❌ ${err.message}`;
      }
    }

    case "/agents":
      return `🤖 Active Agents:\n• Jake (Command)\n• Nexus (Content)\n• Leeijann (Content)\n• Ivy (Research)\n• Social (Content)\n• Sales (Revenue)\n• Finance (Ops)\n• Nox (Ops)\n• Silix (Ops)`;

    case "/help":
      return `📋 Commands:\n/status — Daily summary\n/plan — Generate daily plan\n/assign <task> — Assign a task\n/agents — List all agents\n/help — This message`;

    default:
      // Freeform text — route through Jake's AI
      const response = await jake.call(
        `Ricardo sent this message via Telegram: "${command}". Interpret and respond appropriately.`,
        "jake.strategy"
      );
      return response;
  }
}
