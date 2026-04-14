/**
 * Email List Agent — Manages email list building via Systeme.io
 *
 * Capabilities:
 * 1. Add/tag contacts when content is posted (cross-platform lead capture)
 * 2. Generate lead magnets with email sequences
 * 3. Score & improve email drafts using expert panel
 * 4. Trigger automations by applying tags
 * 5. Report on list growth
 *
 * Adapted from: ai-marketing-skills (newsletter experts, conversion rubrics, lead magnet engine)
 */

import { env } from "../../config/env";
import * as systemeio from "./systemeio";
import { scoreEmail, improveEmail } from "./email-quality";
import { generateLeadMagnet, generateFullSequence, type LeadMagnetBrief } from "./lead-magnet";

const AISA_URL = env.aisa.baseUrl;
const AISA_KEY = env.aisa.apiKey;

// ═══════════════════════════════════════
//  Tag Constants (create these once in Systeme.io dashboard)
// ═══════════════════════════════════════

export const TAGS = {
  // Source tags — how they found us
  SOURCE_FACEBOOK: "source-facebook",
  SOURCE_INSTAGRAM: "source-instagram",
  SOURCE_TWITTER: "source-twitter",
  SOURCE_LINKEDIN: "source-linkedin",
  SOURCE_YOUTUBE: "source-youtube",
  SOURCE_BLOG: "source-blog",
  SOURCE_TIKTOK: "source-tiktok",

  // Interest tags — what they're interested in
  INTEREST_SKILLS: "interest-skills-training",
  INTEREST_DESIGN: "interest-design",
  INTEREST_ECOMMERCE: "interest-ecommerce",
  INTEREST_AFFILIATE: "interest-affiliate",

  // Funnel tags — trigger automations
  FUNNEL_WELCOME: "funnel-welcome-sequence",
  FUNNEL_LEAD_MAGNET: "funnel-lead-magnet",
  FUNNEL_BUYER: "funnel-buyer",

  // Engagement tags
  ENGAGED_HIGH: "engaged-high",
  ENGAGED_LOW: "engaged-low",
};

// ═══════════════════════════════════════
//  Core Agent Functions
// ═══════════════════════════════════════

/**
 * Add a new subscriber and trigger welcome sequence.
 * Call this when someone opts in from any platform.
 */
export async function addSubscriber(
  email: string,
  firstName: string,
  source: string,
  interest?: string
): Promise<{ success: boolean; contactId?: number; error?: string }> {
  try {
    // Find or create contact
    let existing = await systemeio.findContactByEmail(email);
    let contactId: number;

    if (existing) {
      contactId = existing.id;
      console.log(`  📋 Existing contact: ${email} (ID: ${contactId})`);
    } else {
      const created = await systemeio.createContact({ email, firstName });
      contactId = created.id;
      console.log(`  ✅ New contact: ${email} (ID: ${contactId})`);
    }

    // Apply source tag
    const sourceTag = `source-${source.toLowerCase()}`;
    await applyTag(contactId, sourceTag);

    // Apply interest tag if provided
    if (interest) {
      await applyTag(contactId, `interest-${interest.toLowerCase()}`);
    }

    // Trigger welcome sequence
    if (!existing) {
      await applyTag(contactId, TAGS.FUNNEL_WELCOME);
    }

    return { success: true, contactId };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Cache tags to avoid repeated API calls
let _tagCache: any[] | null = null;

/** Apply a tag to a contact. Uses existing tags only if plan doesn't allow creation. */
async function applyTag(contactId: number, tagName: string): Promise<void> {
  try {
    if (!_tagCache) {
      const tags = await systemeio.listTags();
      _tagCache = tags?.items || [];
    }
    let tag = _tagCache.find((t: any) => t.name === tagName);
    if (!tag) {
      try {
        tag = await systemeio.createTag(tagName);
        _tagCache.push(tag);
      } catch (e: any) {
        if (e.message.includes("upgrade")) {
          // Free plan — use "Legacy" tag as fallback for all subscribers
          tag = _tagCache.find((t: any) => t.name === "Legacy");
          if (!tag) return;
        } else {
          throw e;
        }
      }
    }
    await systemeio.addTagToContact(contactId, tag.id);
  } catch (e: any) {
    if (!e.message.includes("already")) {
      // Silently skip tag errors on free plan
    }
  }
}

/**
 * Generate a complete lead magnet package:
 * - Lead magnet brief
 * - 5-email welcome sequence (full body copy)
 * - Quality scores for each email
 */
export async function createLeadMagnetPackage(
  topic: string,
  brand: string = "SkillDailyPay",
  audience: string = "aspiring entrepreneurs and side hustlers"
): Promise<{
  brief: LeadMagnetBrief;
  emails: { subject: string; body: string; score?: any }[];
}> {
  console.log(`\n📦 Generating lead magnet: "${topic}"`);

  // Step 1: Generate the brief
  console.log("  📝 Creating brief...");
  const brief = await generateLeadMagnet(topic, brand, audience);
  console.log(`  ✅ Brief: "${brief.title}" (${brief.format})`);

  // Step 2: Generate all email bodies
  console.log("  ✉️  Writing email sequence...");
  const emails = await generateFullSequence(brief, brand);
  console.log(`  ✅ ${emails.length} emails written`);

  // Step 3: Score each email
  console.log("  📊 Scoring emails...");
  const scoredEmails = [];
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    try {
      const score = await scoreEmail(email.subject, email.body);
      console.log(`    Email ${i + 1}: ${score.overall_score}/100 (${score.grade})`);

      // Auto-improve if score < 70
      if (score.overall_score < 70) {
        console.log(`    ↻ Score below 70, improving...`);
        const improved = await improveEmail(email.subject, email.body, score);
        const newScore = await scoreEmail(improved.subject, improved.body);
        console.log(`    ✅ Improved: ${newScore.overall_score}/100 (${newScore.grade})`);
        scoredEmails.push({ ...improved, score: newScore });
      } else {
        scoredEmails.push({ ...email, score });
      }
    } catch (e: any) {
      console.log(`    ⚠️  Scoring failed for email ${i + 1}: ${e.message}`);
      scoredEmails.push(email);
    }
  }

  return { brief, emails: scoredEmails };
}

/**
 * Get email list stats from Systeme.io
 */
export async function getListStats(): Promise<{
  totalContacts: number;
}> {
  const total = await systemeio.getContactCount();
  return { totalContacts: total };
}

/**
 * Generate a promotional caption + CTA that drives to opt-in
 * Use this when posting to social media to grow the email list
 */
export async function generateOptInCaption(
  platform: string,
  leadMagnetTitle: string,
  optInUrl: string
): Promise<string> {
  const res = await fetch(`${AISA_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${AISA_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `Write a ${platform} post that promotes a free lead magnet to grow the email list.
Include a clear call-to-action with the opt-in URL. Make it feel valuable, not spammy.
${platform === "Twitter" ? "Max 280 chars." : "Under 150 words."}
${platform === "LinkedIn" ? "No hashtags. Professional tone." : "Use 2-3 hashtags."}`,
        },
        {
          role: "user",
          content: `Promote this free resource: "${leadMagnetTitle}"\nOpt-in URL: ${optInUrl}`,
        },
      ],
      max_tokens: 250,
      temperature: 0.8,
    }),
  });
  const d: any = await res.json();
  return d.choices[0].message.content;
}

// ═══════════════════════════════════════
//  CLI — Run standalone
// ═══════════════════════════════════════

async function main() {
  const cmd = process.argv[2];

  switch (cmd) {
    case "stats": {
      console.log("📊 Email List Stats\n");
      const stats = await getListStats();
      console.log(`  Total contacts: ${stats.totalContacts}`);
      break;
    }

    case "add": {
      const email = process.argv[3];
      const name = process.argv[4] || "";
      const source = process.argv[5] || "manual";
      if (!email) {
        console.log("Usage: agent.ts add <email> [name] [source]");
        break;
      }
      const result = await addSubscriber(email, name, source);
      console.log(result);
      break;
    }

    case "lead-magnet": {
      const topic = process.argv[3] || "5 Side Hustles You Can Start This Weekend";
      const pkg = await createLeadMagnetPackage(topic);
      console.log("\n📦 Lead Magnet Package Ready:");
      console.log(`  Title: ${pkg.brief.title}`);
      console.log(`  Format: ${pkg.brief.format}`);
      console.log(`  Hook: ${pkg.brief.hook}`);
      console.log(`  CTA: ${pkg.brief.optInCTA}`);
      console.log(`  Emails: ${pkg.emails.length}`);
      for (const email of pkg.emails) {
        console.log(`    → ${email.subject}`);
      }
      break;
    }

    case "score": {
      const subject = process.argv[3] || "Your free guide is here";
      const body = process.argv[4] || "Hey there, thanks for signing up...";
      const score = await scoreEmail(subject, body);
      console.log("\n📊 Email Score:");
      console.log(JSON.stringify(score, null, 2));
      break;
    }

    default:
      console.log(`
Email List Agent — Commands:
  stats                          Show email list stats
  add <email> [name] [source]    Add a subscriber
  lead-magnet [topic]            Generate lead magnet + email sequence
  score <subject> <body>         Score an email draft
      `);
  }
}

const isMain = process.argv[1]?.includes("agent");
if (isMain) {
  main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
}
