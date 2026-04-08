/**
 * IVY — Research & Intelligence Agent
 * Department: Research
 *
 * Responsibilities:
 * - Scrape trends from YouTube, X, Reddit, TikTok
 * - Feed trending topics to Nexus and Leeijann daily
 * - Competitive research on Legacy Builders Program competitors
 */

import { BaseAgent, AgentConfig, TaskResult } from "./base-agent";
import { storeTrendReport, storeCompetitorIntel, MONITORED_PLATFORMS, COMPETITORS, TrendItem } from "../departments/research";
import { env } from "../config/env";

const SYSTEM_PROMPT = `You are Ivy, the research and intelligence agent at SkillDailyPay AI Media Agency.

Your role:
- Monitor trends across YouTube, TikTok, X (Twitter), and Reddit
- Identify content opportunities for the team
- Track competitors in the online business education space
- Score and prioritize trends by relevance to our audience

Research focus areas:
- Making money online / passive income
- Online business / digital entrepreneurship
- Affiliate marketing / TikTok Shop
- Side hustles / skill monetization
- Legacy Builders Program competitors

When reporting trends, always include:
1. The trend/topic
2. Which platform it's trending on
3. A relevance score (1-10) for our audience
4. A suggested content angle for our team
5. Source/evidence

Competitors to monitor:
${COMPETITORS.map(c => `- ${c}`).join("\n")}

Output structured data that can be directly consumed by Nexus (video), Leeijann (blog), and Social (posts).`;

const config: AgentConfig = {
  name: "ivy",
  department: "research",
  role: "Research & Intelligence Agent",
  systemPrompt: SYSTEM_PROMPT,
  defaultTaskKey: "ivy.trend_report",
};

class IvyAgent extends BaseAgent {
  constructor() {
    super(config);
  }

  async execute(task: string, params?: Record<string, unknown>): Promise<TaskResult> {
    switch (task) {
      case "trend_research":
        return this.researchTrends(params?.platform as string);
      case "competitor_analysis":
        return this.analyzeCompetitor(params?.competitor as string);
      case "daily_brief":
        return this.generateDailyBrief();
      default:
        return { success: false, output: {}, error: `Ivy doesn't handle: ${task}` };
    }
  }

  private async researchTrends(platform?: string): Promise<TaskResult> {
    const platforms = platform
      ? MONITORED_PLATFORMS.filter(p => p.name.toLowerCase() === platform.toLowerCase())
      : MONITORED_PLATFORMS;

    const prompt = `Research current trending topics relevant to our niche across these platforms:

${platforms.map(p => `${p.name}: Search for topics related to ${p.searchTerms.join(", ")}`).join("\n\n")}

For each platform, identify 5-7 trending topics and format as:

PLATFORM: [name]
TRENDS:
1. Topic: [topic name]
   Score: [1-10 relevance to making money online / Legacy Builders audience]
   Source: [where you found it]
   Angle: [how we should cover this - video idea, blog angle, or post hook]

Focus on topics that are:
- Currently gaining momentum (not played out)
- Relevant to our audience (aspiring entrepreneurs, 25-45)
- Good for driving traffic to Legacy Builders Program
- Suitable for at least one of our content formats`;

    const response = await this.call(prompt, "ivy.trend_report");

    // Store trends in ELMS
    const date = new Date().toISOString().split("T")[0];
    for (const p of platforms) {
      storeTrendReport({
        date,
        platform: p.name,
        trends: [], // Would be parsed from response in production
      });
    }

    return { success: true, output: { trendReport: response, platforms: platforms.map(p => p.name) } };
  }

  private async analyzeCompetitor(competitor?: string): Promise<TaskResult> {
    const targets = competitor ? [competitor] : COMPETITORS;

    const prompt = `Analyze these competitors in the online business education space:

${targets.map(c => `- ${c}`).join("\n")}

For each competitor, provide:
1. POSITIONING: How they position their product/brand
2. CONTENT STRATEGY: What platforms they focus on, posting frequency, content types
3. STRENGTHS: What they do well
4. WEAKNESSES: Where they fall short
5. OPPORTUNITIES: How Legacy Builders Program can differentiate
6. RECENT MOVES: Any new products, campaigns, or pivots

Focus on actionable insights we can use to improve our content and positioning.`;

    const response = await this.call(prompt, "ivy.competitor_analysis");
    return { success: true, output: { competitorAnalysis: response, competitors: targets } };
  }

  private async generateDailyBrief(): Promise<TaskResult> {
    const prompt = `Generate today's intelligence brief for the SkillDailyPay content team.

Include:
1. TOP 5 CONTENT OPPORTUNITIES — ranked by potential impact
2. TRENDING FORMATS — what content formats are performing well right now
3. COMPETITOR ALERTS — any notable moves from competitors
4. AUDIENCE INSIGHTS — what our target audience is talking about today
5. RECOMMENDED TOPICS — specific topics for each agent:
   - For Nexus (video): 2 YouTube ideas + 1 TikTok idea
   - For Leeijann (blog): 1 blog topic + 1 Pinterest angle
   - For Social (posts): 3 post hooks for today

Make every recommendation specific and actionable.`;

    const response = await this.call(prompt, "ivy.trend_report");
    this.noteEpisodic("daily_brief", response, 24);
    return { success: true, output: { dailyBrief: response } };
  }
}

export const ivy = new IvyAgent();
