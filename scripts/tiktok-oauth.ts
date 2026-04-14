/**
 * TikTok OAuth2 helper with PKCE — opens browser for authorization,
 * catches the callback, exchanges code for access token.
 *
 * Usage: npx tsx scripts/tiktok-oauth.ts
 */
import http from "http";
import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;
const REDIRECT_URI = "https://leeijann.github.io/skilldailypay-privacy/callback";
const SCOPES = "user.info.basic,video.upload,video.list,video.publish";

if (!CLIENT_KEY || !CLIENT_SECRET) {
  console.error("Missing TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET in .env");
  process.exit(1);
}

// Generate PKCE code verifier and challenge
const codeVerifier = crypto.randomBytes(32).toString("base64url");
const codeChallenge = crypto
  .createHash("sha256")
  .update(codeVerifier)
  .digest("base64url");

console.log("PKCE code_verifier:", codeVerifier);
console.log("PKCE code_challenge:", codeChallenge);

// 1. Start local server to catch the callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost:3456`);

  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("Auth error:", error, url.searchParams.get("error_description"));
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`<h1>Error: ${error}</h1><p>${url.searchParams.get("error_description")}</p>`);
      server.close();
      return;
    }

    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>No authorization code received</h1>");
      server.close();
      return;
    }

    console.log("Got authorization code:", code.substring(0, 10) + "...");

    // 2. Exchange code for access token (with PKCE code_verifier)
    try {
      const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
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

      const data = await tokenRes.json();
      console.log("\n=== TikTok Token Response ===");
      console.log(JSON.stringify(data, null, 2));

      if (data.access_token) {
        console.log("\nACCESS TOKEN:", data.access_token);
        console.log("REFRESH TOKEN:", data.refresh_token);
        console.log("OPEN ID:", data.open_id);
        console.log("\nAdd this to your .env file:");
        console.log(`TIKTOK_ACCESS_TOKEN=${data.access_token}`);
        console.log(`TIKTOK_REFRESH_TOKEN=${data.refresh_token}`);
        console.log(`TIKTOK_OPEN_ID=${data.open_id}`);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h1>TikTok Connected!</h1><p>You can close this window. Check the terminal for your tokens.</p>");
      } else {
        console.error("Token exchange failed:", data);
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h1>Token exchange failed</h1><pre>${JSON.stringify(data, null, 2)}</pre>`);
      }
    } catch (err) {
      console.error("Token exchange error:", err);
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`<h1>Error exchanging token</h1><pre>${err}</pre>`);
    }

    setTimeout(() => server.close(), 1000);
  }
});

server.listen(3456, () => {
  const authUrl =
    `https://www.tiktok.com/v2/auth/authorize/` +
    `?client_key=${CLIENT_KEY}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=sdp_agency` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256`;

  console.log("\nOpening TikTok authorization page...");
  console.log("Auth URL:", authUrl);

  // Open in default browser via PowerShell
  const { execSync } = require("child_process");
  try {
    execSync(`powershell -Command "Start-Process '${authUrl}'"`, { stdio: "ignore" });
  } catch {
    console.log("\nOpen this URL in your browser:");
    console.log(authUrl);
  }
});
