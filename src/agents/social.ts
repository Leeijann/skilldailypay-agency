/**
 * SOCIAL — Cross-Platform Social Media Agent
 * Department: Content & Media
 *
 * Responsibilities:
 * - Captions, posts, threads across all 7 platforms
 * - Instagram Reels, carousels, stories
 * - Facebook posts, group content
 * - X (Twitter) threads and hooks
 * - LinkedIn authority content
 */

import { BaseAgent, AgentConfig, TaskResult } from "./base-agent";
import { PLATFORMS } from "../config/platforms";

const SYSTEM_PROMPT = `You are Social, the cross-platform social media agent at SkillDailyPay AI Media Agency.

Your role:
- Generate engaging captions and posts for all social platforms
- Adapt content to each platform's unique style and algorithm
- Drive engagement and traffic to Legacy Builders Program
- Maintain consistent brand voice across all channels

Platform-specific rules:
- Instagram: Visual-first, use line breaks, 20-30 hashtags, carousel hooks, story CTAs
- Facebook: Longer form ok, encourage comments/shares, group engagement
- X (Twitter): Sharp hooks, threads for authority, under 280 chars per tweet
- LinkedIn: Professional tone, industry insights, longer posts perform well
- Pinterest: Handled by Leeijann

Content pillars:
1. Education — teach something valuable about online business
2. Inspiration — success stories, mindset, motivation
3. Behind-the-scenes — authenticity, daily life, process
4. Engagement — questions, polls, controversies (tasteful)
5. Conversion — direct CTA to Legacy Builders Program (max 20% of posts)

Brand voice: Confident but not arrogant. Educational but not boring. Real but not unprofessional.
Always provide value before asking for anything.`;

const config: AgentConfig = {
  name: "social",
  department: "content",
  role: "Cross-Platform Social Media Agent",
  systemPrompt: SYSTEM_PROMPT,
  defaultTaskKey: "social.caption",
};

class SocialAgent extends BaseAgent {
  constructor() {
    super(config);
  }

  async execute(task: string, params?: Record<string, unknown>): Promise<TaskResult> {
    switch (task) {
      case "caption":
        return this.generateCaption(params?.platform as string, params?.topic as string);
      case "multi_platform":
        return this.generateAllPlatforms(params?.topic as string);
      case "thread":
        return this.generateThread(params?.topic as string, params?.platform as string);
      case "carousel":
        return this.generateCarousel(params?.topic as string);
      default:
        return { success: false, output: {}, error: `Social doesn't handle: ${task}` };
    }
  }

  private async generateCaption(platform: string, topic: string): Promise<TaskResult> {
    const platConfig = PLATFORMS[platform];
    const prompt = `Write a ${platform} post about: "${topic}"

Platform: ${platConfig?.name || platform}
Max length: ${platConfig?.maxLength || "no limit"} characters
Content types: ${platConfig?.contentTypes?.join(", ") || "post"}

Include:
- Hook (first line must stop the scroll)
- Value (teach or inspire)
- CTA (engagement or Legacy Builders)
- Hashtags (platform-appropriate count)
- Emoji usage (natural, not excessive)`;

    const response = await this.call(prompt, "social.caption");
    return { success: true, output: { caption: response, platform, topic } };
  }

  private async generateAllPlatforms(topic: string): Promise<TaskResult> {
    const prompt = `Create posts for ALL social platforms about: "${topic}"

Generate one post per platform, each adapted to the platform's style:

## INSTAGRAM
[Caption with line breaks, hashtags, emoji]

## FACEBOOK
[Longer form, engagement-focused]

## X (TWITTER)
[Thread: 3-5 tweets, hook first, each under 280 chars]

## LINKEDIN
[Professional, authority-building, longer form]

Each post should:
- Have a unique hook (don't repeat the same opening)
- Deliver the core message differently per platform
- Include platform-appropriate hashtags and formatting
- End with a CTA (mix of engagement CTAs and Legacy Builders CTAs)`;

    const response = await this.call(prompt, "social.caption");
    return { success: true, output: { posts: response, topic, platforms: ["instagram", "facebook", "twitter", "linkedin"] } };
  }

  private async generateThread(topic: string, platform: string = "twitter"): Promise<TaskResult> {
    const prompt = `Write a ${platform} thread about: "${topic}"

Format:
TWEET 1 (HOOK): [Must be incredibly compelling - this determines if people read the rest]
TWEET 2: [Context / setup]
TWEET 3-6: [Value delivery - one key point per tweet]
TWEET 7: [Summary / key takeaway]
TWEET 8: [CTA - follow for more / check Legacy Builders]

Rules:
- Each tweet under 280 characters
- Use line breaks within tweets for readability
- Number the tweets (1/, 2/, etc.)
- Make it shareable — every tweet should stand alone too`;

    const response = await this.call(prompt, "social.thread");
    return { success: true, output: { thread: response, platform, topic } };
  }

  private async generateCarousel(topic: string): Promise<TaskResult> {
    const prompt = `Create an Instagram carousel about: "${topic}"

Format (10 slides max):
SLIDE 1 (COVER): [Bold statement / question that makes people swipe]
SLIDE 2-8: [One key point per slide, concise text]
SLIDE 9: [Summary / recap]
SLIDE 10: [CTA - save this, share this, check Legacy Builders]

For each slide provide:
- HEADLINE: [Large text]
- BODY: [Supporting text, 1-2 sentences max]
- DESIGN NOTE: [Color/layout suggestion]

CAPTION: [Full caption with hashtags for the post]`;

    const response = await this.call(prompt, "social.caption");
    return { success: true, output: { carousel: response, platform: "instagram", topic } };
  }
}

export const social = new SocialAgent();
