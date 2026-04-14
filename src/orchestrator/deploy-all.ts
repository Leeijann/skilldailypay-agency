/**
 * DEPLOY ALL — Every agent posts content to their platform NOW.
 * Generates content with Claude, posts via platform APIs.
 *
 * Flags:
 *   --facebook-only   Only post to Facebook pages
 *   --dry-run         Generate content but don't post anywhere
 */
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

import Anthropic from "@anthropic-ai/sdk";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const DRY_RUN = process.argv.includes("--dry-run");
const FB_ONLY = process.argv.includes("--facebook-only");

interface PostResult {
  agent: string;
  platform: string;
  status: "posted" | "generated" | "failed";
  content: string;
  response?: any;
  error?: string;
}

const results: PostResult[] = [];

// ── CONTENT GENERATION ──

async function generateContent(agent: string, platform: string, instructions: string): Promise<string> {
  const res = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `You are ${agent}, a social media content creator for SkillDailyPay — an online business education brand selling the Legacy Builders Program. Website: skilldailypay.com.

Generate a ${platform} post. ${instructions}

Rules:
- Be motivational, direct, action-oriented
- Include a call to action to visit skilldailypay.com
- Use relevant hashtags
- Keep it authentic and engaging
- Output ONLY the post text, nothing else.`,
    }],
  });
  return res.content[0].type === "text" ? res.content[0].text : "";
}

// ── PLATFORM POSTING ──

async function postToFacebook(pageId: string, message: string, token: string): Promise<any> {
  if (DRY_RUN) return { id: "dry-run", dry_run: true };
  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: token }),
  });
  return res.json();
}

async function postToLinkedIn(text: string, accessToken: string): Promise<any> {
  if (DRY_RUN) return { id: "dry-run", dry_run: true };
  // Get user URN first
  const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const me = await meRes.json() as any;
  const personUrn = `urn:li:person:${me.sub}`;

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  return res.json();
}

// ── GENERATE IMAGE FOR POSTS ──

async function generateImage(prompt: string): Promise<string | null> {
  if (DRY_RUN) return "https://dry-run/image.jpg";
  try {
    const res = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({ model: "grok-imagine-image", prompt, n: 1 }),
    });
    const data = await res.json() as any;
    return data.data?.[0]?.url || null;
  } catch { return null; }
}

// ── MAIN DEPLOYMENT ──

async function deploy() {
  console.log("═══════════════════════════════════════════════════════");
  console.log(DRY_RUN
    ? "  DRY RUN — Generating content only (no posting)"
    : FB_ONLY
      ? "  FACEBOOK ONLY — Posting to Facebook pages"
      : "  ALL AGENTS DEPLOYING — CONTENT GOING LIVE");
  console.log("═══════════════════════════════════════════════════════\n");

  const FB_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN!;
  const LI_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN!;

  // ── 1. FACEBOOK PAGES ──
  console.log("📘 FACEBOOK — Posting to all pages...\n");

  const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${FB_TOKEN}`);
  const pagesData = await pagesRes.json() as any;
  const pages = pagesData.data || [];

  if (pages.length === 0) {
    console.log("  ⚠️  No pages found. Token may be expired.\n");
  }

  // Generate all FB content in parallel
  const fbContentPromises = pages.map((page: any) =>
    generateContent(
      `FB Agent — ${page.name}`,
      "Facebook",
      `For the ${page.name} page. Write a motivational post about building an online business. 2-3 paragraphs. Include emojis.`
    ).then(content => ({ page, content }))
  );
  const fbPosts = await Promise.all(fbContentPromises);

  for (const { page, content } of fbPosts) {
    try {
      const res = await postToFacebook(page.id, content, page.access_token || FB_TOKEN);
      const success = !!(res as any).id;
      results.push({
        agent: `fbig-${page.name}`,
        platform: "facebook",
        status: success ? "posted" : "failed",
        content: content.substring(0, 100) + "...",
        response: res,
        error: success ? undefined : JSON.stringify(res),
      });
      console.log(`  ${success ? "✅" : "❌"} ${page.name}: ${success ? "Posted!" : JSON.stringify(res).substring(0, 80)}`);
    } catch (err: any) {
      results.push({ agent: `fbig-${page.name}`, platform: "facebook", status: "failed", content: "", error: err.message });
      console.log(`  ❌ ${page.name}: ${err.message}`);
    }
  }

  if (FB_ONLY) {
    printSummary();
    return;
  }

  // ── 2. TWITTER/X ──
  console.log("\n🐦 TWITTER/X — Generating post...\n");

  const tweetContent = await generateContent(
    "Twitter/X Agent",
    "Twitter/X",
    "Write a punchy tweet (under 280 chars) about starting an online business. Include 2-3 hashtags. Make it a hook that stops the scroll."
  );

  try {
    const oauth = await createTwitterOAuth(
      "POST",
      "https://api.twitter.com/2/tweets",
      { text: tweetContent.substring(0, 280) }
    );

    if (DRY_RUN) {
      results.push({ agent: "twitter-agent", platform: "twitter", status: "generated", content: tweetContent.substring(0, 100) });
      console.log(`  📝 Tweet (dry run): ${tweetContent.substring(0, 80)}...`);
    } else {
      const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: oauth,
        },
        body: JSON.stringify({ text: tweetContent.substring(0, 280) }),
      });
      const tweetData = await tweetRes.json();
      const success = !!(tweetData as any).data?.id;
      results.push({
        agent: "twitter-agent",
        platform: "twitter",
        status: success ? "posted" : "generated",
        content: tweetContent.substring(0, 100),
        response: tweetData,
      });
      console.log(`  ${success ? "✅" : "📝"} Tweet: ${tweetContent.substring(0, 80)}...`);
    }
  } catch (err: any) {
    results.push({ agent: "twitter-agent", platform: "twitter", status: "generated", content: tweetContent.substring(0, 100), error: err.message });
    console.log(`  📝 Generated (OAuth needed for posting): ${tweetContent.substring(0, 80)}...`);
  }

  // ── 3. LINKEDIN ──
  console.log("\n💼 LINKEDIN — Posting...\n");

  const linkedinContent = await generateContent(
    "LinkedIn Agent",
    "LinkedIn",
    "Write a professional LinkedIn post about digital entrepreneurship and building income streams online. 3-4 paragraphs. Authority tone. Include a CTA to skilldailypay.com."
  );

  try {
    const liRes = await postToLinkedIn(linkedinContent, LI_TOKEN);
    const success = !!(liRes as any).id;
    results.push({
      agent: "linkedin-agent",
      platform: "linkedin",
      status: success ? "posted" : "generated",
      content: linkedinContent.substring(0, 100) + "...",
      response: liRes,
    });
    console.log(`  ${success ? "✅" : "📝"} LinkedIn: ${success ? "Posted!" : JSON.stringify(liRes).substring(0, 80)}`);
  } catch (err: any) {
    results.push({ agent: "linkedin-agent", platform: "linkedin", status: "generated", content: linkedinContent.substring(0, 100), error: err.message });
    console.log(`  📝 Generated: ${linkedinContent.substring(0, 80)}...`);
  }

  // ── 4. YOUTUBE SHORTS SCRIPTS (parallel) ──
  console.log("\n🎬 YOUTUBE — Generating scripts for 4 channels...\n");

  const ytChannels = ["SkillDailyPay Main", "Channel 2", "Channel 3", "Channel 4"];
  const ytResults = await Promise.all(ytChannels.map(ch =>
    generateContent(
      `YouTube Agent — ${ch}`,
      "YouTube Short",
      `Write a 30-second YouTube Short script about making money online. Include: HOOK (first 2 seconds), CONTENT (main value), CTA (subscribe + skilldailypay.com). Format as HOOK: / CONTENT: / CTA:`
    ).then(script => ({ ch, script }))
  ));
  for (const { ch, script } of ytResults) {
    results.push({ agent: `yt-${ch}`, platform: "youtube", status: "generated", content: script.substring(0, 100) + "..." });
    console.log(`  📝 ${ch}: Script ready`);
  }

  // ── 5. TIKTOK SCRIPTS (parallel) ──
  console.log("\n🎵 TIKTOK — Generating scripts for 4 accounts...\n");

  const tiktokAccounts = ["SkillDailyPay", "Leeijann", "Silix", "Hell Corner"];
  const tiktokTopics = [
    "3 ways to make money online today",
    "Why most people fail at online business",
    "This silicone product is going viral for a reason",
    "The dark truth about 9 to 5 jobs"
  ];

  const ttResults = await Promise.all(tiktokAccounts.map((acct, i) =>
    generateContent(
      `TikTok Agent — ${acct}`,
      "TikTok",
      `Write a TikTok video script about "${tiktokTopics[i]}". 15-30 seconds. Include: HOOK (1 second attention grab), BODY (quick value), CTA. Use trending style.`
    ).then(script => ({ acct, script }))
  ));
  for (const { acct, script } of ttResults) {
    results.push({ agent: `tiktok-${acct}`, platform: "tiktok", status: "generated", content: script.substring(0, 100) + "..." });
    console.log(`  📝 ${acct}: Script ready`);
  }

  // ── 6. INSTAGRAM CAPTIONS (parallel) ──
  console.log("\n📸 INSTAGRAM — Generating captions for 4 accounts...\n");

  const igAccounts = ["Leeijann Design", "Skill Sprint", "Smooth CUT", "SkillDailyPay"];
  const igResults = await Promise.all(igAccounts.map(acct =>
    generateContent(
      `Instagram Agent — ${acct}`,
      "Instagram",
      `Write an Instagram caption for a motivational reel about building your dream business. Include 10 relevant hashtags. For the ${acct} account.`
    ).then(caption => ({ acct, caption }))
  ));
  for (const { acct, caption } of igResults) {
    results.push({ agent: `ig-${acct}`, platform: "instagram", status: "generated", content: caption.substring(0, 100) + "..." });
    console.log(`  📝 ${acct}: Caption ready`);
  }

  // ── 7-9. PINTEREST + BLOG + EMAIL (parallel) ──
  console.log("\n📌 PINTEREST / BLOG / EMAIL — Generating in parallel...\n");

  const [pinContent, blogContent, emailContent] = await Promise.all([
    generateContent(
      "Leeijann — Pinterest Agent",
      "Pinterest",
      "Write a Pinterest pin description for a blog post about '5 Ways to Start Making Money Online in 2026'. Include SEO keywords and a link to skilldailypay.com. Max 500 chars."
    ),
    generateContent(
      "Leeijann — Blog Agent",
      "Blog",
      "Write an SEO-optimized blog post intro (first 2 paragraphs) about 'How to Build a Legacy Online Business in 2026'. Target keyword: 'online business 2026'. Include meta description."
    ),
    generateContent(
      "Email Marketing Agent",
      "Email",
      "Write a short email for the SkillDailyPay newsletter. Subject line + body. Theme: 'Your Monday Motivation — Start Building Your Legacy Today'. Include CTA button text for Legacy Builders Program."
    ),
  ]);

  results.push({ agent: "leeijann", platform: "pinterest", status: "generated", content: pinContent.substring(0, 100) + "..." });
  console.log(`  📝 Pinterest: Pin description ready`);
  results.push({ agent: "leeijann-blog", platform: "blogger", status: "generated", content: blogContent.substring(0, 100) + "..." });
  console.log(`  📝 Blog: Draft ready`);
  results.push({ agent: "email-agent", platform: "systemeio", status: "generated", content: emailContent.substring(0, 100) + "..." });
  console.log(`  📝 Email: Campaign ready`);

  // ── 10. GENERATE IMAGES (parallel) ──
  console.log("\n🎨 IMAGES — Generating branded visuals...\n");

  const imagePrompts = [
    "Bold motivational poster: BUILD YOUR LEGACY GET PAID DAILY, gold text on black, modern business theme",
    "Entrepreneur success lifestyle, laptop with money, golden glow, social media marketing theme",
  ];

  const imgResults = await Promise.all(imagePrompts.map(p => generateImage(p)));
  for (let i = 0; i < imgResults.length; i++) {
    if (imgResults[i]) {
      console.log(`  ✅ Image ${i + 1}: ${imgResults[i]!.substring(0, 60)}...`);
    } else {
      console.log(`  ❌ Image ${i + 1}: Failed`);
    }
  }

  printSummary();
}

function printSummary() {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════════════════════\n");

  const posted = results.filter(r => r.status === "posted").length;
  const generated = results.filter(r => r.status === "generated").length;
  const failed = results.filter(r => r.status === "failed").length;

  console.log(`  ✅ Posted live: ${posted}`);
  console.log(`  📝 Content generated: ${generated}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Total: ${results.length} pieces of content\n`);

  for (const r of results) {
    const icon = r.status === "posted" ? "✅" : r.status === "generated" ? "📝" : "❌";
    console.log(`  ${icon} [${r.platform}] ${r.agent}: ${r.content.substring(0, 60)}...`);
  }

  // Send summary to Telegram
  const telegramMsg = `*Agency Deployment Complete* 🚀${DRY_RUN ? " (DRY RUN)" : ""}

✅ Posted live: ${posted}
📝 Content generated: ${generated}
❌ Failed: ${failed}
📊 Total: ${results.length} pieces

Platforms hit: ${[...new Set(results.map(r => r.platform))].join(", ")}`;

  fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: telegramMsg,
      parse_mode: "Markdown",
    }),
  }).catch(() => {});
}

// Twitter OAuth 1.0a signing for POST requests
async function createTwitterOAuth(method: string, url: string, body: any): Promise<string> {
  const crypto = await import("crypto");

  const consumerKey = process.env.TWITTER_API_KEY!;
  const consumerSecret = process.env.TWITTER_API_SECRET!;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN || "";
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET || "";

  if (!accessToken || !accessTokenSecret) {
    return `Bearer ${process.env.TWITTER_BEARER_TOKEN}`;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const pEncode = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map(k => `${pEncode(k)}=${pEncode(oauthParams[k])}`)
    .join("&");

  const baseString = `${method.toUpperCase()}&${pEncode(url)}&${pEncode(paramString)}`;
  const signingKey = `${pEncode(consumerSecret)}&${pEncode(accessTokenSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  oauthParams.oauth_signature = signature;

  const header = "OAuth " + Object.keys(oauthParams)
    .sort()
    .map(k => `${pEncode(k)}="${pEncode(oauthParams[k])}"`)
    .join(", ");

  return header;
}

deploy().catch(console.error);
