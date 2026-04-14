/**
 * 🚀 MASTER DEPLOY — Every Agent Posts Niche-Specific Content
 *
 * Each brand gets its OWN unique topic, image, and caption:
 *   • SkillDailyPay → Skills, side hustles, money (FB Skill Sprint, X, IG, Pinterest, LinkedIn)
 *   • Leeijann Design → Fashion, women's lifestyle, beauty (FB + Blogger)
 *   • Smooth CUT → Barbering, men's grooming (FB)
 *   • ironrive1 → Money mindset, motivation (TikTok)
 *   • tren_dz → Trending/viral content (TikTok)
 *   • SO ADORABLE → Cute animals, feel-good (YouTube)
 *   • The Health Corner → Health, wellness, nutrition (YouTube)
 *
 * Usage: npx tsx deploy-all.ts
 */

import { env } from "./src/config/env";
import { promoteBlogPost } from "./src/platforms/blogger-promo";
import {
  ALL_BRANDS, getRandomTopic,
  SKILLDAILYPAY, LEEIJANN_DESIGN, SMOOTH_CUT,
  TIKTOK_IRONRIVE, TIKTOK_TRENDZ,
  YT_SO_ADORABLE, YT_HEALTH_CORNER,
  type BrandNiche, type PlatformTarget,
} from "./src/config/niches";

const AISA_URL = env.aisa.baseUrl;
const AISA_KEY = env.aisa.apiKey;
const BLOTATO_KEY = env.blotato.apiKey;
const TOGETHER_KEY = process.env.TOGETHER_API_KEY || "tgp_v1_ZbjPYGlwmg6IKMoY4fGPWCEZacawVafF4wZ-n6_1nUY";
const BH = { "Content-Type": "application/json", "blotato-api-key": BLOTATO_KEY };
const AH = { "Content-Type": "application/json", Authorization: `Bearer ${AISA_KEY}` };
const TH = { "Content-Type": "application/json", Authorization: `Bearer ${TOGETHER_KEY}` };

// Blogger config
const BLOGGER_BLOG_ID = process.env.BLOGGER_BLOG_ID || "8576203532277118544";
const BLOGGER_CLIENT_ID = env.blogger.clientId;
const BLOGGER_CLIENT_SECRET = env.blogger.clientSecret;
const BLOGGER_REFRESH_TOKEN = process.env.BLOGGER_REFRESH_TOKEN || "";

// ═══════════════════════════════════════
//  CONTENT GENERATION (Niche-Aware)
// ═══════════════════════════════════════

async function genCaption(brand: BrandNiche, target: PlatformTarget, topic: string): Promise<string> {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const res = await fetch(`${AISA_URL}/chat/completions`, {
    method: "POST", headers: AH,
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You write ${target.platform} content for "${brand.brand}".
NICHE: ${brand.niche}
TONE: ${brand.tone}
STYLE: ${brand.style}
FORMAT: ${target.format}
Today is ${today}.
IMPORTANT: Stay 100% on-niche. Never mix topics from other brands.`,
        },
        { role: "user", content: `Write a ${target.platform} post about: ${topic}` },
      ],
      max_tokens: target.platform === "blogger" ? 1500 : 300,
      temperature: 0.9,
    }),
  });
  const d: any = await res.json();
  return d.choices[0].message.content;
}

async function genNicheImage(brand: BrandNiche, topic: string): Promise<string> {
  // Build image prompt specific to the brand's niche
  const nichePrompts: Record<string, string> = {
    skilldailypay: `Modern workspace with laptop showing income dashboard, motivational aesthetic about "${topic}", vibrant blue and orange neon lighting, digital entrepreneur vibes, ultra detailed photorealistic 4K`,
    leeijann: `Elegant fashion lifestyle flatlay, ${topic}, stylish feminine aesthetic, soft pink and gold tones, designer workspace with fabric swatches and mood boards, editorial quality photorealistic 4K`,
    smoothcut: `Premium barbershop interior, ${topic}, fresh fade haircut on display, clean chrome tools, warm ambient lighting, masculine luxury aesthetic, photorealistic 4K`,
    "tiktok-ironrive": `Dramatic close-up of confident person, ${topic}, dark moody lighting with gold accents, wealth and success aesthetic, cinematic vertical composition, photorealistic 4K`,
    "tiktok-trendz": `Vibrant trending aesthetic collage, ${topic}, neon colors, Gen-Z pop culture vibes, social media aesthetic, eye-catching bold design, photorealistic 4K`,
    "yt-adorable": `Incredibly cute ${topic}, warm soft lighting, adorable heartwarming scene, high-quality animal photography, National Geographic quality, photorealistic 4K`,
    "yt-health": `Clean healthy lifestyle scene, ${topic}, fresh fruits vegetables and wellness items, bright natural lighting, health and vitality aesthetic, photorealistic 4K`,
  };

  const prompt = nichePrompts[brand.id] || `${topic}, professional quality, photorealistic 4K`;

  const res = await fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST", headers: TH,
    body: JSON.stringify({
      model: "black-forest-labs/FLUX.1-schnell",
      prompt, n: 1, width: 1024, height: 1024,
    }),
  });
  const d: any = await res.json();
  if (!res.ok) throw new Error(`Image fail: ${JSON.stringify(d).slice(0, 200)}`);
  return d.data[0].url;
}

// ═══════════════════════════════════════
//  VIDEO GENERATION
// ═══════════════════════════════════════

async function submitVideo(brand: BrandNiche, topic: string, aspectRatio: "portrait" | "landscape"): Promise<string> {
  const isPortrait = aspectRatio === "portrait";

  const videoPrompts: Record<string, string> = {
    "tiktok-ironrive": `${topic}, confident person speaking to camera, motivational mood, dark luxury background, cinematic lighting, vertical video, smooth camera movement, photorealistic`,
    "tiktok-trendz": `${topic}, fast-paced trending content, colorful vibrant aesthetic, Gen-Z style, vertical video, dynamic camera angles, photorealistic`,
    "yt-adorable": `${topic}, cute adorable animals, warm soft lighting, heartwarming scene, gentle camera movement, National Geographic quality, photorealistic`,
    "yt-health": `${topic}, healthy lifestyle, person preparing nutritious food, bright natural kitchen, smooth camera pan, wellness aesthetic, photorealistic 4K`,
  };

  const prompt = videoPrompts[brand.id] || `${topic}, cinematic quality, photorealistic`;

  const res = await fetch("https://api.together.xyz/v2/videos", {
    method: "POST", headers: TH,
    body: JSON.stringify({
      model: "Wan-AI/wan2.7-t2v",
      prompt,
      height: isPortrait ? 1280 : 720,
      width: isPortrait ? 720 : 1280,
      seconds: "5",
      output_format: "MP4",
    }),
  });
  const d: any = await res.json();
  if (!res.ok) throw new Error(`Video submit: ${JSON.stringify(d).slice(0, 200)}`);
  return d.id;
}

async function pollVideo(jobId: string, label: string, maxWait = 600000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const res = await fetch(`https://api.together.xyz/v2/videos/${jobId}`, { headers: { Authorization: `Bearer ${TOGETHER_KEY}` } });
    const d: any = await res.json();
    if (d.status === "completed" && d.outputs?.video_url) return d.outputs.video_url;
    if (d.status === "failed") throw new Error(`Video failed: ${d.error?.message || "unknown"}`);
    const elapsed = Math.round((Date.now() - start) / 1000);
    process.stdout.write(`  \u23f3 ${label} rendering... (${elapsed}s)     \r`);
    await new Promise(r => setTimeout(r, 15000));
  }
  throw new Error(`Video timed out (${maxWait / 1000}s)`);
}

// ═══════════════════════════════════════
//  POSTING HELPERS
// ═══════════════════════════════════════

async function postBlotato(body: any, label: string): Promise<boolean> {
  const res = await fetch("https://backend.blotato.com/v2/posts", {
    method: "POST", headers: BH, body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) { console.log(`  \u274c ${label}: ${res.status} \u2014 ${text.slice(0, 150)}`); return false; }
  console.log(`  \u2705 ${label}`);
  return true;
}

async function getBloggerAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: BLOGGER_CLIENT_ID, client_secret: BLOGGER_CLIENT_SECRET,
      refresh_token: BLOGGER_REFRESH_TOKEN, grant_type: "refresh_token",
    }),
  });
  const d: any = await res.json();
  if (!res.ok) throw new Error(`Blogger token: ${JSON.stringify(d)}`);
  return d.access_token;
}

async function postToBlogger(title: string, html: string, imageUrl: string, labels: string[]): Promise<{ success: boolean; url?: string }> {
  try {
    const token = await getBloggerAccessToken();
    const fullHtml = `<div style="text-align:center;margin-bottom:20px;"><img src="${imageUrl}" alt="${title}" style="max-width:100%;border-radius:12px;" /></div>\n${html}`;
    const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${BLOGGER_BLOG_ID}/posts/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        kind: "blogger#post", blog: { id: BLOGGER_BLOG_ID },
        title, content: fullHtml, labels,
      }),
    });
    const d: any = await res.json();
    if (!res.ok) { console.log(`  \u274c Blog: ${res.status} \u2014 ${JSON.stringify(d).slice(0, 150)}`); return { success: false }; }
    console.log(`  \u2705 Blog: ${d.url}`);
    return { success: true, url: d.url };
  } catch (e: any) { console.log(`  \u274c Blog: ${e.message}`); return { success: false }; }
}

// ═══════════════════════════════════════
//  DEPLOY A SINGLE BRAND
// ═══════════════════════════════════════

interface DeployResult {
  brand: string;
  platform: string;
  account: string;
  success: boolean;
}

async function deployBrand(brand: BrandNiche): Promise<DeployResult[]> {
  const topic = getRandomTopic(brand);
  const results: DeployResult[] = [];

  console.log(`\n  \ud83c\udfaf ${brand.brand} | Niche: ${brand.niche.split(",")[0]}`);
  console.log(`     Topic: "${topic}"`);

  // Separate image platforms from video platforms
  const imagePlatforms = brand.platforms.filter(p => !["tiktok", "youtube"].includes(p.platform));
  const videoPlatforms = brand.platforms.filter(p => ["tiktok", "youtube"].includes(p.platform));

  // ── IMAGE PLATFORMS ──
  if (imagePlatforms.length > 0) {
    // Generate one niche image for this brand
    let imageUrl: string;
    try {
      imageUrl = await genNicheImage(brand, topic);
      console.log(`     \ud83c\udfa8 Image generated`);
    } catch (e: any) {
      console.log(`     \u274c Image failed: ${e.message.slice(0, 60)}`);
      return results;
    }

    // Generate captions + post for each image platform
    for (const target of imagePlatforms) {
      try {
        const caption = await genCaption(brand, target, topic);

        if (target.platform === "blogger") {
          // Blogger gets its own flow
          const blogResult = await postToBlogger(
            topic, caption, imageUrl,
            ["AI Generated", ...brand.niche.split(",").slice(0, 2).map(s => s.trim())]
          );
          results.push({ brand: brand.brand, platform: "blogger", account: target.accountName, success: blogResult.success });

          // Auto-promote to Leeijann Design FB page
          if (blogResult.success && blogResult.url) {
            console.log(`     \ud83d\udd04 Auto-promoting blog to FB Leeijann Design...`);
            const promoOk = await promoteBlogPost(topic, blogResult.url);
            results.push({ brand: brand.brand, platform: "facebook", account: "Blog Promo", success: promoOk });
          }
        } else if (target.platform === "facebook") {
          const ok = await postBlotato({
            post: {
              accountId: target.accountId,
              content: { text: caption, mediaUrls: [imageUrl], platform: "facebook" },
              target: { targetType: "facebook", pageId: target.pageId },
            },
          }, `${brand.brand} \u2192 FB: ${target.accountName}`);
          results.push({ brand: brand.brand, platform: "facebook", account: target.accountName, success: ok });

        } else if (target.platform === "pinterest") {
          if (!target.boardId) {
            console.log(`  \u26a0\ufe0f  Pinterest: No boardId set \u2014 skipping`);
            results.push({ brand: brand.brand, platform: "pinterest", account: target.accountName, success: false });
          } else {
            const ok = await postBlotato({
              post: {
                accountId: target.accountId,
                content: { text: caption, mediaUrls: [imageUrl], platform: "pinterest" },
                target: { targetType: "pinterest", boardId: target.boardId },
              },
            }, `${brand.brand} \u2192 Pinterest`);
            results.push({ brand: brand.brand, platform: "pinterest", account: target.accountName, success: ok });
          }
        } else {
          // LinkedIn, Twitter, Instagram
          const ok = await postBlotato({
            post: {
              accountId: target.accountId,
              content: { text: caption, mediaUrls: [imageUrl], platform: target.platform },
              target: { targetType: target.platform },
            },
          }, `${brand.brand} \u2192 ${target.platform}: ${target.accountName}`);
          results.push({ brand: brand.brand, platform: target.platform, account: target.accountName, success: ok });
        }
      } catch (e: any) {
        console.log(`     \u274c ${target.platform} ${target.accountName}: ${e.message.slice(0, 60)}`);
        results.push({ brand: brand.brand, platform: target.platform, account: target.accountName, success: false });
      }
    }
  }

  // ── VIDEO PLATFORMS ──
  if (videoPlatforms.length > 0) {
    const isPortrait = videoPlatforms[0].platform === "tiktok";
    try {
      console.log(`     \ud83c\udfac Submitting ${isPortrait ? "vertical" : "landscape"} video...`);
      const videoId = await submitVideo(brand, topic, isPortrait ? "portrait" : "landscape");
      console.log(`     \ud83d\udccb Video job: ${videoId}`);
      const videoUrl = await pollVideo(videoId, brand.brand);
      console.log(`\n     \u2705 Video ready!`);

      // Post to each video platform target
      for (const target of videoPlatforms) {
        const caption = await genCaption(brand, target, topic);

        if (target.platform === "tiktok") {
          const ok = await postBlotato({
            post: {
              accountId: target.accountId,
              content: { text: caption, mediaUrls: [videoUrl], platform: "tiktok" },
              target: {
                targetType: "tiktok", privacyLevel: "PUBLIC_TO_EVERYONE",
                disabledComments: false, disabledDuet: false, disabledStitch: false,
                isBrandedContent: false, isYourBrand: false, isAiGenerated: true,
              },
            },
          }, `${brand.brand} \u2192 TikTok: ${target.accountName}`);
          results.push({ brand: brand.brand, platform: "tiktok", account: target.accountName, success: ok });

        } else if (target.platform === "youtube") {
          const title = caption.split("\n")[0].replace(/^#\s*/, "").replace(/\*\*/g, "").slice(0, 100) || topic;
          const ok = await postBlotato({
            post: {
              accountId: target.accountId,
              content: { text: caption, mediaUrls: [videoUrl], platform: "youtube" },
              target: {
                targetType: "youtube", title, privacyStatus: "public",
                shouldNotifySubscribers: true, isMadeForKids: false, containsSyntheticMedia: true,
              },
            },
          }, `${brand.brand} \u2192 YouTube: ${target.accountName}`);
          results.push({ brand: brand.brand, platform: "youtube", account: target.accountName, success: ok });
        }
      }
    } catch (e: any) {
      console.log(`     \u274c Video: ${e.message.slice(0, 80)}`);
      videoPlatforms.forEach(t => results.push({ brand: brand.brand, platform: t.platform, account: t.accountName, success: false }));
    }
  }

  return results;
}

// ═══════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════

async function main() {
  const startTime = Date.now();

  console.log("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
  console.log("\u2551  \ud83d\ude80 FULL AGENCY DEPLOY \u2014 Niche-Specific Content       \u2551");
  console.log("\u2551  Each brand posts its OWN unique niche content        \u2551");
  console.log("\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d\n");

  // Deploy image brands first (faster), then video brands
  const imageBrands = [SKILLDAILYPAY, LEEIJANN_DESIGN, SMOOTH_CUT];
  const videoBrands = [TIKTOK_IRONRIVE, TIKTOK_TRENDZ, YT_SO_ADORABLE, YT_HEALTH_CORNER];

  const allResults: DeployResult[] = [];

  // ── Phase 1: Image-based brands (parallel captions, sequential images to avoid rate limits) ──
  console.log("\u2550\u2550\u2550 PHASE 1: Image Brands \u2550\u2550\u2550");
  for (const brand of imageBrands) {
    const results = await deployBrand(brand);
    allResults.push(...results);
  }

  // ── Phase 2: Video-based brands (sequential — videos take time) ──
  console.log("\n\u2550\u2550\u2550 PHASE 2: Video Brands \u2550\u2550\u2550");
  for (const brand of videoBrands) {
    const results = await deployBrand(brand);
    allResults.push(...results);
  }

  // ── Final Report ──
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  const ok = allResults.filter(r => r.success).length;
  const fail = allResults.filter(r => !r.success).length;

  console.log("\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
  console.log("\u2551            \ud83c\udfc6 FULL AGENCY DEPLOY REPORT              \u2551");
  console.log("\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563");

  // Group by brand
  const brandGroups = new Map<string, DeployResult[]>();
  for (const r of allResults) {
    if (!brandGroups.has(r.brand)) brandGroups.set(r.brand, []);
    brandGroups.get(r.brand)!.push(r);
  }

  for (const [brand, results] of brandGroups) {
    const brandOk = results.filter(r => r.success).length;
    const brandTotal = results.length;
    const icon = brandOk === brandTotal ? "\u2705" : brandOk > 0 ? "\u26a0\ufe0f" : "\u274c";
    console.log(`\u2551  ${icon} ${brand.padEnd(25)} ${brandOk}/${brandTotal} posted            \u2551`);
    for (const r of results) {
      const status = r.success ? "\u2705" : "\u274c";
      console.log(`\u2551     ${status} ${r.platform} \u2192 ${r.account.padEnd(20)}              \u2551`);
    }
  }

  console.log("\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563");
  console.log(`\u2551  \ud83d\udcca Total: \u2705 ${ok} posted | \u274c ${fail} failed            \u2551`);
  console.log(`\u2551  \u23f1\ufe0f  Time: ${totalTime}s                                    \u2551`);
  console.log("\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d");
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
