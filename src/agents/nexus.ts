/**
 * NEXUS — Video Content Agent
 * Department: Content & Media
 *
 * Responsibilities:
 * - YouTube long-form scripts (4 channels)
 * - YouTube Shorts briefs
 * - TikTok video scripts
 * - Editing briefs for video team
 */

import { BaseAgent, AgentConfig, TaskResult } from "./base-agent";
import { ContentBrief } from "../departments/content";
import { getLatestTrends } from "../departments/research";

const SYSTEM_PROMPT = `You are Nexus, the video content agent at SkillDailyPay AI Media Agency.

Your role:
- Write compelling YouTube scripts that educate and convert
- Create TikTok scripts optimized for short attention spans
- Generate YouTube Shorts briefs (under 60 seconds)
- Include hooks, retention techniques, and strong CTAs

Content guidelines:
- Primary product: Legacy Builders Program (skilldailypay.com)
- Tone: Confident, educational, results-driven. Not hype-y or scammy.
- Every video must deliver genuine value before the CTA
- Hook viewers in the first 3 seconds
- Use pattern interrupts to maintain retention
- End with a clear CTA to Legacy Builders Program

YouTube channels: 4 channels covering online business, passive income, skill building, and digital entrepreneurship.

Output formats:
- YouTube Script: Hook → Intro → Main Content (3-5 sections) → CTA → Outro
- TikTok Script: Hook (1-2s) → Problem (3-5s) → Solution (10-15s) → CTA (3-5s)
- Shorts Brief: Hook → Single Tip/Insight → CTA (under 60s total)
- Editing Brief: Scene descriptions, B-roll suggestions, text overlays, music mood`;

const config: AgentConfig = {
  name: "nexus",
  department: "content",
  role: "Video Content Agent",
  systemPrompt: SYSTEM_PROMPT,
  defaultTaskKey: "nexus.youtube_script",
};

class NexusAgent extends BaseAgent {
  constructor() {
    super(config);
  }

  async execute(task: string, params?: Record<string, unknown>): Promise<TaskResult> {
    switch (task) {
      case "youtube_script":
        return this.generateYouTubeScript(params?.topic as string, params?.channel as string);
      case "tiktok_script":
        return this.generateTikTokScript(params?.topic as string, params?.productUrl as string);
      case "shorts_brief":
        return this.generateShortsBrief(params?.topic as string);
      case "editing_brief":
        return this.generateEditingBrief(params?.script as string);
      default:
        return { success: false, output: {}, error: `Nexus doesn't handle: ${task}` };
    }
  }

  private async generateYouTubeScript(topic: string, channel?: string): Promise<TaskResult> {
    const trends = getLatestTrends("YouTube");
    const trendContext = trends.length > 0
      ? `\nTrending topics to consider weaving in:\n${trends.slice(0, 3).map(t => `- ${t.topic} (score: ${t.score})`).join("\n")}`
      : "";

    const prompt = `Write a full YouTube script for the topic: "${topic}"
${channel ? `Channel: ${channel}` : ""}
${trendContext}

Format:
TITLE: [SEO-optimized title]
THUMBNAIL TEXT: [2-4 words for thumbnail]
HOOK: [First 10 seconds - must grab attention]
INTRO: [30 seconds - establish credibility and preview value]
SECTION 1: [Main teaching point 1]
SECTION 2: [Main teaching point 2]
SECTION 3: [Main teaching point 3]
CTA: [Legacy Builders Program pitch - natural, not forced]
OUTRO: [Subscribe + next video tease]

TAGS: [10 relevant YouTube tags]
DESCRIPTION: [SEO description with links]`;

    const response = await this.call(prompt, "nexus.youtube_script");
    return { success: true, output: { script: response, platform: "youtube", topic } };
  }

  private async generateTikTokScript(topic: string, productUrl?: string): Promise<TaskResult> {
    const trends = getLatestTrends("TikTok");
    const trendContext = trends.length > 0
      ? `\nTrending on TikTok right now:\n${trends.slice(0, 3).map(t => `- ${t.topic}`).join("\n")}`
      : "";

    const prompt = `Write a TikTok video script for: "${topic}"
${productUrl ? `Product link: ${productUrl}` : ""}
${trendContext}

Format:
HOOK (0-2s): [Pattern interrupt - text on screen + spoken word]
PROBLEM (2-5s): [Relatable pain point]
SOLUTION (5-20s): [Value delivery - teach something real]
PROOF (20-25s): [Social proof or result]
CTA (25-30s): [Link in bio / Legacy Builders / product]

CAPTION: [With hashtags]
SOUNDS: [Trending sound suggestion if applicable]`;

    const response = await this.call(prompt, "nexus.tiktok_script");
    return { success: true, output: { script: response, platform: "tiktok", topic } };
  }

  private async generateShortsBrief(topic: string): Promise<TaskResult> {
    const prompt = `Write a YouTube Shorts brief (under 60 seconds) for: "${topic}"

Format:
TITLE: [Catchy, curiosity-driven]
HOOK (0-3s): [Must stop the scroll]
CONTENT (3-50s): [One focused tip or insight, fast-paced]
CTA (50-60s): [Subscribe + check link in description]
TEXT OVERLAYS: [Key phrases to appear on screen]`;

    const response = await this.call(prompt, "nexus.shorts_brief");
    return { success: true, output: { brief: response, platform: "youtube_shorts", topic } };
  }

  private async generateEditingBrief(script: string): Promise<TaskResult> {
    const prompt = `Create a detailed editing brief for this script:

${script}

Include:
- Scene-by-scene breakdown with timestamps
- B-roll suggestions for each section
- Text overlay placements and content
- Music mood/energy per section
- Transition types between sections
- Thumbnail concept (composition, colors, text)`;

    const response = await this.call(prompt, "nexus.youtube_script");
    return { success: true, output: { editingBrief: response } };
  }
}

export const nexus = new NexusAgent();
