/**
 * Platform configuration — all channels, accounts, and content specs.
 */

export interface PlatformConfig {
  name: string;
  agentResponsible: string;
  contentTypes: string[];
  postingSchedule: string;
  maxLength?: number;
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  youtube: {
    name: "YouTube",
    agentResponsible: "nexus",
    contentTypes: ["long_form", "shorts"],
    postingSchedule: "4x/week long form, daily shorts",
  },
  tiktok: {
    name: "TikTok",
    agentResponsible: "nexus,sales",
    contentTypes: ["affiliate_video", "daily_post", "shop_video"],
    postingSchedule: "daily",
    maxLength: 10000, // characters for description
  },
  instagram: {
    name: "Instagram",
    agentResponsible: "social",
    contentTypes: ["reel", "carousel", "story"],
    postingSchedule: "daily",
    maxLength: 2200,
  },
  facebook: {
    name: "Facebook",
    agentResponsible: "social",
    contentTypes: ["post", "group_post", "ad"],
    postingSchedule: "daily",
    maxLength: 63206,
  },
  twitter: {
    name: "X (Twitter)",
    agentResponsible: "social",
    contentTypes: ["thread", "hook", "single_post"],
    postingSchedule: "3-5x/day",
    maxLength: 280,
  },
  pinterest: {
    name: "Pinterest",
    agentResponsible: "leeijann",
    contentTypes: ["blog_pin", "product_pin"],
    postingSchedule: "daily",
    maxLength: 500,
  },
  linkedin: {
    name: "LinkedIn",
    agentResponsible: "social",
    contentTypes: ["authority_post", "article"],
    postingSchedule: "3x/week",
    maxLength: 3000,
  },
};

/** YouTube channel configuration */
export const YOUTUBE_CHANNELS = [
  { name: "SO ADORABLE (Smooth Cut)", focus: "Cute/adorable animal & baby content", blotoatoAccountId: 33403 },
  { name: "The Health Corner", focus: "Health tips & wellness content", blotoatoAccountId: 33404 },
  { name: "Affiliate World", focus: "Affiliate marketing & online business", blotoatoAccountId: 33406 },
];

/** Blog configuration */
export const BLOGS = [
  { name: "Leeijann Design", url: "leeijanndesign.blogspot.com", agent: "leeijann" },
  { name: "Blog 2", url: "TBD", agent: "leeijann" },
];

/** Business units */
export const BUSINESS_UNITS = [
  { name: "SkillDailyPay", product: "Legacy Builders Program", url: "skilldailypay.com" },
  { name: "Leeijann Design", product: "Blog / Content", url: "leeijanndesign.blogspot.com" },
  { name: "Silix LLC", product: "Silicone Products", url: "TBD" },
  { name: "Hell Corner", product: "TBD", url: "TBD" },
];
