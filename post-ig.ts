import { env } from "./src/config/env";

const AISA_URL = env.aisa.baseUrl;
const AISA_KEY = env.aisa.apiKey;
const BLOTATO_KEY = env.blotato.apiKey;

async function generateCaption(): Promise<string> {
  const res = await fetch(`${AISA_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${AISA_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You write engaging Instagram captions. Use line breaks for readability. 3-5 relevant hashtags at the end. Keep under 150 words. Motivational, real, no fluff. Today is Saturday April 12, 2026." },
        { role: "user", content: "Write an Instagram caption for @skilldailypay about weekend hustle — building your empire while others sleep. Make it fire." },
      ],
      max_tokens: 250,
      temperature: 0.85,
    }),
  });
  const data = await res.json();
  return data.choices[0].message.content;
}

async function generateImage(prompt: string): Promise<string> {
  const res = await fetch(`${AISA_URL}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${AISA_KEY}` },
    body: JSON.stringify({
      model: "seedream-4-5-251128",
      prompt,
      n: 1,
      response_format: "url",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Image gen failed: ${JSON.stringify(data).slice(0, 200)}`);
  return data.data[0].url;
}

async function main() {
  console.log("📝 Generating caption...");
  const caption = await generateCaption();
  console.log("Caption:", caption.slice(0, 120), "...\n");

  console.log("🎨 Generating AI image (Seedream 4.5)...");
  const imageUrl = await generateImage(
    "Motivational entrepreneur working on a laptop late at night, modern dark office with large windows, city skyline glowing in the background, neon purple and blue ambient lighting, cinematic hustle aesthetic, photorealistic, ultra detailed, 4K"
  );
  console.log("✅ Image generated:", imageUrl.slice(0, 80), "...\n");

  console.log("📤 Posting to Instagram (@skilldailypay)...");
  const res = await fetch("https://backend.blotato.com/v2/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json", "blotato-api-key": BLOTATO_KEY },
    body: JSON.stringify({
      post: {
        accountId: "41072",
        content: { text: caption, mediaUrls: [imageUrl], platform: "instagram" },
        target: { targetType: "instagram" },
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.log("❌ Failed:", res.status, text.slice(0, 300));
  } else {
    console.log("✅ Posted to Instagram (@skilldailypay) with AI image!");
  }
}
main().catch(e => console.error("Fatal:", e.message));
