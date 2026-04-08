/**
 * SILIX — E-Commerce Operations Agent
 * Department: Finance & Operations
 *
 * Responsibilities:
 * - Silix LLC product listing copy
 * - TikTok Shop product descriptions
 * - Amazon/marketplace listing optimization
 * - Product-related content for social
 */

import { BaseAgent, AgentConfig, TaskResult } from "./base-agent";
import { PRODUCTS } from "../departments/revenue";

const SYSTEM_PROMPT = `You are Silix, the e-commerce operations agent at SkillDailyPay AI Media Agency.

Your role:
- Write compelling product listing copy for Silix LLC products
- Optimize TikTok Shop product descriptions
- Create Amazon-style bullet points and descriptions
- Support product marketing across social channels

Product focus: Silix LLC — Silicone Products
Platforms: TikTok Shop, Amazon (future), direct sales

Product listing guidelines:
- Lead with benefits, not features
- Use sensory language for physical products
- Include social proof elements
- SEO-optimize titles and descriptions
- Follow each platform's character limits and formatting rules

TikTok Shop specifics:
- Product titles: clear, keyword-rich, under 100 chars
- Descriptions: benefit-focused, with specifications
- Use relevant hashtags for discoverability
- Include size/color/variant information clearly`;

const config: AgentConfig = {
  name: "silix",
  department: "operations",
  role: "E-Commerce Operations Agent",
  systemPrompt: SYSTEM_PROMPT,
  defaultTaskKey: "silix.product_listing",
};

class SilixAgent extends BaseAgent {
  constructor() {
    super(config);
  }

  async execute(task: string, params?: Record<string, unknown>): Promise<TaskResult> {
    switch (task) {
      case "product_listing":
        return this.createProductListing(params?.product as string, params?.platform as string);
      case "tiktok_shop":
        return this.tiktokShopListing(params?.product as string);
      case "optimize_listing":
        return this.optimizeListing(params?.listing as string, params?.platform as string);
      default:
        return { success: false, output: {}, error: `Silix doesn't handle: ${task}` };
    }
  }

  private async createProductListing(product: string, platform: string = "general"): Promise<TaskResult> {
    const prompt = `Create a product listing for: "${product}"
Platform: ${platform}

Provide:
TITLE: [SEO-optimized, under 200 chars]
BULLET POINTS: [5 benefit-focused bullets]
DESCRIPTION: [Full product description, 200-400 words]
KEYWORDS: [10 relevant search keywords]
TAGS: [Platform-appropriate tags]

Make the listing:
- Benefit-driven (what does this DO for the customer?)
- SEO-friendly (include searched terms naturally)
- Trust-building (materials, quality, guarantee)
- Conversion-optimized (clear value proposition + CTA)`;

    const response = await this.call(prompt, "silix.product_listing");
    return { success: true, output: { listing: response, product, platform } };
  }

  private async tiktokShopListing(product: string): Promise<TaskResult> {
    const prompt = `Create a TikTok Shop listing for: "${product}"

PRODUCT TITLE: [Under 100 chars, keyword-rich]
SHORT DESCRIPTION: [Under 200 chars — appears in search]
FULL DESCRIPTION: [500-800 chars — benefit-focused with specifications]
CATEGORY: [Suggested TikTok Shop category]
HASHTAGS: [10 relevant hashtags for TikTok search]
VIDEO SCRIPT BRIEF: [30-second product showcase script for TikTok]

Optimize for:
- TikTok's search algorithm (keywords in title + description)
- Mobile-first reading (short paragraphs, emojis for visual breaks)
- Impulse purchases (urgency, social proof, clear value)`;

    const response = await this.call(prompt, "silix.product_listing");
    return { success: true, output: { tiktokListing: response, product, platform: "tiktok_shop" } };
  }

  private async optimizeListing(listing: string, platform: string = "general"): Promise<TaskResult> {
    const prompt = `Optimize this ${platform} product listing:

${listing.slice(0, 2000)}

Provide:
1. TITLE OPTIMIZATION — improved title with better keywords
2. BULLET POINT IMPROVEMENTS — more benefit-focused
3. DESCRIPTION REWRITE — better flow and conversion
4. MISSING KEYWORDS — keywords to add
5. COMPETITOR COMPARISON — how this stacks up vs typical listings
6. CONVERSION TIPS — specific changes to increase sales`;

    const response = await this.call(prompt, "silix.product_listing");
    return { success: true, output: { optimizedListing: response, platform } };
  }
}

export const silix = new SilixAgent();
