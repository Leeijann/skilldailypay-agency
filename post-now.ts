import { env } from "./src/config/env";

const BLOTATO_URL = "https://backend.blotato.com/v2";
const BLOTATO_KEY = env.blotato.apiKey;

const headers: Record<string, string> = {
  "Content-Type": "application/json",
  "blotato-api-key": BLOTATO_KEY,
};

const ACCOUNTS = {
  facebook: {
    accountId: "26869",
    pages: [
      { id: "119491680317834", name: "Skill Sprint" },
      { id: "112057537294624", name: "Smooth CUT" },
      { id: "110264651436978", name: "Leeijann Design" },
    ],
  },
  linkedin: { accountId: "17909", name: "Skill Daily Pay" },
};

async function generateContent(platform: string, brand: string): Promise<string> {
  const res = await fetch(`${env.aisa.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.aisa.apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You write short, engaging social media posts. Today is April 12, 2026 (Saturday). No hashtags for LinkedIn. Use 3-5 hashtags for Facebook. Keep it under 200 words. Be motivational and actionable.`,
        },
        {
          role: "user",
          content: `Write a ${platform} post for the brand "${brand}". Topic: Weekend hustle — why successful people use weekends to build their empires while others rest. Make it punchy and inspiring.`,
        },
      ],
      max_tokens: 300,
      temperature: 0.8,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`AISA error: ${JSON.stringify(data)}`);
  return data.choices[0].message.content;
}

async function postToBlotato(body: any, label: string) {
  const res = await fetch(`${BLOTATO_URL}/posts`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.log(`  ❌ ${label}: ${res.status} — ${text.slice(0, 200)}`);
    return { success: false, error: text };
  }
  const data = JSON.parse(text);
  console.log(`  ✅ ${label}: posted!`);
  return { success: true, data };
}

async function main() {
  console.log("🚀 LIVE POSTING — Saturday April 12, 2026\n");
  console.log("📝 Generating content via AISA (GPT-4.1-mini)...\n");

  const [fbSkillSprint, fbSmoothCut, fbLeeijann, linkedinPost] = await Promise.all([
    generateContent("Facebook", "Skill Sprint — online skills & side hustles"),
    generateContent("Facebook", "Smooth CUT Barbershop — grooming & self-care lifestyle"),
    generateContent("Facebook", "Leeijann Design — creative design & entrepreneurship"),
    generateContent("LinkedIn", "Skill Daily Pay — professional development & online business"),
  ]);

  console.log("── Generated Content ──");
  console.log(`Skill Sprint: ${fbSkillSprint.slice(0, 100)}...`);
  console.log(`Smooth CUT: ${fbSmoothCut.slice(0, 100)}...`);
  console.log(`Leeijann: ${fbLeeijann.slice(0, 100)}...`);
  console.log(`LinkedIn: ${linkedinPost.slice(0, 100)}...\n`);
  console.log("📤 Posting...\n");

  const results = await Promise.all([
    postToBlotato({
      post: {
        accountId: ACCOUNTS.facebook.accountId,
        content: { text: fbSkillSprint, mediaUrls: [], platform: "facebook" },
        target: { targetType: "facebook", pageId: ACCOUNTS.facebook.pages[0].id },
      },
    }, "FB: Skill Sprint"),

    postToBlotato({
      post: {
        accountId: ACCOUNTS.facebook.accountId,
        content: { text: fbSmoothCut, mediaUrls: [], platform: "facebook" },
        target: { targetType: "facebook", pageId: ACCOUNTS.facebook.pages[1].id },
      },
    }, "FB: Smooth CUT"),

    postToBlotato({
      post: {
        accountId: ACCOUNTS.facebook.accountId,
        content: { text: fbLeeijann, mediaUrls: [], platform: "facebook" },
        target: { targetType: "facebook", pageId: ACCOUNTS.facebook.pages[2].id },
      },
    }, "FB: Leeijann Design"),

    postToBlotato({
      post: {
        accountId: ACCOUNTS.linkedin.accountId,
        content: { text: linkedinPost, mediaUrls: [], platform: "linkedin" },
        target: { targetType: "linkedin" },
      },
    }, "LinkedIn: Skill Daily Pay"),
  ]);

  console.log("\n── Summary ──");
  const success = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`✅ ${success} posted | ❌ ${failed} failed`);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
