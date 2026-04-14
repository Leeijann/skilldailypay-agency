/**
 * TikTok token exchange — takes an auth code and exchanges it for access token.
 * Usage: npx tsx scripts/tiktok-exchange.ts AUTH_CODE CODE_VERIFIER
 */
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;
const REDIRECT_URI = "https://leeijann.github.io/skilldailypay-privacy/callback";

const code = process.argv[2];
const codeVerifier = process.argv[3];

if (!code || !codeVerifier) {
  console.error("Usage: npx tsx scripts/tiktok-exchange.ts AUTH_CODE CODE_VERIFIER");
  process.exit(1);
}

async function exchange() {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: CLIENT_KEY,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  const data = await res.json();
  console.log("\n=== TikTok Token Response ===");
  console.log(JSON.stringify(data, null, 2));

  if (data.access_token) {
    console.log("\nACCESS TOKEN:", data.access_token);
    console.log("REFRESH TOKEN:", data.refresh_token);
    console.log("OPEN ID:", data.open_id);
  }
}

exchange().catch(console.error);
