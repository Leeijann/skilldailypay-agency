import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

function lazy(key: string): string {
  // Returns a getter that only throws when the value is actually accessed
  return process.env[key] || "";
}

function requireKey(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}. Add it to your .env file.`);
  }
  return value;
}

function optional(key: string, fallback = ""): string {
  return process.env[key] || fallback;
}

export const env = {
  // Claude API
  anthropic: {
    get apiKey(): string { return requireKey("ANTHROPIC_API_KEY"); },
  },

  // Telegram — Ricardo's command interface
  telegram: {
    botToken: optional("TELEGRAM_BOT_TOKEN"),
    chatId: optional("TELEGRAM_CHAT_ID"),
  },

  // n8n automation
  n8n: {
    baseUrl: optional("N8N_BASE_URL", "http://localhost:5678"),
    apiKey: optional("N8N_API_KEY"),
  },

  // NotebookLM knowledge base
  notebookLm: {
    apiKey: optional("NOTEBOOKLM_API_KEY"),
  },

  // OpenRouter — used by Leeijann for blog writing
  openRouter: {
    apiKey: optional("OPENROUTER_API_KEY"),
  },

  // Brave Search — used by Ivy for research
  braveSearch: {
    apiKey: optional("BRAVE_SEARCH_API_KEY"),
  },

  // Platform APIs
  platforms: {
    youtube: { apiKey: optional("YOUTUBE_API_KEY") },
    tiktok: { accessToken: optional("TIKTOK_ACCESS_TOKEN") },
    instagram: { accessToken: optional("INSTAGRAM_ACCESS_TOKEN") },
    facebook: { accessToken: optional("FACEBOOK_ACCESS_TOKEN") },
    twitter: {
      apiKey: optional("TWITTER_API_KEY"),
      apiSecret: optional("TWITTER_API_SECRET"),
    },
    pinterest: { accessToken: optional("PINTEREST_ACCESS_TOKEN") },
    linkedin: { accessToken: optional("LINKEDIN_ACCESS_TOKEN") },
  },

  // TikTok Shop — Silix operations
  tiktokShop: {
    appKey: optional("TIKTOK_SHOP_APP_KEY"),
    appSecret: optional("TIKTOK_SHOP_APP_SECRET"),
  },

  // Finance
  finance: {
    cryptoWallet: optional("CRYPTO_WALLET_ADDRESS"),
  },
} as const;
