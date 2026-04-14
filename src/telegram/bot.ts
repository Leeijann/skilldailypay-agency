/**
 * Telegram Bot — Jake's Gateway to the Real World
 *
 * All messages go through Jake's brain. He thinks, uses tools, and responds.
 * Slash commands provide quick shortcuts.
 *
 * Commands:
 *   /deploy     — Deploy content to all platforms now
 *   /brands     — List all 7 brand niches
 *   /status     — Jake's state & recent activity
 *   /schedule   — View scheduled jobs
 *   /tree       — Org chart
 *   /memory     — Jake's persistent memory
 *   /report     — Generate daily report
 *   /image <p>  — Generate an AI image
 *   /health     — System health check
 *   /help       — All commands
 *   (anything)  — Jake thinks and responds
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

import { JakeBrain } from "../agents/jake/brain";
import { readMemory } from "../agents/jake/soul";
import { loadState } from "../agents/jake/state";
import { printSchedule, loadJobs, tick } from "../agents/jake/scheduler";
import { ORG_CHART, printOrgTree, getByDepartment } from "../orchestrator/org-chart";
import { ALL_BRANDS } from "../config/niches";
import { env } from "../config/env";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Jake's brain — persistent across messages
const jake = new JakeBrain();

// ═══════════════════════════════════════
//  TELEGRAM HELPERS
// ═══════════════════════════════════════

async function send(text: string, parseMode: string = "Markdown"): Promise<boolean> {
  // Telegram max message length is 4096
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= 4000) {
      chunks.push(remaining);
      break;
    }
    // Find a good break point
    let breakAt = remaining.lastIndexOf("\n", 4000);
    if (breakAt < 2000) breakAt = 4000;
    chunks.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt);
  }

  for (const chunk of chunks) {
    try {
      const res = await fetch(`${API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text: chunk, parse_mode: parseMode }),
      });
      if (!res.ok) {
        // Retry without parse mode if markdown fails
        const res2 = await fetch(`${API}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: CHAT_ID, text: chunk }),
        });
        if (!res2.ok) return false;
      }
    } catch { return false; }
  }
  return true;
}

async function sendPhoto(photoUrl: string, caption: string = ""): Promise<boolean> {
  try {
    const res = await fetch(`${API}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, photo: photoUrl, caption: caption.slice(0, 1024) }),
    });
    return res.ok;
  } catch { return false; }
}

async function sendTyping(): Promise<void> {
  try {
    await fetch(`${API}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, action: "typing" }),
    });
  } catch {}
}

// ═══════════════════════════════════════
//  COMMAND PROCESSING
// ═══════════════════════════════════════

async function processCommand(text: string): Promise<void> {
  const trimmed = text.trim();
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1).join(" ");

  switch (cmd) {
    case "/start":
    case "/help": {
      await send(`🚀 *SkillDailyPay AI Media Agency*

*Jake — Your CEO Agent*

*Deploy:*
/deploy — Post to ALL platforms now
/brands — View all 7 brand niches

*Monitor:*
/status — Jake's state & activity
/schedule — Scheduled jobs
/tree — Org chart (30 agents)
/memory — Jake's learned memory
/report — Daily report

*Create:*
/image <prompt> — Generate AI image

*System:*
/health — Health check
/help — This message

Or just type anything — Jake will think and respond.`);
      break;
    }

    case "/deploy": {
      await send("🚀 *Deploying content to all platforms...*\nThis takes ~5-15 minutes (images + videos).\nI'll notify you when it's done.");
      await sendTyping();

      // Run deploy through Jake's brain
      const result = await jake.run(
        "Deploy content to all platforms now. Run deploy_all_content and report back with the results."
      );
      await send(`*Deploy Complete*\n\n${result.response}`);
      break;
    }

    case "/brands": {
      let msg = "🎯 *Brand Niches (7):*\n\n";
      for (const brand of ALL_BRANDS) {
        const platforms = brand.platforms.map(p => p.platform).join(", ");
        msg += `*${brand.brand}*\n`;
        msg += `  Niche: ${brand.niche.split(",")[0].trim()}\n`;
        msg += `  Platforms: ${platforms}\n\n`;
      }
      await send(msg);
      break;
    }

    case "/status": {
      const state = loadState();
      const jobs = loadJobs();
      const totalRuns = jobs.reduce((sum, j) => sum + j.runCount, 0);

      await send(`📊 *Jake — Status*

Mode: ${state.mode || "idle"}
Total cycles: ${state.totalCyclesRun}
Total tool calls: ${state.totalToolCalls}
Last run: ${state.lastRun || "never"}
Active tasks: ${state.activeTasks?.length || 0}
Scheduled jobs: ${jobs.length}
Total job runs: ${totalRuns}

*Last action:*
${state.lastCycleResult || "None yet"}`);
      break;
    }

    case "/schedule": {
      const schedule = printSchedule();
      await send(`⏰ *Schedule*\n\n\`\`\`\n${schedule}\n\`\`\``);
      break;
    }

    case "/tree": {
      const tree = printOrgTree(null);
      const truncated = tree.length > 3800 ? tree.slice(0, 3800) + "\n..." : tree;
      await send(`🏢 *Org Chart*\n\n\`\`\`\n${truncated}\n\`\`\``);
      break;
    }

    case "/memory": {
      const memory = readMemory();
      const truncated = memory.length > 3800 ? memory.slice(0, 3800) + "\n..." : memory;
      await send(`🧠 *Jake's Memory*\n\n${truncated}`);
      break;
    }

    case "/report": {
      await send("📝 Generating daily report...");
      await sendTyping();
      const result = await jake.run(
        "Generate a comprehensive daily report. Check analytics, list all brands, review scheduled jobs, and summarize today's activity. Save key observations to memory."
      );
      await send(`📝 *Daily Report*\n\n${result.response}`);
      break;
    }

    case "/image": {
      if (!args) { await send("Usage: /image <prompt>"); break; }
      await send("🎨 Generating image...");
      await sendTyping();

      try {
        const TOGETHER_KEY = process.env.TOGETHER_API_KEY || "";
        const res = await fetch("https://api.together.xyz/v1/images/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOGETHER_KEY}` },
          body: JSON.stringify({
            model: "black-forest-labs/FLUX.1-schnell",
            prompt: args, n: 1, width: 1024, height: 1024,
          }),
        });
        const d: any = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(d).slice(0, 200));
        const imageUrl = d.data[0].url;
        await sendPhoto(imageUrl, `🎨 ${args}`);
      } catch (e: any) {
        await send(`❌ Image failed: ${e.message.slice(0, 200)}`);
      }
      break;
    }

    case "/health": {
      const checks: string[] = [];
      checks.push("✅ Telegram Bot — Connected");

      const keys: [string, string | undefined][] = [
        ["AISA (AI Models)", env.aisa?.apiKey],
        ["Blotato (Social)", env.blotato?.apiKey],
        ["Together.ai (Images/Video)", process.env.TOGETHER_API_KEY],
        ["Blogger", process.env.BLOGGER_REFRESH_TOKEN],
        ["Systeme.io", process.env.SYSTEMEIO_API_KEY],
      ];

      for (const [name, key] of keys) {
        checks.push(key ? `✅ ${name}` : `❌ ${name} — Not configured`);
      }

      // Check connected Blotato accounts
      try {
        const res = await fetch("https://backend.blotato.com/v2/users/me/accounts", {
          headers: { "blotato-api-key": env.blotato?.apiKey || "" },
        });
        const d: any = await res.json();
        if (d.items) {
          checks.push(`\n*Connected Platforms (${d.items.length}):*`);
          for (const acct of d.items) {
            checks.push(`  ✅ ${acct.platform}: ${acct.username || acct.fullname}`);
          }
        }
      } catch {
        checks.push("⚠️ Could not check Blotato accounts");
      }

      await send(`*System Health*\n\n${checks.join("\n")}`);
      break;
    }

    default: {
      // ── FREEFORM: Jake thinks ──
      await sendTyping();

      try {
        const result = await jake.run(trimmed);

        // Log tool calls
        if (result.toolCalls.length > 0) {
          const tools = result.toolCalls.map(t => t.tool).join(", ");
          console.log(`  [Jake] Used tools: ${tools}`);
        }

        await send(result.response);

        // If Jake generated an image URL in the response, send it as a photo
        const imageMatch = result.response.match(/https:\/\/[^\s]+\.(jpg|jpeg|png|webp)/i);
        if (imageMatch) {
          await sendPhoto(imageMatch[0]);
        }
      } catch (e: any) {
        console.error("Jake error:", e.message);
        await send(`❌ Error: ${e.message.slice(0, 200)}`);
      }
      break;
    }
  }
}

// ═══════════════════════════════════════
//  POLLING LOOP + SCHEDULER
// ═══════════════════════════════════════

let lastUpdateId = 0;

async function pollUpdates() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch(`${API}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data: any = await res.json();

    if (data.ok && data.result) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;
        const msg = update.message;
        if (msg && msg.text && String(msg.chat.id) === CHAT_ID) {
          console.log(`[Telegram] ${msg.from?.first_name}: ${msg.text}`);
          try {
            await processCommand(msg.text);
          } catch (err: any) {
            console.error("Command error:", err.message);
            await send(`❌ Error: ${err.message.slice(0, 300)}`);
          }
        }
      }
    }
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name !== "AbortError") {
      console.error(`Poll error: ${err.message}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// Scheduler tick — runs every 60s to check for due jobs
let schedulerRunning = false;
async function schedulerTick() {
  if (schedulerRunning) return;
  schedulerRunning = true;
  try {
    const executed = await tick(jake);
    if (executed.length > 0) {
      const summary = executed.map(e => `✅ ${e.jobName}: ${e.result.response.slice(0, 100)}`).join("\n");
      await send(`⏰ *Scheduled Jobs Ran:*\n\n${summary}`);
    }
  } catch (e: any) {
    console.error("Scheduler error:", e.message);
  }
  schedulerRunning = false;
}

async function main() {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env");
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  JAKE — Telegram Gateway + Autonomous Scheduler        ║");
  console.log("║  Bot + Brain + Scheduler = Fully Autonomous Agent       ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`Bot token: ...${BOT_TOKEN.slice(-6)}`);
  console.log(`Chat ID: ${CHAT_ID}`);
  console.log(`AISA: ${env.aisa?.baseUrl || "not set"}`);
  console.log(`Blotato: ${env.blotato?.apiKey ? "configured" : "not set"}`);
  console.log("");

  // Send startup message
  await send(`🚀 *Jake Online*

CEO Agent active. 30 agents ready.
Scheduler running — content deploys at 9am, 2pm, 7pm.

Type /help for commands, or just talk to me.`);

  console.log("✅ Startup message sent");
  console.log("🔄 Starting poll loop + scheduler...\n");

  // Start scheduler tick every 60s
  setInterval(schedulerTick, 60_000);

  // Poll loop
  while (true) {
    await pollUpdates();
  }
}

main().catch(e => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
