import { env } from "./src/config/env";
import { promoteBlogPost } from "./src/platforms/blogger-promo";

const AISA_URL = env.aisa.baseUrl;
const AISA_KEY = env.aisa.apiKey;
const BLOTATO_KEY = env.blotato.apiKey;
const TOGETHER_KEY = process.env.TOGETHER_API_KEY || "tgp_v1_ZbjPYGlwmg6IKMoY4fGPWCEZacawVafF4wZ-n6_1nUY";
const BH = { "Content-Type": "application/json", "blotato-api-key": BLOTATO_KEY };
const AH = { "Content-Type": "application/json", Authorization: `Bearer ${AISA_KEY}` };

// Blogger config
const BLOGGER_BLOG_ID = process.env.BLOGGER_BLOG_ID || "8576203532277118544";
const BLOGGER_CLIENT_ID = env.blogger.clientId;
const BLOGGER_CLIENT_SECRET = env.blogger.clientSecret;
const BLOGGER_REFRESH_TOKEN = process.env.BLOGGER_REFRESH_TOKEN || "";

async function genContent(platform: string, brand: string, style: string, maxTokens = 300): Promise<string> {
  const res = await fetch(`${AISA_URL}/chat/completions`, {
    method: "POST",
    headers: AH,
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: `You write engaging ${platform} content. Today is Saturday April 12, 2026. ${style}` },
        { role: "user", content: `Write a ${platform} post for "${brand}". Topic: Success mindset — the daily habits that separate winners from dreamers. Make it unique and powerful.` },
      ],
      max_tokens: maxTokens, temperature: 0.9,
    }),
  });
  const d = await res.json();
  return d.choices[0].message.content;
}

async function genImage(prompt: string): Promise<string> {
  const res = await fetch("https://api.together.xyz/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOGETHER_KEY}` },
    body: JSON.stringify({
      model: "black-forest-labs/FLUX.1-schnell",
      prompt, n: 1, width: 1024, height: 1024,
    }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(`Image fail: ${JSON.stringify(d).slice(0, 200)}`);
  return d.data[0].url;
}

async function postBlotato(body: any, label: string) {
  const res = await fetch("https://backend.blotato.com/v2/posts", {
    method: "POST", headers: BH, body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.log(`  ❌ ${label}: ${res.status} — ${text.slice(0, 150)}`);
    return false;
  }
  console.log(`  ✅ ${label}`);
  return true;
}

async function getBloggerAccessToken(): Promise<string> {
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
  const d = await res.json();
  if (!res.ok) throw new Error(`Blogger token refresh failed: ${JSON.stringify(d)}`);
  return d.access_token;
}

async function postToBlogger(title: string, htmlContent: string, imageUrl: string, label: string): Promise<{ success: boolean; url?: string }> {
  try {
    const token = await getBloggerAccessToken();
    const fullHtml = `<div style="text-align:center;margin-bottom:20px;"><img src="${imageUrl}" alt="${title}" style="max-width:100%;border-radius:12px;" /></div>\n${htmlContent}`;
    const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${BLOGGER_BLOG_ID}/posts/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        kind: "blogger#post",
        blog: { id: BLOGGER_BLOG_ID },
        title,
        content: fullHtml,
        labels: ["AI Generated", "Success Mindset", "Entrepreneurship"],
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      console.log(`  ❌ ${label}: ${res.status} — ${JSON.stringify(d).slice(0, 150)}`);
      return { success: false };
    }
    console.log(`  ✅ ${label}: ${d.url}`);
    return { success: true, url: d.url };
  } catch (e: any) {
    console.log(`  ❌ ${label}: ${e.message}`);
    return { success: false };
  }
}

async function main() {
  console.log("🚀 FULL DEPLOY — All Platforms + Blog + FLUX Images\n");

  // Generate 7 images (6 social + 1 blog)
  console.log("🎨 Generating 7 AI images (FLUX.1 Schnell)...");
  const [img1, img2, img3, img4, img5, img6, imgBlog] = await Promise.all([
    genImage("Modern digital workspace with multiple screens showing analytics and growth charts, vibrant blue and orange neon lighting, motivational hustle aesthetic, ultra detailed photorealistic 4K"),
    genImage("Luxury barbershop interior at night, neon LED signs, premium grooming tools on marble counter, moody cinematic lighting, high end aesthetic, ultra detailed photorealistic 4K"),
    genImage("Creative designer studio with large ultrawide monitor showing design software, colorful mood boards and sketches on wall, artistic workspace, warm golden ambient lighting, photorealistic 4K"),
    genImage("Professional entrepreneur in tailored suit at standing desk, panoramic city skyline through floor to ceiling windows, golden hour sunlight, corporate success aesthetic, photorealistic 4K"),
    genImage("Close up of hands typing on laptop keyboard in dark room, screen glow illuminating face, coffee steam rising, city bokeh lights through window, midnight grind aesthetic, photorealistic 4K"),
    genImage("Person on modern rooftop terrace working on laptop at sunrise, city panorama below, warm golden light streaming in, plants and modern furniture around, empire building aesthetic, photorealistic 4K"),
    genImage("Inspirational flat lay desk setup with journal, pen, coffee, laptop, and motivational quote card, morning light, clean minimal aesthetic, warm tones, ultra detailed photorealistic 4K"),
  ]);
  console.log("✅ All 7 images generated\n");

  // Generate all captions + blog article in parallel
  console.log("📝 Generating content (6 captions + 1 blog article)...");
  const [cap1, cap2, cap3, cap4, cap5, cap6, blogArticle] = await Promise.all([
    genContent("Facebook", "Skill Sprint — online skills & side hustles", "Use 3-5 hashtags. Under 200 words. Motivational."),
    genContent("Facebook", "Smooth CUT Barbershop — grooming & self-care", "Use 3-5 hashtags. Under 200 words. Mix success with self-care."),
    genContent("Facebook", "Leeijann Design — creative design & entrepreneurship", "Use 3-5 hashtags. Under 200 words. Creative angle."),
    genContent("LinkedIn", "Skill Daily Pay — professional development", "No hashtags. Professional tone. Under 200 words. Thought leadership."),
    genContent("Twitter", "SkillDailyPay @daily_skill", "Max 280 characters. 1-2 hashtags max. Punchy viral tweet."),
    genContent("Instagram", "SkillDailyPay @skilldailypay", "Use line breaks. 3-5 hashtags at end. Under 150 words."),
    genContent("blog article", "Leeijann Design Blog — creative design, entrepreneurship & lifestyle",
      "Write a full blog post in HTML format. Include <h2> subheadings, <p> paragraphs, and <strong> for emphasis. 500-800 words. SEO-friendly. Include a compelling intro and actionable takeaways. Do NOT include <html>, <head>, or <body> tags — only the article body HTML.",
      1500),
  ]);
  console.log("✅ All content generated\n");

  // Post everything in parallel
  console.log("📤 Posting to all platforms...\n");
  const results = await Promise.all([
    postBlotato({ post: { accountId: "26869", content: { text: cap1, mediaUrls: [img1], platform: "facebook" }, target: { targetType: "facebook", pageId: "119491680317834" } } }, "FB: Skill Sprint"),
    postBlotato({ post: { accountId: "26869", content: { text: cap2, mediaUrls: [img2], platform: "facebook" }, target: { targetType: "facebook", pageId: "112057537294624" } } }, "FB: Smooth CUT"),
    postBlotato({ post: { accountId: "26869", content: { text: cap3, mediaUrls: [img3], platform: "facebook" }, target: { targetType: "facebook", pageId: "110264651436978" } } }, "FB: Leeijann Design"),
    postBlotato({ post: { accountId: "17909", content: { text: cap4, mediaUrls: [img4], platform: "linkedin" }, target: { targetType: "linkedin" } } }, "LinkedIn: Skill Daily Pay"),
    postBlotato({ post: { accountId: "16241", content: { text: cap5, mediaUrls: [img5], platform: "twitter" }, target: { targetType: "twitter" } } }, "X: @daily_skill"),
    postBlotato({ post: { accountId: "41072", content: { text: cap6, mediaUrls: [img6], platform: "instagram" }, target: { targetType: "instagram" } } }, "IG: @skilldailypay"),
  ]);

  // Post blog separately so we can capture the URL
  const blogTitle = "The Daily Habits That Separate Winners From Dreamers";
  const blogResult = await postToBlogger(blogTitle, blogArticle, imgBlog, "Blog: Leeijann Design");
  results.push(blogResult.success);

  // Auto-promote: blog → Facebook Leeijann Design page (with different image)
  if (blogResult.success && blogResult.url) {
    console.log("\n🔄 Auto-promoting blog to Facebook Leeijann Design...");
    const promoResult = await promoteBlogPost(blogTitle, blogResult.url);
    results.push(promoResult);
  }

  const ok = results.filter(Boolean).length;
  const fail = results.filter(r => !r).length;
  console.log(`\n══════════════════════════════════`);
  console.log(`✅ ${ok} posted | ❌ ${fail} failed (${results.length} total)`);
  console.log(`══════════════════════════════════`);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
