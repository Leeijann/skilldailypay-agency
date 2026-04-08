/**
 * CONTENT & MEDIA — Department 2
 * All content creation across every platform.
 *
 * Agents: Nexus (video), Leeijann (blog), Social (captions/posts)
 */

import { logEntry } from "../memory/wal-logger";
import { PLATFORMS, YOUTUBE_CHANNELS, BLOGS } from "../config/platforms";

export interface ContentBrief {
  type: string;
  platform: string;
  topic: string;
  targetAudience: string;
  tone: string;
  cta: string;
  keywords?: string[];
  trendingContext?: string;
}

export interface ContentOutput {
  title: string;
  body: string;
  platform: string;
  hashtags?: string[];
  scheduledTime?: string;
  metadata?: Record<string, unknown>;
}

/** Create a content brief for any platform */
export function createBrief(options: {
  type: string;
  platform: string;
  topic: string;
  trendingContext?: string;
}): ContentBrief {
  return {
    type: options.type,
    platform: options.platform,
    topic: options.topic,
    targetAudience: "Aspiring online entrepreneurs, 25-45, looking to build income streams",
    tone: "Professional but approachable. Results-focused. Authentic.",
    cta: "Check out the Legacy Builders Program — link in bio / description",
    trendingContext: options.trendingContext,
  };
}

/** Generate the daily content schedule across all platforms */
export function getDailyContentSchedule(): ContentBrief[] {
  const briefs: ContentBrief[] = [];

  // YouTube — 4 channels worth of content
  for (const channel of YOUTUBE_CHANNELS) {
    briefs.push(
      createBrief({
        type: "youtube_script",
        platform: "youtube",
        topic: `${channel.focus} — daily topic TBD from Ivy research`,
      })
    );
  }

  // TikTok — daily affiliate + organic
  briefs.push(
    createBrief({ type: "tiktok_script", platform: "tiktok", topic: "Daily affiliate product video" }),
    createBrief({ type: "tiktok_script", platform: "tiktok", topic: "Organic growth / tips content" })
  );

  // Blogs
  for (const blog of BLOGS) {
    briefs.push(
      createBrief({ type: "blog_post", platform: "blog", topic: `${blog.name} — SEO article` })
    );
  }

  // Social platforms
  for (const [key, platform] of Object.entries(PLATFORMS)) {
    if (["instagram", "facebook", "twitter", "linkedin"].includes(key)) {
      briefs.push(
        createBrief({ type: "social_caption", platform: key, topic: "Daily engagement post" })
      );
    }
  }

  // Pinterest
  briefs.push(
    createBrief({ type: "pinterest_pin", platform: "pinterest", topic: "Blog pin + product pin" })
  );

  return briefs;
}
