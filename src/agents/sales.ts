/**
 * SALES — Revenue Conversion Agent
 * Department: Sales & Revenue
 *
 * Responsibilities:
 * - Email sequences and follow-ups for Legacy Builders
 * - TikTok affiliate daily product video pipeline
 * - Sales copy, landing page copy, ad scripts
 * - UGC scripts for organic + paid campaigns
 */

import { BaseAgent, AgentConfig, TaskResult } from "./base-agent";
import { PRODUCTS, FUNNEL_STAGES, TIKTOK_AFFILIATE } from "../departments/revenue";

const SYSTEM_PROMPT = `You are Sales, the revenue conversion agent at SkillDailyPay AI Media Agency.

Your role:
- Write email sequences that nurture leads into Legacy Builders Program customers
- Create ad copy that converts cold traffic
- Write UGC scripts that feel authentic, not salesy
- Develop sales copy for landing pages and funnels
- Manage the TikTok affiliate product video pipeline

Sales philosophy:
- Lead with value. Educate first, sell second.
- Use storytelling and social proof
- Address objections head-on
- Create urgency without being manipulative
- Focus on transformation, not features

Primary product: Legacy Builders Program (skilldailypay.com)
- Complete online business education program
- Teaches how to build real income streams online
- Target audience: 25-45, wants financial freedom, tired of 9-5

Email sequence structure:
- Welcome → Value → Story → Objection handling → Social proof → Offer → Urgency → Last chance

UGC scripts must feel:
- Natural and unscripted
- Like a real person sharing a real experience
- Not like an ad (even though it is one)`;

const config: AgentConfig = {
  name: "sales",
  department: "revenue",
  role: "Revenue Conversion Agent",
  systemPrompt: SYSTEM_PROMPT,
  defaultTaskKey: "sales.email_sequence",
};

class SalesAgent extends BaseAgent {
  constructor() {
    super(config);
  }

  async execute(task: string, params?: Record<string, unknown>): Promise<TaskResult> {
    switch (task) {
      case "email_sequence":
        return this.writeEmailSequence(params?.trigger as string, params?.length as number);
      case "ad_copy":
        return this.writeAdCopy(params?.platform as string, params?.angle as string);
      case "ugc_script":
        return this.writeUGCScript(params?.platform as string, params?.angle as string);
      case "landing_page":
        return this.writeLandingPageCopy(params?.variant as string);
      case "tiktok_affiliate":
        return this.tiktokAffiliateScript(params?.product as string);
      default:
        return { success: false, output: {}, error: `Sales doesn't handle: ${task}` };
    }
  }

  private async writeEmailSequence(trigger: string = "opt-in", length: number = 7): Promise<TaskResult> {
    const prompt = `Write a ${length}-email sequence for Legacy Builders Program.

Trigger: ${trigger}
Product: ${PRODUCTS.legacyBuilders.name} (${PRODUCTS.legacyBuilders.url})

For each email provide:
EMAIL [number]:
  SEND: [delay from trigger, e.g., "Immediately", "+24 hours", "+3 days"]
  SUBJECT: [High open-rate subject line]
  PREVIEW: [Preview text]
  BODY: [Full email copy]
  CTA: [Button text + link destination]

Sequence arc:
1. Welcome + immediate value
2. Educational content (teach something useful)
3. Personal story / origin
4. Handle #1 objection ("I don't have time")
5. Social proof / results
6. The offer (main pitch)
7. Urgency / last chance

Each email should be 200-400 words. Conversational tone. Mobile-friendly formatting.`;

    const response = await this.call(prompt, "sales.email_sequence");
    return { success: true, output: { emailSequence: response, trigger, emailCount: length } };
  }

  private async writeAdCopy(platform: string = "facebook", angle: string = "transformation"): Promise<TaskResult> {
    const prompt = `Write ad copy for ${platform} promoting Legacy Builders Program.

Angle: ${angle}
Product: ${PRODUCTS.legacyBuilders.name}
URL: ${PRODUCTS.legacyBuilders.url}

Provide 3 variations:

VARIATION 1 (Short):
  Headline: [under 40 chars]
  Primary text: [under 125 chars]
  Description: [under 30 chars]
  CTA button: [Learn More / Sign Up / Get Started]

VARIATION 2 (Medium):
  Headline: [under 40 chars]
  Primary text: [200-300 chars, storytelling approach]
  Description: [under 30 chars]
  CTA button: [appropriate CTA]

VARIATION 3 (Long):
  Headline: [under 40 chars]
  Primary text: [400-500 chars, full value proposition]
  Description: [under 30 chars]
  CTA button: [appropriate CTA]

Target audience: Aspiring entrepreneurs, 25-45, interested in online income.`;

    const response = await this.call(prompt, "sales.ad_copy");
    return { success: true, output: { adCopy: response, platform, angle } };
  }

  private async writeUGCScript(platform: string = "tiktok", angle: string = "discovery"): Promise<TaskResult> {
    const prompt = `Write a UGC (user-generated content) script for ${platform}.

Angle: ${angle}
Product: Legacy Builders Program
Duration: 30-60 seconds

Format:
HOOK (0-3s): [Casual, attention-grabbing opening — as if talking to a friend]
PROBLEM (3-8s): [Relatable struggle the audience faces]
DISCOVERY (8-15s): [How I found Legacy Builders — must feel natural]
RESULTS (15-25s): [What changed — be specific but authentic]
CTA (25-30s): [Soft sell — "check it out" not "BUY NOW"]

DIRECTOR NOTES:
- Setting suggestion
- Camera angle
- Wardrobe/vibe
- Key authentic moments to hit

This should NOT feel like an ad. It should feel like someone genuinely sharing their experience.`;

    const response = await this.call(prompt, "sales.ugc_script");
    return { success: true, output: { ugcScript: response, platform, angle } };
  }

  private async writeLandingPageCopy(variant: string = "main"): Promise<TaskResult> {
    const prompt = `Write landing page copy for Legacy Builders Program (${variant} variant).

Product: ${PRODUCTS.legacyBuilders.name}
URL: ${PRODUCTS.legacyBuilders.url}

Sections:
1. HERO: Headline + subheadline + CTA button
2. PROBLEM: 3 pain points the audience faces
3. SOLUTION: What Legacy Builders teaches
4. BENEFITS: 5-7 bullet points (transformation-focused)
5. SOCIAL PROOF: Testimonial framework (3 spots)
6. HOW IT WORKS: 3-step process
7. FAQ: 5 common questions + answers
8. FINAL CTA: Urgency + last pitch

Write in a conversion-optimized format. Every section should reduce friction and build desire.`;

    const response = await this.call(prompt, "sales.email_sequence");
    return { success: true, output: { landingPage: response, variant } };
  }

  private async tiktokAffiliateScript(product: string = "trending product"): Promise<TaskResult> {
    const prompt = `Write a TikTok affiliate product review video script.

Product: ${product}
Style: ${TIKTOK_AFFILIATE.contentStyle}
Duration: 30-60 seconds

Format:
HOOK (0-2s): [Product reveal or bold claim]
DEMO (2-15s): [Show the product in use, highlight features]
BENEFITS (15-25s): [Why this product is worth it — be genuine]
SOCIAL PROOF (25-30s): [Reviews, ratings, or personal results]
CTA (30-35s): [Link in bio / TikTok Shop link]

CAPTION: [With trending hashtags + #TikTokMadeMeBuyIt]
POSTING NOTES: [Best time to post, sounds to use]`;

    const response = await this.call(prompt, "nexus.tiktok_script");
    return { success: true, output: { affiliateScript: response, product, platform: "tiktok" } };
  }
}

export const sales = new SalesAgent();
