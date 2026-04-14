/**
 * Blotato — Universal social media posting API.
 * One key, all platforms. No more individual OAuth tokens.
 * https://backend.blotato.com/v2
 */

import { env } from "../config/env";

const BASE_URL = env.blotato?.baseUrl || "https://backend.blotato.com/v2";

function getHeaders(): Record<string, string> {
  const key = env.blotato?.apiKey;
  if (!key) throw new Error("BLOTATO_API_KEY not set in .env");
  return {
    "Content-Type": "application/json",
    "blotato-api-key": key,
  };
}

async function blotato(method: string, path: string, body?: any): Promise<any> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Blotato ${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

// ═══════════════════════════════════════
//  Account IDs (from Blotato dashboard)
// ═══════════════════════════════════════

export const BLOTATO_ACCOUNTS = {
  facebook: {
    accountId: 26869,
    pages: {
      skillSprint:    { id: "119491680317834", name: "Skill Sprint" },
      smoothCut:      { id: "112057537294624", name: "Smooth CUT" },
      leeijannDesign: { id: "110264651436978", name: "Leeijann Design" },
    },
  },
  youtube: {
    soAdorable:     { accountId: 33403, name: "SO ADORABLE (Smooth Cut)" },
    healthCorner:   { accountId: 33404, name: "The Health Corner" },
    affiliateWorld: { accountId: 33406, name: "Affiliate World" },
  },
  linkedin: {
    skillDailyPay: { accountId: 17909, name: "Skill Daily Pay" },
  },
  pinterest: {
    skillDailyPay: { accountId: 5544, name: "skilldailypay" },
  },
  tiktok: {
    ironrive1: { accountId: 37990, name: "ironrive1" },
    tren_dz:   { accountId: 38001, name: "tren_dz" },
  },
} as const;

// ═══════════════════════════════════════
//  API Methods
// ═══════════════════════════════════════

/** List all connected accounts */
export async function listAccounts() {
  return blotato("GET", "/users/me/accounts");
}

/** Get sub-accounts (e.g. Facebook pages under a Facebook account) */
export async function getSubaccounts(accountId: number) {
  return blotato("GET", `/users/me/accounts/${accountId}/subaccounts`);
}

// ── Facebook ──

export interface FacebookPostOptions {
  pageId: string;
  message: string;
  link?: string;
  mediaUrl?: string;
}

export async function postToFacebook(opts: FacebookPostOptions) {
  return blotato("POST", `/users/me/accounts/${BLOTATO_ACCOUNTS.facebook.accountId}/posts`, {
    subaccountId: opts.pageId,
    text: opts.message,
    ...(opts.link && { link: opts.link }),
    ...(opts.mediaUrl && { mediaUrls: [opts.mediaUrl] }),
  });
}

/** Post to all 3 Facebook pages at once */
export async function postToAllFacebookPages(message: string, link?: string) {
  const pages = Object.values(BLOTATO_ACCOUNTS.facebook.pages);
  return Promise.all(
    pages.map(page =>
      postToFacebook({ pageId: page.id, message, link })
        .then(r => ({ page: page.name, success: true, result: r }))
        .catch(e => ({ page: page.name, success: false, error: e.message }))
    )
  );
}

// ── LinkedIn ──

export interface LinkedInPostOptions {
  text: string;
  link?: string;
  mediaUrl?: string;
}

export async function postToLinkedIn(opts: LinkedInPostOptions) {
  const acct = BLOTATO_ACCOUNTS.linkedin.skillDailyPay;
  return blotato("POST", `/users/me/accounts/${acct.accountId}/posts`, {
    text: opts.text,
    ...(opts.link && { link: opts.link }),
    ...(opts.mediaUrl && { mediaUrls: [opts.mediaUrl] }),
  });
}

// ── YouTube ──

export interface YouTubePostOptions {
  accountId: number;
  title: string;
  description: string;
  mediaUrl: string; // Required — must be a video URL
  privacyStatus?: "public" | "unlisted" | "private";
  tags?: string[];
}

export async function postToYouTube(opts: YouTubePostOptions) {
  return blotato("POST", `/users/me/accounts/${opts.accountId}/posts`, {
    title: opts.title,
    text: opts.description,
    mediaUrls: [opts.mediaUrl],
    privacyStatus: opts.privacyStatus || "public",
    ...(opts.tags && { tags: opts.tags }),
  });
}

// ── TikTok ──

export interface TikTokPostOptions {
  accountId: number;
  text: string;
  mediaUrl: string; // Required — image or video URL
  privacyLevel?: string;
  isAiGenerated?: boolean;
}

export async function postToTikTok(opts: TikTokPostOptions) {
  return blotato("POST", `/users/me/accounts/${opts.accountId}/posts`, {
    text: opts.text,
    mediaUrls: [opts.mediaUrl],
    privacyLevel: opts.privacyLevel || "SELF_ONLY",
    disabledComments: false,
    disabledDuet: false,
    disabledStitch: false,
    isBrandedContent: false,
    isYourBrand: false,
    isAiGenerated: opts.isAiGenerated ?? true,
  });
}

// ── Pinterest ──

export interface PinterestPostOptions {
  title: string;
  description: string;
  link?: string;
  mediaUrl: string; // Required — image URL
  boardId?: string;
}

export async function postToPinterest(opts: PinterestPostOptions) {
  const acct = BLOTATO_ACCOUNTS.pinterest.skillDailyPay;
  return blotato("POST", `/users/me/accounts/${acct.accountId}/posts`, {
    title: opts.title,
    text: opts.description,
    mediaUrls: [opts.mediaUrl],
    ...(opts.link && { link: opts.link }),
    ...(opts.boardId && { boardId: opts.boardId }),
  });
}

// ── Check Post Status ──

export async function checkPostStatus(accountId: number, postId: string) {
  return blotato("GET", `/users/me/accounts/${accountId}/posts/${postId}`);
}

// ── Post to All Platforms (text-only) ──

export interface PostToAllOptions {
  text: string;
  link?: string;
}

/**
 * Post text content to all text-capable platforms (Facebook 3 pages + LinkedIn).
 * YouTube, TikTok, Pinterest require media and must be called separately.
 */
export async function postToAllText(opts: PostToAllOptions) {
  const results = await Promise.all([
    postToAllFacebookPages(opts.text, opts.link)
      .then(r => ({ platform: "facebook", results: r })),
    postToLinkedIn({ text: opts.text, link: opts.link })
      .then(r => ({ platform: "linkedin", success: true, result: r }))
      .catch(e => ({ platform: "linkedin", success: false, error: e.message })),
  ]);
  return results;
}
