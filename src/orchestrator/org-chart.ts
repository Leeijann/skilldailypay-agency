/**
 * Organization Chart — Defines the full 25+ agent hierarchy.
 * Mirrors Paperclip's org-chart model with reporting lines,
 * budgets, and capabilities.
 */

export interface AgentDef {
  id: string;
  name: string;
  role: string;
  department: string;
  reportsTo: string | null;
  capabilities: string[];
  platforms: string[];
  model: "haiku" | "sonnet" | "opus";
  budgetMonthly: number; // cents
  status: "idle" | "running" | "paused" | "error";
  metadata: Record<string, any>;
}

export const ORG_CHART: AgentDef[] = [
  // ═══════════════════════════════════════
  //  COMMAND — CEO
  // ═══════════════════════════════════════
  {
    id: "jake",
    name: "Jake",
    role: "CEO / Orchestrator",
    department: "command",
    reportsTo: null,
    capabilities: ["task_routing", "strategy", "delegation", "daily_reports"],
    platforms: ["telegram"],
    model: "opus",
    budgetMonthly: 50000,
    status: "idle",
    metadata: { description: "Routes all tasks, makes strategic decisions, manages agent hierarchy" },
  },

  // ═══════════════════════════════════════
  //  MARKETING — CMO + Teams
  // ═══════════════════════════════════════
  {
    id: "cmo",
    name: "Marketing Director",
    role: "CMO",
    department: "marketing",
    reportsTo: "jake",
    capabilities: ["content_strategy", "campaign_planning", "cross_platform_coordination"],
    platforms: [],
    model: "sonnet",
    budgetMonthly: 30000,
    status: "idle",
    metadata: { description: "Oversees all marketing, content, and social media operations" },
  },

  // ── Social Media Coordinator ──
  {
    id: "social-coordinator",
    name: "Social Media Coordinator",
    role: "Social Lead",
    department: "marketing",
    reportsTo: "cmo",
    capabilities: ["scheduling", "cross_posting", "engagement_tracking", "content_calendar"],
    platforms: [],
    model: "sonnet",
    budgetMonthly: 20000,
    status: "idle",
    metadata: { description: "Coordinates all social media activity across platforms and accounts" },
  },

  // ── TikTok Team ──
  {
    id: "tiktok-lead",
    name: "TikTok Lead",
    role: "Platform Lead",
    department: "marketing",
    reportsTo: "social-coordinator",
    capabilities: ["tiktok_strategy", "trend_detection", "video_planning", "hashtag_research"],
    platforms: ["tiktok"],
    model: "sonnet",
    budgetMonthly: 15000,
    status: "idle",
    metadata: { description: "Manages TikTok accounts — each with its own niche" },
  },
  {
    id: "tiktok-1",
    name: "TikTok — ironrive1 (Money Mindset)",
    role: "Content Creator",
    department: "marketing",
    reportsTo: "tiktok-lead",
    capabilities: ["video_creation", "caption_writing", "posting", "comment_management"],
    platforms: ["tiktok"],
    model: "haiku",
    budgetMonthly: 10000,
    status: "idle",
    metadata: { accountName: "ironrive1", blotoatoAccountId: 37990, niche: "Money mindset, motivation, wealth building, entrepreneurship shorts" },
  },
  {
    id: "tiktok-2",
    name: "TikTok — tren_dz (Trending/Viral)",
    role: "Content Creator",
    department: "marketing",
    reportsTo: "tiktok-lead",
    capabilities: ["video_creation", "caption_writing", "posting", "comment_management"],
    platforms: ["tiktok"],
    model: "haiku",
    budgetMonthly: 10000,
    status: "idle",
    metadata: { accountName: "tren_dz", blotoatoAccountId: 38001, niche: "Trending topics, viral moments, pop culture, what is hot right now" },
  },
  {
    id: "tiktok-3",
    name: "TikTok Account 3 — Silix",
    role: "Content Creator",
    department: "marketing",
    reportsTo: "tiktok-lead",
    capabilities: ["video_creation", "caption_writing", "posting", "shop_videos"],
    platforms: ["tiktok"],
    model: "haiku",
    budgetMonthly: 10000,
    status: "idle",
    metadata: { accountName: "Silix", businessUnit: "silix" },
  },
  {
    id: "tiktok-4",
    name: "TikTok Account 4 — Hell Corner",
    role: "Content Creator",
    department: "marketing",
    reportsTo: "tiktok-lead",
    capabilities: ["video_creation", "caption_writing", "posting"],
    platforms: ["tiktok"],
    model: "haiku",
    budgetMonthly: 10000,
    status: "idle",
    metadata: { accountName: "Hell Corner", businessUnit: "hellcorner" },
  },

  // ── Facebook / Instagram Team ──
  {
    id: "fbig-lead",
    name: "Facebook/Instagram Lead",
    role: "Platform Lead",
    department: "marketing",
    reportsTo: "social-coordinator",
    capabilities: ["fb_strategy", "ig_strategy", "ad_management", "carousel_creation"],
    platforms: ["facebook", "instagram"],
    model: "sonnet",
    budgetMonthly: 15000,
    status: "idle",
    metadata: { description: "Manages all 4 FB/IG account agents" },
  },
  {
    id: "fbig-1",
    name: "FB — Leeijann Design (Fashion/Women's Lifestyle)",
    role: "Content Creator",
    department: "marketing",
    reportsTo: "fbig-lead",
    capabilities: ["post_creation", "reel_creation", "story_creation", "engagement"],
    platforms: ["facebook"],
    model: "haiku",
    budgetMonthly: 10000,
    status: "idle",
    metadata: { pageId: "Leeijann Design", niche: "Fashion, women's lifestyle, beauty, interior design, female empowerment" },
  },
  {
    id: "fbig-2",
    name: "FB/IG — Skill Sprint (Skills & Side Hustles)",
    role: "Content Creator",
    department: "marketing",
    reportsTo: "fbig-lead",
    capabilities: ["post_creation", "reel_creation", "story_creation", "engagement"],
    platforms: ["facebook", "instagram"],
    model: "haiku",
    budgetMonthly: 10000,
    status: "idle",
    metadata: { pageId: "Skill Sprint", niche: "Online skills, side hustles, making money, digital entrepreneurship" },
  },
  {
    id: "fbig-3",
    name: "FB — Smooth CUT (Barbering/Men's Grooming)",
    role: "Content Creator",
    department: "marketing",
    reportsTo: "fbig-lead",
    capabilities: ["post_creation", "reel_creation", "story_creation", "engagement"],
    platforms: ["facebook"],
    model: "haiku",
    budgetMonthly: 10000,
    status: "idle",
    metadata: { pageId: "Smooth CUT Barbershop", niche: "Barbering, men's grooming, haircuts, beard care, barbershop culture" },
  },
  {
    id: "fbig-4",
    name: "FB/IG — SkillDailyPay",
    role: "Content Creator",
    department: "marketing",
    reportsTo: "fbig-lead",
    capabilities: ["post_creation", "reel_creation", "story_creation", "ad_creation"],
    platforms: ["facebook", "instagram"],
    model: "haiku",
    budgetMonthly: 10000,
    status: "idle",
    metadata: { pageId: "SkillDailyPay", businessUnit: "skilldailypay" },
  },

  // ── YouTube Team ──
  {
    id: "nexus",
    name: "Nexus — YouTube Lead",
    role: "Platform Lead",
    department: "marketing",
    reportsTo: "social-coordinator",
    capabilities: ["video_scripting", "seo_optimization", "thumbnail_planning", "shorts_strategy"],
    platforms: ["youtube"],
    model: "sonnet",
    budgetMonthly: 20000,
    status: "idle",
    metadata: { description: "Manages all 4 YouTube channel agents" },
  },
  {
    id: "yt-1",
    name: "YouTube — SO ADORABLE (Cute/Feel-Good)",
    role: "Channel Manager",
    department: "marketing",
    reportsTo: "nexus",
    capabilities: ["long_form_scripts", "shorts_scripts", "upload", "seo"],
    platforms: ["youtube"],
    model: "haiku",
    budgetMonthly: 15000,
    status: "idle",
    metadata: { channelName: "SO ADORABLE", blotoatoAccountId: 33403, niche: "Cute animals, adorable moments, heartwarming stories, feel-good content" },
  },
  {
    id: "yt-2",
    name: "YouTube — The Health Corner (Health/Wellness)",
    role: "Channel Manager",
    department: "marketing",
    reportsTo: "nexus",
    capabilities: ["long_form_scripts", "shorts_scripts", "upload", "seo"],
    platforms: ["youtube"],
    model: "haiku",
    budgetMonthly: 15000,
    status: "idle",
    metadata: { channelName: "The Health Corner", blotoatoAccountId: 33404, niche: "Health tips, wellness, nutrition, fitness, mental health, natural remedies" },
  },
  {
    id: "yt-3",
    name: "YouTube — Affiliate World",
    role: "Channel Manager",
    department: "marketing",
    reportsTo: "nexus",
    capabilities: ["long_form_scripts", "shorts_scripts", "upload", "seo"],
    platforms: ["youtube"],
    model: "haiku",
    budgetMonthly: 15000,
    status: "paused",
    metadata: { channelName: "Affiliate World", blotoatoAccountId: null, businessUnit: "skilldailypay", note: "Disconnected from Blotato — reconnect to resume" },
  },

  // ── Other Social Agents ──
  {
    id: "leeijann",
    name: "Leeijann — Pinterest & Blog",
    role: "Content Creator",
    department: "marketing",
    reportsTo: "social-coordinator",
    capabilities: ["blog_writing", "seo_content", "pin_creation", "blog_publishing"],
    platforms: ["pinterest", "blogger"],
    model: "sonnet",
    budgetMonthly: 15000,
    status: "idle",
    metadata: { blogUrl: "leeijanndesign.blogspot.com", businessUnit: "leeijann" },
  },
  {
    id: "linkedin-agent",
    name: "LinkedIn Agent",
    role: "Content Creator",
    department: "marketing",
    reportsTo: "social-coordinator",
    capabilities: ["authority_posts", "articles", "networking", "thought_leadership"],
    platforms: ["linkedin"],
    model: "haiku",
    budgetMonthly: 8000,
    status: "idle",
    metadata: { businessUnit: "skilldailypay" },
  },
  {
    id: "twitter-agent",
    name: "Twitter/X Agent",
    role: "Content Creator",
    department: "marketing",
    reportsTo: "social-coordinator",
    capabilities: ["threads", "hooks", "engagement", "trending_topics"],
    platforms: ["twitter"],
    model: "haiku",
    budgetMonthly: 8000,
    status: "idle",
    metadata: { businessUnit: "skilldailypay" },
  },

  // ── Marketing Specialists ──
  {
    id: "seo-specialist",
    name: "SEO Specialist",
    role: "Specialist",
    department: "marketing",
    reportsTo: "cmo",
    capabilities: ["keyword_research", "on_page_seo", "content_audit", "serp_analysis"],
    platforms: ["blogger"],
    model: "sonnet",
    budgetMonthly: 15000,
    status: "idle",
    metadata: { description: "Keyword research, on-page optimization, content audits for Systeme.io & blog" },
  },
  {
    id: "email-agent",
    name: "Email Marketing Agent",
    role: "Specialist",
    department: "marketing",
    reportsTo: "cmo",
    capabilities: ["email_sequences", "newsletters", "automation", "segmentation", "ab_testing"],
    platforms: ["systemeio"],
    model: "sonnet",
    budgetMonthly: 15000,
    status: "idle",
    metadata: { description: "Systeme.io email campaigns, welcome sequences, launch sequences" },
  },
  {
    id: "content-calendar",
    name: "Content Calendar Manager",
    role: "Coordinator",
    department: "marketing",
    reportsTo: "cmo",
    capabilities: ["scheduling", "content_briefs", "cross_platform_sync", "deadline_tracking"],
    platforms: [],
    model: "haiku",
    budgetMonthly: 8000,
    status: "idle",
    metadata: { description: "Weekly content calendar, cross-platform coordination, posting schedules" },
  },

  // ═══════════════════════════════════════
  //  REVENUE — CFO + Teams
  // ═══════════════════════════════════════
  {
    id: "sales-agent",
    name: "Sales Funnel Agent",
    role: "Revenue Lead",
    department: "revenue",
    reportsTo: "jake",
    capabilities: ["funnel_optimization", "conversion_tracking", "landing_pages", "ab_testing"],
    platforms: ["systemeio"],
    model: "sonnet",
    budgetMonthly: 15000,
    status: "idle",
    metadata: { description: "Systeme.io funnel optimization, Legacy Builders Program conversions" },
  },
  {
    id: "finance",
    name: "Finance Tracker",
    role: "CFO",
    department: "revenue",
    reportsTo: "jake",
    capabilities: ["revenue_tracking", "expense_logging", "roi_analysis", "budget_reporting"],
    platforms: [],
    model: "haiku",
    budgetMonthly: 5000,
    status: "idle",
    metadata: { description: "Revenue/expense logging, ROI analysis, agent cost tracking" },
  },
  {
    id: "affiliate-manager",
    name: "Affiliate Manager",
    role: "Revenue Specialist",
    department: "revenue",
    reportsTo: "sales-agent",
    capabilities: ["partner_recruitment", "commission_tracking", "affiliate_content"],
    platforms: ["systemeio"],
    model: "haiku",
    budgetMonthly: 8000,
    status: "idle",
    metadata: { description: "Affiliate program management, partner recruitment, commission tracking" },
  },

  // ═══════════════════════════════════════
  //  RESEARCH — Intelligence
  // ═══════════════════════════════════════
  {
    id: "ivy",
    name: "Ivy — Trend Analyst",
    role: "Research Lead",
    department: "research",
    reportsTo: "jake",
    capabilities: ["trend_detection", "competitor_analysis", "market_research", "content_opportunities"],
    platforms: [],
    model: "sonnet",
    budgetMonthly: 15000,
    status: "idle",
    metadata: { description: "Platform trend detection, competitor analysis, content opportunity identification" },
  },

  // ═══════════════════════════════════════
  //  OPERATIONS
  // ═══════════════════════════════════════
  {
    id: "nox",
    name: "Nox — Security & Health",
    role: "Operations Lead",
    department: "operations",
    reportsTo: "jake",
    capabilities: ["system_monitoring", "api_health", "security_alerts", "uptime_tracking"],
    platforms: [],
    model: "haiku",
    budgetMonthly: 5000,
    status: "idle",
    metadata: { description: "System monitoring, API health checks, security alerts, error tracking" },
  },
  {
    id: "silix",
    name: "Silix — E-Commerce",
    role: "E-Commerce Manager",
    department: "operations",
    reportsTo: "jake",
    capabilities: ["inventory_management", "order_tracking", "tiktok_shop", "product_listing"],
    platforms: ["tiktok"],
    model: "haiku",
    budgetMonthly: 8000,
    status: "idle",
    metadata: { description: "TikTok Shop management, inventory, fulfillment for Silix LLC" },
  },
];

/** Get all direct reports for an agent */
export function getDirectReports(agentId: string): AgentDef[] {
  return ORG_CHART.filter(a => a.reportsTo === agentId);
}

/** Get agent by ID */
export function getAgent(id: string): AgentDef | undefined {
  return ORG_CHART.find(a => a.id === id);
}

/** Get full chain of command for an agent */
export function getChainOfCommand(agentId: string): AgentDef[] {
  const chain: AgentDef[] = [];
  let current = getAgent(agentId);
  while (current) {
    chain.push(current);
    current = current.reportsTo ? getAgent(current.reportsTo) : undefined;
  }
  return chain.reverse();
}

/** Get agents by department */
export function getByDepartment(dept: string): AgentDef[] {
  return ORG_CHART.filter(a => a.department === dept);
}

/** Get agents by platform */
export function getByPlatform(platform: string): AgentDef[] {
  return ORG_CHART.filter(a => a.platforms.includes(platform));
}

/** Print org tree */
export function printOrgTree(rootId: string | null = null, indent: number = 0): string {
  const agents = ORG_CHART.filter(a => a.reportsTo === rootId);
  let output = "";
  for (const agent of agents) {
    const prefix = indent === 0 ? "" : "│  ".repeat(indent - 1) + "├── ";
    output += `${prefix}${agent.name} [${agent.role}] (${agent.model})\n`;
    output += printOrgTree(agent.id, indent + 1);
  }
  return output;
}
