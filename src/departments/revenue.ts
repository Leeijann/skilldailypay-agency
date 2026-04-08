/**
 * SALES & REVENUE — Department 4
 * Converts traffic into Legacy Builders Program sales.
 *
 * Agent: Sales
 */

import { logEntry } from "../memory/wal-logger";

export interface EmailSequence {
  name: string;
  trigger: string;
  emails: EmailTemplate[];
}

export interface EmailTemplate {
  subject: string;
  body: string;
  sendDelay: string; // e.g., "0h", "24h", "72h"
  cta: string;
}

export interface AdCopy {
  headline: string;
  primaryText: string;
  description: string;
  cta: string;
  platform: string;
  targetAudience: string;
}

export interface UGCScript {
  hook: string;
  problem: string;
  solution: string;
  proof: string;
  cta: string;
  duration: string;
  platform: string;
}

/** Revenue funnel stages */
export const FUNNEL_STAGES = [
  { name: "awareness", channels: ["YouTube", "TikTok", "Instagram", "Facebook", "Blog"] },
  { name: "interest", channels: ["Link in Bio", "YouTube CTA", "Blog CTA"] },
  { name: "consideration", channels: ["Email Sequence", "Retargeting Ads"] },
  { name: "conversion", channels: ["Legacy Builders Sales Page", "TikTok Shop"] },
  { name: "retention", channels: ["Follow-up Emails", "Community"] },
];

/** Product catalog */
export const PRODUCTS = {
  legacyBuilders: {
    name: "Legacy Builders Program",
    url: "skilldailypay.com",
    price: "varies",
    description: "Complete online business education program",
    ctaLines: [
      "Start building your legacy today",
      "Learn the exact system I use to earn daily",
      "Ready to build real income online?",
      "Stop scrolling. Start building.",
    ],
  },
  silixProducts: {
    name: "Silix LLC Products",
    platform: "TikTok Shop / Amazon",
    category: "Silicone Products",
  },
};

/** TikTok affiliate pipeline config */
export const TIKTOK_AFFILIATE = {
  dailyVideoCount: 1,
  contentStyle: "product review / demo",
  monetization: "affiliate commission",
  pipeline: [
    "Research trending product",
    "Generate video script",
    "Create posting brief with hashtags",
    "Schedule via n8n",
  ],
};
