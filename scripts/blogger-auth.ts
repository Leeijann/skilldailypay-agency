import http from "http";
import { URL } from "url";

const CLIENT_ID = process.env.BLOGGER_CLIENT_ID || "";
const CLIENT_SECRET = process.env.BLOGGER_CLIENT_SECRET || "";
const REDIRECT_URI = "http://127.0.0.1:3000/oauth2callback";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  if (url.pathname === "/oauth2callback") {
    const code = url.searchParams.get("code");
    if (!code) {
      res.end("No code received");
      return;
    }
    console.log("Got auth code, exchanging for tokens...");
    
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    console.log("\n✅ TOKENS:");
    console.log(JSON.stringify(tokens, null, 2));
    console.log("\nAdd this to .env:");
    console.log(`BLOGGER_REFRESH_TOKEN=${tokens.refresh_token}`);
    
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h1>✅ Blogger authorized! You can close this tab.</h1>");
    setTimeout(() => process.exit(0), 1000);
  }
});

server.listen(3000, () => {
  console.log("Waiting for OAuth callback on http://127.0.0.1:3000...");
  console.log("\nOpen this URL in your browser:");
  console.log(`\nhttps://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=https://www.googleapis.com/auth/blogger&access_type=offline&prompt=consent\n`);
});
