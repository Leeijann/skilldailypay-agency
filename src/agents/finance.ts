/**
 * FINANCE — Revenue & Expense Tracking Agent
 * Department: Finance & Operations
 *
 * Responsibilities:
 * - Revenue tracking across all channels
 * - Expense tracking (API costs, tools, subscriptions)
 * - Daily P&L summaries
 * - Monthly financial reports
 */

import { BaseAgent, AgentConfig, TaskResult } from "./base-agent";
import { logRevenue, logExpense, getDailyPnl } from "../departments/operations";

const SYSTEM_PROMPT = `You are Finance, the revenue and expense tracking agent at SkillDailyPay AI Media Agency.

Your role:
- Track all revenue across Legacy Builders, TikTok Shop, affiliate commissions, and Silix products
- Monitor expenses including API costs, subscriptions, and tools
- Generate daily P&L summaries
- Create monthly financial reports for Ricardo

Revenue sources:
- Legacy Builders Program sales (skilldailypay.com)
- TikTok affiliate commissions
- Silix LLC product sales (Amazon, TikTok Shop)
- Ad revenue (YouTube)

Expense categories:
- AI/API costs (Claude, OpenRouter, Brave Search)
- Platform subscriptions (n8n, hosting, domains)
- Marketing spend (ads, paid promotion)
- Tools and software
- Contractor/VA costs

Always report in USD. Include crypto tracking when applicable.
Be precise with numbers. Flag any anomalies or unusual spending.`;

const config: AgentConfig = {
  name: "finance",
  department: "operations",
  role: "Revenue & Expense Tracking Agent",
  systemPrompt: SYSTEM_PROMPT,
  defaultTaskKey: "finance.log_entry",
};

class FinanceAgent extends BaseAgent {
  constructor() {
    super(config);
  }

  async execute(task: string, params?: Record<string, unknown>): Promise<TaskResult> {
    switch (task) {
      case "log_revenue":
        return this.recordRevenue(params as any);
      case "log_expense":
        return this.recordExpense(params as any);
      case "daily_pnl":
        return this.dailyPnl(params?.date as string);
      case "monthly_report":
        return this.monthlyReport(params?.month as string);
      default:
        return { success: false, output: {}, error: `Finance doesn't handle: ${task}` };
    }
  }

  private async recordRevenue(params: { source: string; amount: number; notes?: string }): Promise<TaskResult> {
    const date = new Date().toISOString().split("T")[0];
    logRevenue({ date, source: params.source, amount: params.amount, currency: "USD", notes: params.notes });
    return { success: true, output: { recorded: true, source: params.source, amount: params.amount } };
  }

  private async recordExpense(params: { category: string; amount: number; description: string }): Promise<TaskResult> {
    const date = new Date().toISOString().split("T")[0];
    logExpense({ date, category: params.category, amount: params.amount, currency: "USD", description: params.description });
    return { success: true, output: { recorded: true, category: params.category, amount: params.amount } };
  }

  private async dailyPnl(date?: string): Promise<TaskResult> {
    const targetDate = date || new Date().toISOString().split("T")[0];
    const pnl = getDailyPnl(targetDate);

    const summary = `Daily P&L for ${targetDate}:\nRevenue: $${pnl.revenue.toFixed(2)}\nExpenses: $${pnl.expenses.toFixed(2)}\nNet: $${pnl.net.toFixed(2)}`;

    return { success: true, output: { ...pnl, date: targetDate, summary } };
  }

  private async monthlyReport(month?: string): Promise<TaskResult> {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const prompt = `Generate a monthly financial report for ${targetMonth}.

Analyze the available financial data and provide:
1. REVENUE SUMMARY — total by source
2. EXPENSE SUMMARY — total by category
3. NET PROFIT/LOSS
4. TOP REVENUE SOURCES — ranked
5. COST OPTIMIZATION — where we can cut spending
6. GROWTH TRENDS — month-over-month comparisons
7. RECOMMENDATIONS — for next month

Format as a clean, readable report for Ricardo.`;

    const response = await this.call(prompt, "finance.monthly_report");
    return { success: true, output: { monthlyReport: response, month: targetMonth } };
  }
}

export const finance = new FinanceAgent();
