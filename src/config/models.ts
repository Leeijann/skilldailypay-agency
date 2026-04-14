/**
 * Model routing configuration.
 * Routes tasks to the appropriate Claude model based on complexity.
 *
 * - Haiku: fast, cheap — captions, short copy, simple formatting
 * - Sonnet: balanced — blog posts, scripts, email sequences
 * - Opus: heavy — strategic planning, complex research synthesis
 */

export type ModelTier = "haiku" | "sonnet" | "opus";

export const MODEL_IDS: Record<ModelTier, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-6",
};

export type TaskComplexity = "simple" | "medium" | "complex";

const COMPLEXITY_TO_MODEL: Record<TaskComplexity, ModelTier> = {
  simple: "haiku",
  medium: "sonnet",
  complex: "opus",
};

// Map agent tasks to complexity levels
const TASK_COMPLEXITY: Record<string, TaskComplexity> = {
  // Simple — Haiku
  "social.caption": "simple",
  "social.hashtags": "simple",
  "social.repost": "simple",
  "sales.subject_line": "simple",
  "finance.log_entry": "simple",
  "nox.health_check": "simple",

  // Medium — Sonnet
  "nexus.youtube_script": "medium",
  "nexus.tiktok_script": "medium",
  "nexus.shorts_brief": "medium",
  "leeijann.blog_post": "medium",
  "leeijann.seo_optimize": "medium",
  "social.thread": "medium",
  "sales.email_sequence": "medium",
  "sales.ad_copy": "medium",
  "sales.ugc_script": "medium",
  "silix.product_listing": "medium",
  "ivy.trend_report": "medium",

  // Complex — Opus
  "jake.daily_plan": "complex",
  "jake.strategy": "complex",
  "ivy.competitor_analysis": "complex",
  "sales.funnel_strategy": "complex",
  "finance.monthly_report": "complex",
};

export function getModelForTask(taskKey: string): string {
  const complexity = TASK_COMPLEXITY[taskKey] || "medium";
  const tier = COMPLEXITY_TO_MODEL[complexity];
  return MODEL_IDS[tier];
}

export function getModel(tier: ModelTier): string {
  return MODEL_IDS[tier];
}

// ═══════════════════════════════════════
//  AISA — Multi-model gateway (56 models)
//  OpenAI-compatible API at https://api.aisa.one/v1
// ═══════════════════════════════════════

export const AISA_MODEL_IDS = {
  // Cheap & fast — use for captions, hashtags, simple content
  "gpt-4.1-mini":       "gpt-4.1-mini",
  "gpt-4.1-nano":       "gpt-4.1-nano",
  "gemini-2.0-flash":   "gemini-2.0-flash",
  // Mid-tier — blog posts, scripts
  "gpt-4.1":            "gpt-4.1",
  "claude-sonnet-4-6":  "claude-sonnet-4-6",
  "gemini-2.5-pro":     "gemini-2.5-pro",
  // Heavy — strategy, research
  "gpt-5":              "gpt-5",
  "claude-opus-4-6":    "claude-opus-4-6",
  "o3":                 "o3",
} as const;

export type AISAModel = keyof typeof AISA_MODEL_IDS;

/**
 * Get the cheapest AISA model for a task complexity.
 * Uses GPT-4.1-mini/nano for simple tasks to save costs.
 */
export function getAISAModel(complexity: TaskComplexity): string {
  switch (complexity) {
    case "simple":  return AISA_MODEL_IDS["gpt-4.1-nano"];
    case "medium":  return AISA_MODEL_IDS["gpt-4.1-mini"];
    case "complex": return AISA_MODEL_IDS["gpt-4.1"];
  }
}

/** Estimate token budget per task complexity */
export function getTokenBudget(taskKey: string): number {
  const complexity = TASK_COMPLEXITY[taskKey] || "medium";
  switch (complexity) {
    case "simple":
      return 1024;
    case "medium":
      return 4096;
    case "complex":
      return 8192;
  }
}
