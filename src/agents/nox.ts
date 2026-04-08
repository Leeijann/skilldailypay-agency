/**
 * NOX — Security & System Health Agent
 * Department: Finance & Operations
 *
 * Responsibilities:
 * - System health monitoring
 * - API key rotation alerts
 * - Security scanning
 * - Uptime monitoring for all services
 * - Alert Ricardo via Telegram for critical issues
 */

import { BaseAgent, AgentConfig, TaskResult } from "./base-agent";
import { runAllHealthChecks, HealthCheck, MONITORED_SERVICES } from "../departments/operations";
import { sendTelegram } from "../departments/command";
import { logEntry } from "../memory/wal-logger";

const SYSTEM_PROMPT = `You are Nox, the security and system health agent at SkillDailyPay AI Media Agency.

Your role:
- Monitor all systems for uptime and performance
- Check API key validity and expiration
- Run security audits on the agency infrastructure
- Alert Ricardo immediately for critical issues
- Generate health reports as part of the daily summary

Monitored services:
${MONITORED_SERVICES.map(s => `- ${s.name} (${s.critical ? "CRITICAL" : "non-critical"})`).join("\n")}

Alert thresholds:
- Service down → CRITICAL → Telegram alert immediately
- Latency >5s → WARNING → Include in daily report
- API key near expiration → WARNING → Alert 7 days before
- Unusual API usage spike → INFO → Log and monitor

Security checks:
- Verify .env file is not exposed
- Check for hardcoded secrets in codebase
- Monitor API usage for anomalies
- Verify all endpoints use HTTPS`;

const config: AgentConfig = {
  name: "nox",
  department: "operations",
  role: "Security & System Health Agent",
  systemPrompt: SYSTEM_PROMPT,
  defaultTaskKey: "nox.health_check",
};

class NoxAgent extends BaseAgent {
  constructor() {
    super(config);
  }

  async execute(task: string, params?: Record<string, unknown>): Promise<TaskResult> {
    switch (task) {
      case "health_check":
        return this.runHealthCheck();
      case "security_scan":
        return this.securityScan();
      case "api_status":
        return this.checkApiStatus();
      default:
        return { success: false, output: {}, error: `Nox doesn't handle: ${task}` };
    }
  }

  private async runHealthCheck(): Promise<TaskResult> {
    const results = await runAllHealthChecks();

    // Check for critical failures
    const criticalDown = results.filter(
      (r) => r.status === "down" && MONITORED_SERVICES.find((s) => s.name === r.service)?.critical
    );

    // Alert Ricardo if anything critical is down
    if (criticalDown.length > 0) {
      const alertMsg = `🚨 *CRITICAL ALERT*\n\nServices DOWN:\n${criticalDown
        .map((r) => `• ${r.service}: ${r.details || "unreachable"}`)
        .join("\n")}`;
      await sendTelegram(alertMsg);
    }

    // Format report
    const report = results
      .map((r) => {
        const icon = r.status === "healthy" ? "✅" : r.status === "degraded" ? "⚠️" : "❌";
        return `${icon} ${r.service}: ${r.status}${r.latencyMs ? ` (${r.latencyMs}ms)` : ""}`;
      })
      .join("\n");

    return {
      success: true,
      output: {
        results,
        report,
        criticalIssues: criticalDown.length,
        allHealthy: results.every((r) => r.status === "healthy"),
      },
    };
  }

  private async securityScan(): Promise<TaskResult> {
    const prompt = `Run a security assessment of the agency infrastructure.

Check for:
1. Environment variable security — are all sensitive keys properly stored?
2. API endpoint security — are we using HTTPS everywhere?
3. Access control — who has access to what?
4. Data handling — are we storing any sensitive user data improperly?
5. Dependency security — any known vulnerabilities?

Provide a security score (A-F) and prioritized recommendations.`;

    const response = await this.call(prompt, "nox.health_check");
    return { success: true, output: { securityReport: response } };
  }

  private async checkApiStatus(): Promise<TaskResult> {
    const apiChecks = [
      { name: "Anthropic (Claude)", configured: !!process.env.ANTHROPIC_API_KEY },
      { name: "Telegram Bot", configured: !!process.env.TELEGRAM_BOT_TOKEN },
      { name: "OpenRouter", configured: !!process.env.OPENROUTER_API_KEY },
      { name: "Brave Search", configured: !!process.env.BRAVE_SEARCH_API_KEY },
      { name: "YouTube", configured: !!process.env.YOUTUBE_API_KEY },
      { name: "TikTok", configured: !!process.env.TIKTOK_ACCESS_TOKEN },
    ];

    const report = apiChecks
      .map((api) => `${api.configured ? "✅" : "❌"} ${api.name}: ${api.configured ? "configured" : "MISSING"}`)
      .join("\n");

    const missing = apiChecks.filter((a) => !a.configured);
    if (missing.length > 0) {
      logEntry("nox", "operations", "api_status", "completed", {
        output: { missingApis: missing.map((a) => a.name) },
      });
    }

    return {
      success: true,
      output: { apiStatus: report, configured: apiChecks.filter((a) => a.configured).length, total: apiChecks.length },
    };
  }
}

export const nox = new NoxAgent();
