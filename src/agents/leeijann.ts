/**
 * LEEIJANN — Blog & SEO Agent
 * Department: Content & Media
 *
 * Responsibilities:
 * - Blog posts for leeijanndesign.blogspot.com + Blog 2
 * - SEO optimization
 * - Pinterest pin descriptions
 * - Social captions related to blog content
 */

import { BaseAgent, AgentConfig, TaskResult } from "./base-agent";
import { getLatestTrends } from "../departments/research";

const SYSTEM_PROMPT = `You are Leeijann, the blog and SEO content agent at SkillDailyPay AI Media Agency.

Your role:
- Write SEO-optimized blog posts that rank and convert
- Create Pinterest pin descriptions that drive clicks
- Optimize existing content for search engines
- Support the Legacy Builders Program through educational content

Blog guidelines:
- Primary blog: leeijanndesign.blogspot.com
- Write long-form (1500-2500 words) educational content
- Include natural keyword placement (not stuffed)
- Use proper H2/H3 heading structure
- Include internal and external links
- Add a clear CTA to Legacy Builders Program
- Write meta descriptions under 160 characters

SEO approach:
- Target long-tail keywords with buyer intent
- Focus on "how to" and educational queries
- Include FAQ sections for featured snippet opportunities
- Optimize images with alt text suggestions

Tone: Helpful, knowledgeable, encouraging. Like a mentor sharing real knowledge.`;

const config: AgentConfig = {
  name: "leeijann",
  department: "content",
  role: "Blog & SEO Agent",
  systemPrompt: SYSTEM_PROMPT,
  defaultTaskKey: "leeijann.blog_post",
};

class LeeijannAgent extends BaseAgent {
  constructor() {
    super(config);
  }

  async execute(task: string, params?: Record<string, unknown>): Promise<TaskResult> {
    switch (task) {
      case "blog_post":
        return this.writeBlogPost(params?.topic as string, params?.blog as string);
      case "seo_optimize":
        return this.seoOptimize(params?.content as string, params?.keyword as string);
      case "pinterest_pin":
        return this.createPinterestPin(params?.blogPost as string);
      default:
        return { success: false, output: {}, error: `Leeijann doesn't handle: ${task}` };
    }
  }

  private async writeBlogPost(topic: string, blog?: string): Promise<TaskResult> {
    const trends = getLatestTrends();
    const trendContext = trends.length > 0
      ? `\nTrending topics to consider:\n${trends.slice(0, 3).map(t => `- ${t.topic} (${t.platform})`).join("\n")}`
      : "";

    const prompt = `Write a full SEO-optimized blog post about: "${topic}"
${blog ? `For blog: ${blog}` : "For: leeijanndesign.blogspot.com"}
${trendContext}

Output format:
META_TITLE: [Under 60 characters, include primary keyword]
META_DESCRIPTION: [Under 160 characters, compelling + keyword]
SLUG: [url-friendly-slug]
PRIMARY_KEYWORD: [Main target keyword]
SECONDARY_KEYWORDS: [3-5 related keywords]

---

# [H1 Title]

[Introduction - hook reader, preview value, 100-150 words]

## [H2 Section 1]
[300-400 words of valuable content]

## [H2 Section 2]
[300-400 words of valuable content]

## [H2 Section 3]
[300-400 words of valuable content]

## [H2 Section 4]
[300-400 words of valuable content]

## Frequently Asked Questions
[3-5 Q&A pairs targeting featured snippets]

## Final Thoughts
[Conclusion with CTA to Legacy Builders Program]

---

IMAGE_ALT_TEXTS: [Suggestions for 3-4 images]
INTERNAL_LINKS: [Suggested links to other content]
PINTEREST_DESCRIPTION: [Pin description for this post]`;

    const response = await this.call(prompt, "leeijann.blog_post");
    return { success: true, output: { blogPost: response, platform: "blog", topic } };
  }

  private async seoOptimize(content: string, keyword: string): Promise<TaskResult> {
    const prompt = `Optimize this content for the keyword "${keyword}":

${content.slice(0, 3000)}

Provide:
1. Optimized title tag
2. Optimized meta description
3. Keyword density analysis
4. Missing semantic keywords to add
5. Header structure improvements
6. Internal linking suggestions
7. Featured snippet optimization tips`;

    const response = await this.call(prompt, "leeijann.seo_optimize");
    return { success: true, output: { seoReport: response, keyword } };
  }

  private async createPinterestPin(blogPost: string): Promise<TaskResult> {
    const prompt = `Create a Pinterest pin for this blog post:

${blogPost.slice(0, 2000)}

Provide:
PIN_TITLE: [Compelling, keyword-rich, under 100 chars]
PIN_DESCRIPTION: [Under 500 chars, include keywords + hashtags]
BOARD_SUGGESTION: [Which Pinterest board this belongs on]
IMAGE_CONCEPT: [Description of ideal pin image - colors, layout, text overlay]`;

    const response = await this.call(prompt, "leeijann.blog_post");
    return { success: true, output: { pinterestPin: response, platform: "pinterest" } };
  }
}

export const leeijann = new LeeijannAgent();
