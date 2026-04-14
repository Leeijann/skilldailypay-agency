/**
 * Image & Video Engine — Multi-provider creative generation for the agency.
 *
 * Providers:
 * 1. Grok (xAI) — Primary: AI image generation (grok-imagine-image) + video (grok-imagine-video)
 * 2. Canva MCP — Design templates, social posts (already connected)
 * 3. FLUX via Hugging Face — AI image generation (free tier fallback)
 * 4. Claude SVG — Code-based graphics, charts, diagrams
 *
 * Agents call this to generate images & videos for all platforms.
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

const OUTPUT_DIR = path.resolve(__dirname, "../../data/images");
const VIDEO_DIR = path.resolve(__dirname, "../../data/videos");
const XAI_API_KEY = process.env.XAI_API_KEY || "";

export interface ImageRequest {
  prompt: string;
  platform: "youtube_thumbnail" | "tiktok" | "instagram" | "facebook" | "pinterest" | "blog" | "general";
  style?: "photorealistic" | "illustration" | "minimalist" | "bold" | "dark_tech";
  businessUnit?: string;
  outputName?: string;
}

export interface ImageResult {
  filePath: string;
  width: number;
  height: number;
  provider: string;
  status: "generated" | "error";
  error?: string;
  url?: string;
}

export interface VideoRequest {
  prompt: string;
  platform: "youtube" | "tiktok" | "instagram" | "facebook" | "shorts";
  outputName?: string;
  businessUnit?: string;
}

export interface VideoResult {
  filePath: string;
  duration: number;
  provider: string;
  status: "generating" | "done" | "error";
  requestId?: string;
  url?: string;
  error?: string;
}

/** Platform-specific image dimensions */
const PLATFORM_SIZES: Record<string, { width: number; height: number }> = {
  youtube_thumbnail: { width: 1280, height: 720 },
  tiktok: { width: 1080, height: 1920 },
  instagram: { width: 1080, height: 1080 },
  facebook: { width: 1200, height: 630 },
  pinterest: { width: 1000, height: 1500 },
  blog: { width: 1200, height: 675 },
  general: { width: 1024, height: 1024 },
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ═══════════════════════════════════════
//  GROK (xAI) — PRIMARY PROVIDER
// ═══════════════════════════════════════

/**
 * Generate image via Grok (xAI Aurora)
 * $0.02 per image — high quality, fast
 */
export async function generateWithGrok(request: ImageRequest): Promise<ImageResult> {
  ensureDir(OUTPUT_DIR);

  if (!XAI_API_KEY) {
    return { filePath: "", width: 0, height: 0, provider: "grok", status: "error", error: "XAI_API_KEY not set" };
  }

  const size = PLATFORM_SIZES[request.platform] || PLATFORM_SIZES.general;
  const stylePrefix = getStylePrefix(request.style);
  const fullPrompt = `${stylePrefix}${request.prompt}`;

  try {
    const response = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-imagine-image",
        prompt: fullPrompt,
        n: 1,
      }),
    });

    const data = await response.json() as any;

    if (data.error) {
      return { filePath: "", width: size.width, height: size.height, provider: "grok", status: "error", error: data.error };
    }

    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) {
      return { filePath: "", width: size.width, height: size.height, provider: "grok", status: "error", error: "No URL in response" };
    }

    // Download image
    const imgRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const fileName = request.outputName
      ? `${request.outputName}.jpeg`
      : `${request.platform}-${Date.now()}.jpeg`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    return {
      filePath,
      width: size.width,
      height: size.height,
      provider: "grok-aurora",
      status: "generated",
      url: imageUrl,
    };
  } catch (err: any) {
    return { filePath: "", width: size.width, height: size.height, provider: "grok", status: "error", error: err.message };
  }
}

/**
 * Generate video via Grok (xAI)
 * Returns request ID — poll with checkVideoStatus()
 */
export async function generateVideoWithGrok(request: VideoRequest): Promise<VideoResult> {
  ensureDir(VIDEO_DIR);

  if (!XAI_API_KEY) {
    return { filePath: "", duration: 0, provider: "grok", status: "error", error: "XAI_API_KEY not set" };
  }

  try {
    const response = await fetch("https://api.x.ai/v1/videos/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-imagine-video",
        prompt: request.prompt,
        n: 1,
      }),
    });

    const data = await response.json() as any;

    if (data.error) {
      return { filePath: "", duration: 0, provider: "grok", status: "error", error: data.error };
    }

    return {
      filePath: "",
      duration: 0,
      provider: "grok-video",
      status: "generating",
      requestId: data.request_id,
    };
  } catch (err: any) {
    return { filePath: "", duration: 0, provider: "grok", status: "error", error: err.message };
  }
}

/**
 * Check video generation status and download when done
 */
export async function checkVideoStatus(requestId: string, outputName?: string): Promise<VideoResult> {
  ensureDir(VIDEO_DIR);

  try {
    const response = await fetch(`https://api.x.ai/v1/videos/${requestId}`, {
      headers: { Authorization: `Bearer ${XAI_API_KEY}` },
    });

    const data = await response.json() as any;

    if (data.status === "done" && data.video?.url) {
      // Download video
      const vidRes = await fetch(data.video.url);
      const buffer = Buffer.from(await vidRes.arrayBuffer());
      const fileName = outputName ? `${outputName}.mp4` : `video-${Date.now()}.mp4`;
      const filePath = path.join(VIDEO_DIR, fileName);
      fs.writeFileSync(filePath, buffer);

      return {
        filePath,
        duration: data.video.duration || 0,
        provider: "grok-video",
        status: "done",
        requestId,
        url: data.video.url,
      };
    }

    return {
      filePath: "",
      duration: 0,
      provider: "grok-video",
      status: data.status === "done" ? "done" : "generating",
      requestId,
    };
  } catch (err: any) {
    return { filePath: "", duration: 0, provider: "grok", status: "error", error: err.message };
  }
}

/**
 * Generate video and wait for completion (blocking)
 */
export async function generateVideoAndWait(
  request: VideoRequest,
  maxWaitMs: number = 120000
): Promise<VideoResult> {
  const startResult = await generateVideoWithGrok(request);
  if (startResult.status === "error" || !startResult.requestId) return startResult;

  const startTime = Date.now();
  const pollInterval = 5000;

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    const status = await checkVideoStatus(startResult.requestId!, request.outputName);
    if (status.status === "done" || status.status === "error") return status;
  }

  return {
    filePath: "",
    duration: 0,
    provider: "grok-video",
    status: "error",
    requestId: startResult.requestId,
    error: "Timeout waiting for video generation",
  };
}

// ═══════════════════════════════════════
//  HUGGING FACE — FREE FALLBACK
// ═══════════════════════════════════════

export async function generateWithHuggingFace(
  request: ImageRequest,
  hfToken?: string
): Promise<ImageResult> {
  ensureDir(OUTPUT_DIR);

  const size = PLATFORM_SIZES[request.platform] || PLATFORM_SIZES.general;
  const token = hfToken || process.env.HUGGINGFACE_TOKEN || "";
  const model = "black-forest-labs/FLUX.1-schnell";
  const url = `https://api-inference.huggingface.co/models/${model}`;
  const stylePrefix = getStylePrefix(request.style);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: `${stylePrefix}${request.prompt}`, parameters: { width: size.width, height: size.height } }),
    });

    if (!response.ok) {
      return { filePath: "", width: size.width, height: size.height, provider: "huggingface", status: "error", error: `HF ${response.status}` };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileName = request.outputName ? `${request.outputName}.png` : `${request.platform}-${Date.now()}.png`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    return { filePath, width: size.width, height: size.height, provider: "huggingface-flux", status: "generated" };
  } catch (err: any) {
    return { filePath: "", width: size.width, height: size.height, provider: "huggingface", status: "error", error: err.message };
  }
}

// ═══════════════════════════════════════
//  CLAUDE SVG — FREE, LOCAL
// ═══════════════════════════════════════

export async function generateSVG(request: ImageRequest & { svgContent?: string }): Promise<ImageResult> {
  ensureDir(OUTPUT_DIR);
  const size = PLATFORM_SIZES[request.platform] || PLATFORM_SIZES.general;
  const fileName = request.outputName ? `${request.outputName}.svg` : `${request.platform}-${Date.now()}.svg`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  const svg = request.svgContent || generateBrandedSVG(request.prompt, size.width, size.height, request.platform);
  fs.writeFileSync(filePath, svg, "utf-8");

  return { filePath, width: size.width, height: size.height, provider: "claude-svg", status: "generated" };
}

// ═══════════════════════════════════════
//  SMART GENERATE — AUTO-PICKS PROVIDER
// ═══════════════════════════════════════

/**
 * Auto-generate image using the best available provider.
 * Priority: Grok → HuggingFace → SVG fallback
 */
export async function generateImage(request: ImageRequest): Promise<ImageResult> {
  // Try Grok first (best quality)
  if (XAI_API_KEY) {
    const result = await generateWithGrok(request);
    if (result.status === "generated") return result;
    console.warn("Grok failed, falling back:", result.error);
  }

  // Try HuggingFace
  if (process.env.HUGGINGFACE_TOKEN) {
    const result = await generateWithHuggingFace(request);
    if (result.status === "generated") return result;
    console.warn("HuggingFace failed, falling back:", result.error);
  }

  // SVG fallback (always works)
  return generateSVG(request);
}

/**
 * Auto-generate video (Grok only for now)
 */
export async function generateVideo(request: VideoRequest): Promise<VideoResult> {
  return generateVideoAndWait(request);
}

// ═══════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════

export function listImages(): Array<{ name: string; size: number; created: Date }> {
  ensureDir(OUTPUT_DIR);
  return fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.match(/\.(png|jpg|jpeg|svg|webp)$/))
    .map(f => { const s = fs.statSync(path.join(OUTPUT_DIR, f)); return { name: f, size: s.size, created: s.mtime }; })
    .sort((a, b) => b.created.getTime() - a.created.getTime());
}

export function listVideos(): Array<{ name: string; size: number; created: Date }> {
  ensureDir(VIDEO_DIR);
  return fs.readdirSync(VIDEO_DIR)
    .filter(f => f.match(/\.(mp4|webm|mov)$/))
    .map(f => { const s = fs.statSync(path.join(VIDEO_DIR, f)); return { name: f, size: s.size, created: s.mtime }; })
    .sort((a, b) => b.created.getTime() - a.created.getTime());
}

function getStylePrefix(style?: string): string {
  switch (style) {
    case "photorealistic": return "Ultra-realistic photograph, 8k, professional lighting, ";
    case "illustration": return "Modern digital illustration, clean lines, vibrant colors, ";
    case "minimalist": return "Minimalist design, clean white background, simple shapes, ";
    case "bold": return "Bold graphic design, high contrast, striking colors, motivational, ";
    case "dark_tech": return "Dark futuristic tech aesthetic, neon accents, sleek modern, ";
    default: return "";
  }
}

function generateBrandedSVG(text: string, width: number, height: number, platform: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0D0D0D"/>
      <stop offset="100%" style="stop-color:#1a1a2e"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <text x="${width / 2}" y="${height / 2 - 40}" text-anchor="middle" fill="#FFD700" font-family="Impact, Arial Black, sans-serif" font-size="${Math.round(width / 15)}" font-weight="900">
    ${escapeXml(text.substring(0, 40))}
  </text>
  <text x="${width / 2}" y="${height / 2 + 40}" text-anchor="middle" fill="#F5F5F5" font-family="system-ui, sans-serif" font-size="${Math.round(width / 30)}" font-weight="400">
    SkillDailyPay.com
  </text>
</svg>`;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
