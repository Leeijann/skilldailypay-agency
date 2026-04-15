/**
 * Video Post Agent — Generates AI videos and posts to TikTok + YouTube
 *
 * Flow:
 * 1. Generate caption via AISA (GPT-4.1-mini)
 * 2. Generate video via Together.ai (Wan 2.7 T2V)
 * 3. Poll until video is ready
 * 4. Post to TikTok/YouTube via Blotato
 */

import { env } from "./src/config/env";

const AISA_URL = env.aisa.baseUrl;
const AISA_KEY = env.aisa.apiKey;
const BLOTATO_KEY = env.blotato.apiKey;
const TOGETHER_KEY = process.env.TOGETHER_API_KEY || "tgp_v1_ZbjPYGlwmg6IKMoY4fGPWCEZacawVafF4wZ-n6_1nUY";

const ACCOUNTS = {
  tiktok: [
    { accountId: "37990", name: "ironrive1" },
    { accountId: "38001", name: "tren_dz" },
  ],
  youtube: [
    { accountId: "33403", name: "SO ADORABLE" },
    { accountId: "33404", name: "The Health Corner" },
    // { accountId: "33406", name: "Affiliate World" }, // Disconnected from Blotato
  ],
};

// ── Content Generation ──

async function genCaption(platform: string, account: string, topic: string): Promise<string> {
  const res = await fetch(`${AISA_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${AISA_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You write viral ${platform} video captions. Keep it short and punchy. ${
            platform === "TikTok" ? "Use 3-5 trending hashtags. Under 100 words." :
            "Write a compelling title and description. Under 200 words. Include 5 relevant tags."
          } Today is April 13, 2026.`,
        },
        { role: "user", content: `Write a ${platform} caption for "${account}" about: ${topic}` },
      ],
      max_tokens: 300,
      temperature: 0.9,
    }),
  });
  const d: any = await res.json();
  return d.choices[0].message.content;
}

// ── Video Generation ──

async function submitVideo(prompt: string, seconds = 60): Promise<string> {
  const res = await fetch("https://api.together.xyz/v2/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOGETHER_KEY}` },
    body: JSON.stringify({
      model: "Wan-AI/wan2.7-t2v",
      prompt,
      height: 1280,
      width: 720,
      seconds: String(seconds),
      output_format: "MP4",
    }),
  });
  const d: any = await res.json();
  if (!res.ok) throw new Error(`Video submit failed: ${JSON.stringify(d).slice(0, 200)}`);
  return d.id;
}

async function pollVideo(jobId: string, maxWait = 1200000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const res = await fetch(`https://api.together.xyz/v2/videos/${jobId}`, {
      headers: { Authorization: `Bearer ${TOGETHER_KEY}` },
    });
    const d: any = await res.json();

    if (d.status === "completed" && d.outputs?.video_url) {
      return d.outputs.video_url;
    }
    if (d.status === "failed") {
      throw new Error(`Video failed: ${d.error?.message || "unknown"}`);
    }

    // Wait 15s between polls
    const elapsed = Math.round((Date.now() - start) / 1000);
    process.stdout.write(`  ⏳ Rendering... (${elapsed}s)\r`);
    await new Promise(r => setTimeout(r, 15000));
  }
  throw new Error("Video generation timed out (10 min)");
}

async function generateVideo(prompt: string, label: string, seconds = 5): Promise<string> {
  console.log(`  🎬 Submitting video: ${label}`);
  const jobId = await submitVideo(prompt, seconds);
  console.log(`  📋 Job ID: ${jobId}`);
  const url = await pollVideo(jobId);
  console.log(`  ✅ Video ready: ${url.slice(0, 60)}...`);
  return url;
}

// ── Posting ──

async function postBlotato(body: any, label: string): Promise<boolean> {
  const res = await fetch("https://backend.blotato.com/v2/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json", "blotato-api-key": BLOTATO_KEY },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.log(`  ❌ ${label}: ${res.status} — ${text.slice(0, 150)}`);
    return false;
  }
  console.log(`  ✅ ${label}: posted!`);
  return true;
}

// ── Main ──

async function main() {
  const target = process.argv[2] || "all"; // "tiktok", "youtube", or "all"
  const topic = process.argv[3] || "Weekend hustle — why successful people never stop grinding";

  console.log(`🎬 VIDEO DEPLOY — ${target.toUpperCase()}\n`);
  console.log(`Topic: ${topic}\n`);

  // Generate videos (these take minutes, so do them first)
  console.log("🎨 Generating AI videos (Wan 2.7 via Together.ai)...\n");

  if (target === "tiktok" || target === "all") {
    // TikTok — vertical 9:16, 15s
    for (const acct of ACCOUNTS.tiktok) {
      try {
        const caption = await genCaption("TikTok", acct.name, topic);
        console.log(`\n📱 TikTok: ${acct.name}`);
        console.log(`  Caption: ${caption.slice(0, 80)}...`);

        const tiktokPrompts: Record<string, string> = {
          "ironrive1": `${topic}, confident person speaking to camera, motivational mood, dark luxury background, cinematic lighting, vertical video, smooth camera movement, photorealistic`,
          "tren_dz": `${topic}, fast-paced trending content, colorful vibrant aesthetic, Gen-Z style, vertical video, dynamic camera angles, photorealistic`,
        };

        const videoUrl = await generateVideo(
          tiktokPrompts[acct.name] || `${topic}, vertical video, energetic mood, cinematic lighting, photorealistic`,
          acct.name,
          15
        );

        await postBlotato({
          post: {
            accountId: acct.accountId,
            content: { text: caption, mediaUrls: [videoUrl], platform: "tiktok" },
            target: {
              targetType: "tiktok",
              privacyLevel: "PUBLIC_TO_EVERYONE",
              disabledComments: false,
              disabledDuet: false,
              disabledStitch: false,
              isBrandedContent: false,
              isYourBrand: false,
              isAiGenerated: true,
            },
          },
        }, `TikTok: ${acct.name}`);
      } catch (e: any) {
        console.log(`  ❌ TikTok ${acct.name}: ${e.message}`);
      }
    }
  }

  if (target === "youtube" || target === "all") {
    // YouTube — vertical 9:16 Shorts (60s+)
    for (const acct of ACCOUNTS.youtube) {
      try {
        const caption = await genCaption("YouTube", acct.name, topic);
        // Extract title from caption (first line usually)
        const title = caption.split("\n")[0].replace(/^#\s*/, "").replace(/\*\*/g, "").slice(0, 100);

        console.log(`\n📺 YouTube: ${acct.name}`);
        console.log(`  Title: ${title}`);

        // Niche-specific video prompts
        const ytPrompts: Record<string, string> = {
          "SO ADORABLE": `${topic}, cute adorable animals, warm soft lighting, heartwarming scene, gentle camera movement, National Geographic quality, photorealistic`,
          "The Health Corner": `${topic}, aesthetic ASMR meal prep video, hands preparing fresh ingredients on clean white countertop, overhead camera angle, glass meal prep containers, satisfying food preparation sequence, bright natural kitchen lighting, vertical video, smooth close-up shots, photorealistic 4K`,
        };
        const videoPrompt = ytPrompts[acct.name] || `${topic}, cinematic quality, photorealistic, 4K`;

        const videoUrl = await generateVideo(
          videoPrompt,
          acct.name,
          60
        );

        await postBlotato({
          post: {
            accountId: acct.accountId,
            content: { text: caption, mediaUrls: [videoUrl], platform: "youtube" },
            target: {
              targetType: "youtube",
              title: title,
              privacyStatus: "public",
              shouldNotifySubscribers: true,
              isMadeForKids: false,
              containsSyntheticMedia: true,
            },
          },
        }, `YouTube: ${acct.name}`);
      } catch (e: any) {
        console.log(`  ❌ YouTube ${acct.name}: ${e.message}`);
      }
    }
  }

  console.log("\n══════════════════════════════");
  console.log("🎬 Video deploy complete!");
  console.log("══════════════════════════════");
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
