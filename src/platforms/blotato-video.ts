/**
 * Blotato Video — AI video generation + posting via Blotato's built-in templates.
 *
 * Available templates:
 * 1. AI Story Video with AI Voice — multi-scene with ElevenLabs voiceover
 * 2. AI Selfie Talking Video — consistent AI character speaking to camera
 * 3. AI Avatar with B-roll — avatar + AI generated b-roll
 * 4. Image Slideshow — images with text overlays
 * 5. Instagram Carousel — AI generated carousel
 * 6. Infographics (20+ styles) — newspaper, chalkboard, graffiti, etc.
 */

const BLOTATO_URL = "https://backend.blotato.com/v2";
const BLOTATO_KEY = process.env.BLOTATO_API_KEY || "";

function headers() {
  return { "Content-Type": "application/json", "blotato-api-key": BLOTATO_KEY };
}

// ═══════════════════════════════════════
//  Template IDs
// ═══════════════════════════════════════

export const TEMPLATES = {
  AI_STORY_VIDEO: "/base/v2/ai-story-video/5903fe43-514d-40ee-a060-0d6628c5f8fd/v1",
  AI_SELFIE_VIDEO: "/base/v2/ai-selfie-video/57f5a565-fd17-458b-be43-4a2d8ccaca75/v1",
  AI_AVATAR_BROLL: "/base/v2/ai-avatar-broll/7c26a1cd-d5b3-42da-9c73-2413333873b3/v1",
  IMAGE_SLIDESHOW: "/base/v2/image-slideshow/5903b592-1255-43b4-b9ac-f8ed7cbf6a5f/v1",
  INSTAGRAM_CAROUSEL: "53cfec04-2500-41cf-8cc1-ba670d2c341a",
  TWEET_CARD: "/base/v2/tweet-card/ba413be6-a840-4e60-8fd6-0066d3b427df/v1",
  COMBINE_CLIPS: "/base/v2/combine-clips/c306ae43-1dcc-4f45-ac2b-88e75430ffd8/v1",
  // Infographics
  INFOGRAPHIC_NEWSPAPER: "07a5b5c5-387c-49e3-86b1-de822cd2dfc7",
  INFOGRAPHIC_WHITEBOARD: "ae868019-820d-434c-8fe1-74c9da99129a",
  INFOGRAPHIC_CHALKBOARD: "fcd64907-b103-46f8-9f75-51b9d1a522f5",
  INFOGRAPHIC_GRAFFITI: "3598483b-c148-4276-a800-eede85c1c62f",
  INFOGRAPHIC_BREAKING_NEWS: "8800be71-52df-4ac7-ac94-df9d8a494d0f",
} as const;

// ═══════════════════════════════════════
//  Video Creation
// ═══════════════════════════════════════

export interface VideoJob {
  id: string;
  status: string;
  videoUrl?: string;
}

/** Submit a video creation job */
export async function createVideo(
  templateId: string,
  prompt: string,
  title: string,
  inputs: Record<string, any> = {}
): Promise<VideoJob> {
  const res = await fetch(`${BLOTATO_URL}/videos/from-templates`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ templateId, prompt, title, render: true, inputs }),
  });
  const d: any = await res.json();
  if (!res.ok) throw new Error(`Blotato video failed: ${JSON.stringify(d).slice(0, 200)}`);
  return { id: d.item.id, status: d.item.status };
}

/** Poll for video completion */
export async function pollVideo(jobId: string, maxWaitMs = 600000): Promise<VideoJob> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${BLOTATO_URL}/videos/creations/${jobId}`, { headers: headers() });
    const d: any = await res.json();
    const status = d.item?.status;
    const videoUrl = d.item?.videoUrl;

    if (status === "done" && videoUrl) {
      return { id: jobId, status: "done", videoUrl };
    }
    if (status === "failed" || status === "error") {
      throw new Error(`Video failed: ${JSON.stringify(d.item).slice(0, 200)}`);
    }

    const elapsed = Math.round((Date.now() - start) / 1000);
    process.stdout.write(`  ⏳ ${status} (${elapsed}s)\r`);
    await new Promise(r => setTimeout(r, 10000));
  }
  throw new Error("Video generation timed out");
}

/** Create and wait for a video */
export async function createAndWait(
  templateId: string,
  prompt: string,
  title: string,
  inputs: Record<string, any> = {}
): Promise<VideoJob> {
  const job = await createVideo(templateId, prompt, title, inputs);
  console.log(`  📋 Job: ${job.id} (${job.status})`);
  return pollVideo(job.id);
}

// ═══════════════════════════════════════
//  Pre-built Video Generators
// ═══════════════════════════════════════

/** AI Story Video with voiceover — best for TikTok/YouTube Shorts */
export async function createStoryVideo(
  prompt: string,
  title: string,
  opts: {
    voice?: string;
    aspectRatio?: "9:16" | "16:9" | "1:1";
    captionPosition?: "bottom" | "top" | "center";
  } = {}
): Promise<VideoJob> {
  return createAndWait(TEMPLATES.AI_STORY_VIDEO, prompt, title, {
    enableVoiceover: true,
    voiceName: opts.voice || "Brian (American, deep)",
    aspectRatio: opts.aspectRatio || "9:16",
    captionPosition: opts.captionPosition || "bottom",
    animateAiImages: true,
    transition: "fade",
  });
}

/** AI Selfie Talking Video — face-to-camera style */
export async function createSelfieVideo(
  prompt: string,
  title: string,
  opts: {
    characterDescription?: string;
    style?: string;
    aspectRatio?: "9:16" | "16:9" | "1:1";
  } = {}
): Promise<VideoJob> {
  return createAndWait(TEMPLATES.AI_SELFIE_VIDEO, prompt, title, {
    style: opts.style || "realistic",
    characterDescription: opts.characterDescription || "Confident young entrepreneur, casual business attire",
    aspectRatio: opts.aspectRatio || "9:16",
  });
}

/** Infographic video — great for carousels and educational content */
export async function createInfographic(
  description: string,
  title: string,
  style: keyof typeof TEMPLATES = "INFOGRAPHIC_WHITEBOARD",
  footerText = "SkillDailyPay.com"
): Promise<VideoJob> {
  return createAndWait(TEMPLATES[style], description, title, {
    description,
    footerText,
  });
}

/** Post a completed Blotato video to a social platform */
export async function postVideo(
  videoUrl: string,
  caption: string,
  platform: string,
  accountId: string,
  target: Record<string, any>
): Promise<boolean> {
  const res = await fetch(`${BLOTATO_URL}/posts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      post: {
        accountId,
        content: { text: caption, mediaUrls: [videoUrl], platform },
        target,
      },
    }),
  });
  return res.ok;
}
