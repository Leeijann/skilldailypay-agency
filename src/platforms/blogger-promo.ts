/**
 * Blogger → Facebook Auto-Promoter
 *
 * Watches for new Blogger posts on Leeijann Design blog.
 * When a new post is found, generates a unique promo image + caption
 * and posts it to the Leeijann Design Facebook page via Blotato.
 */

import { env } from "../config/env";

const BLOGGER_BLOG_ID = process.env.BLOGGER_BLOG_ID || "8576203532277118544";
const BLOGGER_CLIENT_ID = env.blogger.clientId;
const BLOGGER_CLIENT_SECRET = env.blogger.clientSecret;
const BLOGGER_REFRESH_TOKEN = process.env.BLOGGER_REFRESH_TOKEN || "";
const AISA_URL = env.aisa.baseUrl;
const AISA_KEY = env.aisa.apiKey;
const BLOTATO_KEY = env.blotato.apiKey;
const TOGETHER_KEY = process.env.TOGETHER_API_KEY || "";

// Leeijann Design Facebook page
const FB_ACCOUNT_ID = "26869";
const FB_PAGE_ID = "110264651436978";

async function getBloggerToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: BLOGGER_CLIENT_ID,
      client_secret: BLOGGER_CLIENT_SECRET,
      refresh_token: BLOGGER_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const d: any = await res.json();
  if (!res.ok) throw new Error(`Blogger token failed: ${JSON.stringify(d)}`);
  return d.access_token;
}

export interface BlogPost {
  id: string;
  title: string;
  url: string;
  content: string;
  published: string;
  labels?: string[];
}

/** Get the latest N posts from Blogger */
export async function getLatestPosts(count = 5): Promise<BlogPost[]> {
  const token = await getBloggerToken();
  const res = await fetch(
    `https://www.googleapis.com/blogger/v3/blogs/${BLOGGER_BLOG_ID}/posts?maxResults=${count}&orderBy=published&sortOption=DESCENDING`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const d: any = await res.json();
  if (!res.ok) throw new Error(`Blogger fetch failed: ${JSON.stringify(d)}`);
  return (d.items || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    url: p.url,
    content: p.content,
    published: p.published,
    labels: p.labels,
  }));
}

/** Generate a promotional Facebook caption for a blog post */
export async function generatePromoCaption(blogTitle: string, blogUrl: string): Promise<string> {
  const res = await fetch(`${AISA_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${AISA_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You write engaging Facebook posts that promote blog articles for Leeijann Design.
Keep it under 150 words. Use 3-5 hashtags. Include a call-to-action to read the full article.
Make it feel personal and exciting — not salesy. Use emojis sparingly (2-3 max).
Do NOT include the URL in the text — it will be attached as a link automatically.`,
        },
        {
          role: "user",
          content: `Write a Facebook promo post for this new blog article: "${blogTitle}"`,
        },
      ],
      max_tokens: 250,
      temperature: 0.85,
    }),
  });
  const d: any = await res.json();
  return d.choices[0].message.content;
}

/** Generate a unique promo image (different from the blog's hero image) */
export async function generatePromoImage(blogTitle: string): Promise<string> {
  // Extract theme from title to make a relevant but different image
  const res = await fetch(`${AISA_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${AISA_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You create image prompts for FLUX AI image generator. Output ONLY the prompt, nothing else. Make it photorealistic, vibrant, eye-catching for social media. No text overlays. Keep it under 50 words.",
        },
        {
          role: "user",
          content: `Create an eye-catching social media promo image prompt related to this blog topic: "${blogTitle}". Make it different from a typical hero image — think promotional, scroll-stopping, vibrant.`,
        },
      ],
      max_tokens: 100,
      temperature: 0.9,
    }),
  });
  const d: any = await res.json();
  const imagePrompt = d.choices[0].message.content;

  const imgRes = await fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOGETHER_KEY}` },
    body: JSON.stringify({
      model: "black-forest-labs/FLUX.1-schnell",
      prompt: imagePrompt,
      n: 1,
      width: 1024,
      height: 1024,
    }),
  });
  const imgData: any = await imgRes.json();
  if (!imgRes.ok) throw new Error(`Image gen failed: ${JSON.stringify(imgData).slice(0, 200)}`);
  return imgData.data[0].url;
}

/** Post a blog promotion to Leeijann Design Facebook page */
export async function promoteBlogPost(blogTitle: string, blogUrl: string): Promise<boolean> {
  console.log(`\n📰 Promoting blog: "${blogTitle}"`);

  // Generate promo caption and image in parallel
  const [caption, imageUrl] = await Promise.all([
    generatePromoCaption(blogTitle, blogUrl),
    generatePromoImage(blogTitle),
  ]);

  console.log(`  Caption: ${caption.slice(0, 80)}...`);
  console.log(`  Image generated ✓`);

  // Post to Facebook Leeijann Design page with blog link
  const res = await fetch("https://backend.blotato.com/v2/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json", "blotato-api-key": BLOTATO_KEY },
    body: JSON.stringify({
      post: {
        accountId: FB_ACCOUNT_ID,
        content: {
          text: caption,
          mediaUrls: [imageUrl],
          platform: "facebook",
        },
        target: {
          targetType: "facebook",
          pageId: FB_PAGE_ID,
          link: blogUrl,
        },
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.log(`  ❌ FB Promo failed: ${res.status} — ${text.slice(0, 150)}`);
    return false;
  }
  console.log(`  ✅ FB Promo posted on Leeijann Design page!`);
  return true;
}

// ── Standalone watcher mode ──
// Run with: npx tsx src/platforms/blogger-promo.ts
// Checks for posts published in the last 30 minutes and promotes any new ones

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const PROMOTED_FILE = join(process.cwd(), ".blogger-promoted.json");

function getPromotedIds(): Set<string> {
  try {
    if (existsSync(PROMOTED_FILE)) {
      const data = JSON.parse(readFileSync(PROMOTED_FILE, "utf8"));
      return new Set(data.promotedIds || []);
    }
  } catch {}
  return new Set();
}

function savePromotedIds(ids: Set<string>) {
  writeFileSync(PROMOTED_FILE, JSON.stringify({ promotedIds: [...ids], lastCheck: new Date().toISOString() }, null, 2));
}

async function watchAndPromote() {
  console.log("🔍 Checking Blogger for new posts...\n");
  const posts = await getLatestPosts(5);
  const promoted = getPromotedIds();
  let newCount = 0;

  for (const post of posts) {
    if (promoted.has(post.id)) {
      console.log(`  ⏭️  Already promoted: "${post.title}"`);
      continue;
    }
    // Check if post is recent (within last 2 hours)
    const publishedAt = new Date(post.published).getTime();
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    if (publishedAt < twoHoursAgo) {
      console.log(`  ⏭️  Too old to promote: "${post.title}" (${post.published})`);
      promoted.add(post.id); // Mark as seen so we don't check again
      continue;
    }

    const success = await promoteBlogPost(post.title, post.url);
    if (success) {
      promoted.add(post.id);
      newCount++;
    }
  }

  savePromotedIds(promoted);
  console.log(`\n── Done: ${newCount} new posts promoted ──`);
}

// Only run watcher if executed directly (not imported)
const isMain = process.argv[1]?.includes("blogger-promo");
if (isMain) {
  watchAndPromote().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
}
