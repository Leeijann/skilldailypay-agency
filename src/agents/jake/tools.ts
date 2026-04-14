/**
 * Jake — Tool Definitions & Executors
 * Each tool maps to an agency capability Jake can invoke.
 * Uses OpenAI function calling format for the AISA API.
 */

import { env } from "../../config/env";
import { ALL_BRANDS, getBrand, getRandomTopic, type BrandNiche } from "../../config/niches";
import { ORG_CHART, printOrgTree, getDirectReports, getAgent } from "../../orchestrator/org-chart";
import { appendMemory, readMemory } from "./soul";
import { saveReport, loadState, updateState } from "./state";

// ═══════════════════════════════════════
//  Tool Definition Types
// ═══════════════════════════════════════

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ToolExecutor {
  (args: Record<string, any>): Promise<string>;
}

// ═══════════════════════════════════════
//  AISA Helper (for content generation within tools)
// ═══════════════════════════════════════

async function aisaChat(systemPrompt: string, userPrompt: string, maxTokens: number = 500): Promise<string> {
  const res = await fetch(`${env.aisa.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.aisa.apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.8,
    }),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(`AISA error ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data.choices?.[0]?.message?.content || "(no response)";
}

// ═══════════════════════════════════════
//  Blotato Helper
// ═══════════════════════════════════════

async function blotatoGet(path: string): Promise<any> {
  const res = await fetch(`${env.blotato.baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "blotato-api-key": env.blotato.apiKey,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Blotato GET ${path} -> ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

// ═══════════════════════════════════════
//  Tool: deploy_all_content
// ═══════════════════════════════════════

const deployAllContentDef: ToolDefinition = {
  type: "function",
  function: {
    name: "deploy_all_content",
    description: "Triggers a full agency content deploy — generates niche-specific content for ALL 7 brands and posts to all their platforms. This runs the deploy-all.ts script. Takes several minutes due to video generation.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

async function deployAllContent(_args: Record<string, any>): Promise<string> {
  try {
    const { execSync } = await import("child_process");
    const output = execSync("npx tsx deploy-all.ts", {
      cwd: process.cwd(),
      timeout: 900000, // 15 min max
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const lines = output.split("\n").filter(l => l.includes("✅") || l.includes("❌") || l.includes("REPORT"));
    return `Deploy completed.\n${lines.join("\n") || output.slice(-500)}`;
  } catch (e: any) {
    return `Deploy failed: ${e.message?.slice(0, 300) || "unknown error"}`;
  }
}

// ═══════════════════════════════════════
//  Tool: deploy_brand
// ═══════════════════════════════════════

const deployBrandDef: ToolDefinition = {
  type: "function",
  function: {
    name: "deploy_brand",
    description: "Deploys content for a specific brand only. Generates niche-specific content and posts to that brand's platforms.",
    parameters: {
      type: "object",
      properties: {
        brand_id: {
          type: "string",
          description: "Brand ID (e.g. 'skilldailypay', 'leeijann', 'smoothcut', 'tiktok-ironrive', 'tiktok-trendz', 'yt-adorable', 'yt-health')",
          enum: ALL_BRANDS.map(b => b.id),
        },
      },
      required: ["brand_id"],
    },
  },
};

async function deployBrand(args: Record<string, any>): Promise<string> {
  const brand = getBrand(args.brand_id);
  if (!brand) return `Error: Unknown brand ID '${args.brand_id}'. Valid IDs: ${ALL_BRANDS.map(b => b.id).join(", ")}`;

  try {
    const topic = getRandomTopic(brand);
    // Generate caption for the first platform as a proof of concept
    const caption = await aisaChat(
      `You write ${brand.platforms[0]?.platform || "social media"} content for "${brand.brand}".
NICHE: ${brand.niche}
TONE: ${brand.tone}
STYLE: ${brand.style}
FORMAT: ${brand.platforms[0]?.format || "200 words max"}`,
      `Write a post about: ${topic}`,
      300,
    );

    // Post via Blotato to each platform
    const results: string[] = [];
    for (const target of brand.platforms) {
      if (target.platform === "blogger") {
        results.push(`  blogger: skipped (requires separate flow)`);
        continue;
      }
      try {
        const postCaption = await aisaChat(
          `You write ${target.platform} content for "${brand.brand}".
NICHE: ${brand.niche}
TONE: ${brand.tone}
FORMAT: ${target.format}`,
          `Write a ${target.platform} post about: ${topic}`,
          300,
        );

        const body: any = {
          post: {
            accountId: target.accountId,
            content: { text: postCaption, platform: target.platform },
            target: { targetType: target.platform } as any,
          },
        };
        if (target.pageId) body.post.target.pageId = target.pageId;

        const res = await fetch("https://backend.blotato.com/v2/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "blotato-api-key": env.blotato.apiKey,
          },
          body: JSON.stringify(body),
        });
        const ok = res.ok;
        results.push(`  ${target.platform} (${target.accountName}): ${ok ? "posted" : `failed ${res.status}`}`);
      } catch (e: any) {
        results.push(`  ${target.platform} (${target.accountName}): error - ${e.message.slice(0, 80)}`);
      }
    }
    return `Deployed ${brand.brand} | Topic: "${topic}"\n${results.join("\n")}`;
  } catch (e: any) {
    return `Deploy brand ${args.brand_id} failed: ${e.message.slice(0, 200)}`;
  }
}

// ═══════════════════════════════════════
//  Tool: check_post_status
// ═══════════════════════════════════════

const checkPostStatusDef: ToolDefinition = {
  type: "function",
  function: {
    name: "check_post_status",
    description: "Checks recent post statuses by listing connected Blotato accounts and their status.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

async function checkPostStatus(_args: Record<string, any>): Promise<string> {
  try {
    const accounts = await blotatoGet("/users/me/accounts");
    if (!Array.isArray(accounts)) return `Blotato response: ${JSON.stringify(accounts).slice(0, 300)}`;

    const summary = accounts.map((a: any) => {
      return `  ${a.platform || "?"} | ${a.name || a.accountName || "?"} (ID: ${a.id || "?"}) | Status: ${a.status || "connected"}`;
    }).join("\n");

    return `Connected accounts (${accounts.length}):\n${summary}`;
  } catch (e: any) {
    return `Failed to check status: ${e.message.slice(0, 200)}`;
  }
}

// ═══════════════════════════════════════
//  Tool: generate_content_idea
// ═══════════════════════════════════════

const generateContentIdeaDef: ToolDefinition = {
  type: "function",
  function: {
    name: "generate_content_idea",
    description: "Generates a new content topic/idea for a specific brand niche using AI.",
    parameters: {
      type: "object",
      properties: {
        brand_id: {
          type: "string",
          description: "Brand ID to generate content idea for",
          enum: ALL_BRANDS.map(b => b.id),
        },
      },
      required: ["brand_id"],
    },
  },
};

async function generateContentIdea(args: Record<string, any>): Promise<string> {
  const brand = getBrand(args.brand_id);
  if (!brand) return `Unknown brand: ${args.brand_id}`;

  const existingTopics = brand.topics.join("\n- ");
  const idea = await aisaChat(
    `You are a content strategist for "${brand.brand}".
NICHE: ${brand.niche}
TONE: ${brand.tone}
Existing topics for reference (do NOT repeat these):
- ${existingTopics}`,
    `Generate 3 fresh, unique content topic ideas for ${brand.brand}. Each should be specific and actionable. Format: numbered list.`,
    300,
  );

  return `Content ideas for ${brand.brand}:\n${idea}`;
}

// ═══════════════════════════════════════
//  Tool: check_analytics
// ═══════════════════════════════════════

const checkAnalyticsDef: ToolDefinition = {
  type: "function",
  function: {
    name: "check_analytics",
    description: "Checks analytics and performance metrics. Currently returns state-based metrics (post counts, cycle history). Platform-specific analytics coming soon.",
    parameters: {
      type: "object",
      properties: {
        brand_id: {
          type: "string",
          description: "Optional brand ID to check analytics for. Omit for agency-wide overview.",
        },
      },
    },
  },
};

async function checkAnalytics(args: Record<string, any>): Promise<string> {
  const state = loadState();
  const brandId = args.brand_id;

  let report = `Agency Analytics Overview:\n`;
  report += `  Total cycles run: ${state.totalCyclesRun}\n`;
  report += `  Total tool calls: ${state.totalToolCalls}\n`;
  report += `  Last run: ${state.lastRun || "never"}\n`;
  report += `  Active tasks: ${state.activeTasks.length}\n`;

  if (brandId) {
    const brand = getBrand(brandId);
    if (brand) {
      report += `\n  Brand: ${brand.brand}\n`;
      report += `  Platforms: ${brand.platforms.map(p => p.platform).join(", ")}\n`;
      report += `  Note: Detailed platform analytics (views, engagement, followers) will be available once analytics API integration is complete.\n`;
    }
  }

  return report;
}

// ═══════════════════════════════════════
//  Tool: send_report
// ═══════════════════════════════════════

const sendReportDef: ToolDefinition = {
  type: "function",
  function: {
    name: "send_report",
    description: "Generates and saves a daily agency report summarizing actions, successes, failures, and insights.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "A markdown-formatted summary of today's agency activity.",
        },
      },
      required: ["summary"],
    },
  },
};

async function sendReport(args: Record<string, any>): Promise<string> {
  const state = loadState();
  const date = new Date().toISOString().slice(0, 10);

  const report = `# Jake's Daily Report — ${date}

## Summary
${args.summary}

## Metrics
- Total cycles run: ${state.totalCyclesRun}
- Total tool calls: ${state.totalToolCalls}
- Active tasks: ${state.activeTasks.length}
- Mode: ${state.mode || "unknown"}

## Brands
${ALL_BRANDS.map(b => `- **${b.brand}** (${b.id}): ${b.platforms.length} platform(s)`).join("\n")}

---
*Generated by Jake at ${new Date().toISOString()}*
`;

  const file = saveReport(report);
  return `Report saved: ${file}`;
}

// ═══════════════════════════════════════
//  Tool: update_memory
// ═══════════════════════════════════════

const updateMemoryDef: ToolDefinition = {
  type: "function",
  function: {
    name: "update_memory",
    description: "Saves an observation, fact, or pattern to Jake's persistent memory file. Use this to remember important things across sessions.",
    parameters: {
      type: "object",
      properties: {
        observation: {
          type: "string",
          description: "The fact, pattern, or observation to remember.",
        },
      },
      required: ["observation"],
    },
  },
};

async function updateMemory(args: Record<string, any>): Promise<string> {
  appendMemory(args.observation);
  return `Memory updated: "${args.observation}"`;
}

// ═══════════════════════════════════════
//  Tool: read_org_chart
// ═══════════════════════════════════════

const readOrgChartDef: ToolDefinition = {
  type: "function",
  function: {
    name: "read_org_chart",
    description: "Returns the full agency org chart showing all agents, their roles, departments, and reporting lines.",
    parameters: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "Optional agent ID to see that agent's details and direct reports. Omit for full tree.",
        },
      },
    },
  },
};

async function readOrgChart(args: Record<string, any>): Promise<string> {
  if (args.agent_id) {
    const agent = getAgent(args.agent_id);
    if (!agent) return `Agent not found: ${args.agent_id}`;
    const reports = getDirectReports(args.agent_id);
    let out = `Agent: ${agent.name}\n  Role: ${agent.role}\n  Department: ${agent.department}\n  Reports to: ${agent.reportsTo || "nobody (top level)"}\n  Model: ${agent.model}\n  Capabilities: ${agent.capabilities.join(", ")}\n  Platforms: ${agent.platforms.join(", ") || "none"}\n  Status: ${agent.status}`;
    if (reports.length > 0) {
      out += `\n\n  Direct reports (${reports.length}):\n`;
      out += reports.map(r => `    - ${r.name} [${r.role}] (${r.model})`).join("\n");
    }
    return out;
  }

  const tree = printOrgTree(null);
  return `Agency Org Chart (${ORG_CHART.length} agents):\n${tree}`;
}

// ═══════════════════════════════════════
//  Tool: list_brands
// ═══════════════════════════════════════

const listBrandsDef: ToolDefinition = {
  type: "function",
  function: {
    name: "list_brands",
    description: "Returns all 7 brand niches with their topics, platforms, tone, and status.",
    parameters: {
      type: "object",
      properties: {
        brand_id: {
          type: "string",
          description: "Optional brand ID for detailed info on a specific brand.",
        },
      },
    },
  },
};

async function listBrands(args: Record<string, any>): Promise<string> {
  if (args.brand_id) {
    const brand = getBrand(args.brand_id);
    if (!brand) return `Unknown brand: ${args.brand_id}. Valid IDs: ${ALL_BRANDS.map(b => b.id).join(", ")}`;
    return `Brand: ${brand.brand} (${brand.id})
Niche: ${brand.niche}
Tone: ${brand.tone}
Style: ${brand.style}
Hashtags: ${brand.hashtags.join(", ")}
Platforms:
${brand.platforms.map(p => `  - ${p.platform}: ${p.accountName} (ID: ${p.accountId}) | Format: ${p.format}`).join("\n")}
Sample topics:
${brand.topics.map(t => `  - ${t}`).join("\n")}`;
  }

  return ALL_BRANDS.map(b => {
    const platforms = b.platforms.map(p => p.platform).join(", ");
    return `- ${b.brand} (${b.id}): ${b.niche.split(",")[0].trim()} | ${platforms}`;
  }).join("\n");
}

// ═══════════════════════════════════════
//  EXPORTS — Tool Registry
// ═══════════════════════════════════════

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  deployAllContentDef,
  deployBrandDef,
  checkPostStatusDef,
  generateContentIdeaDef,
  checkAnalyticsDef,
  sendReportDef,
  updateMemoryDef,
  readOrgChartDef,
  listBrandsDef,
];

export const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  deploy_all_content: deployAllContent,
  deploy_brand: deployBrand,
  check_post_status: checkPostStatus,
  generate_content_idea: generateContentIdea,
  check_analytics: checkAnalytics,
  send_report: sendReport,
  update_memory: updateMemory,
  read_org_chart: readOrgChart,
  list_brands: listBrands,
};

/**
 * Execute a tool by name with given arguments.
 * Returns the result string.
 */
export async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  const executor = TOOL_EXECUTORS[name];
  if (!executor) return `Unknown tool: ${name}. Available: ${Object.keys(TOOL_EXECUTORS).join(", ")}`;

  const start = Date.now();
  try {
    const result = await executor(args);
    const ms = Date.now() - start;
    console.log(`  [tool] ${name} completed in ${ms}ms`);
    return result;
  } catch (e: any) {
    const ms = Date.now() - start;
    console.log(`  [tool] ${name} failed in ${ms}ms: ${e.message.slice(0, 100)}`);
    return `Tool '${name}' error: ${e.message}`;
  }
}
