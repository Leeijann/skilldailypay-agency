import { env } from "./src/config/env";

async function main() {
  console.log("📝 Generating tweet via AISA...");
  const aiRes = await fetch(`${env.aisa.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.aisa.apiKey}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You write viral tweets. Max 280 characters. No hashtag spam — 1-2 max. Punchy, motivational, real talk. Today is Saturday April 12, 2026." },
        { role: "user", content: "Write a tweet for @daily_skill about weekend hustle — why the grind doesnt stop on weekends for real entrepreneurs." },
      ],
      max_tokens: 100,
      temperature: 0.9,
    }),
  });
  const aiData = await aiRes.json();
  const tweet = aiData.choices[0].message.content;
  console.log("Tweet:", tweet, "\n");

  console.log("📤 Posting to X...");
  const res = await fetch("https://backend.blotato.com/v2/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json", "blotato-api-key": env.blotato.apiKey },
    body: JSON.stringify({
      post: {
        accountId: "16241",
        content: { text: tweet, mediaUrls: [], platform: "twitter" },
        target: { targetType: "twitter" },
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.log("❌ Failed:", res.status, text);
  } else {
    console.log("✅ Posted to X (@daily_skill)!");
  }
}
main().catch(e => console.error("Fatal:", e.message));
