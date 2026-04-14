/**
 * Lead Magnet Generator — adapted from ai-marketing-skills/conversion-ops/survey_lead_magnet.py
 *
 * Generates lead magnet briefs, opt-in page copy, and email sequences
 * for different audience segments. Uses AISA for content generation.
 */

import { env } from "../../config/env";

const AISA_URL = env.aisa.baseUrl;
const AISA_KEY = env.aisa.apiKey;

export interface LeadMagnetBrief {
  title: string;
  format: "guide" | "checklist" | "template" | "swipe_file" | "cheat_sheet" | "mini_course";
  hook: string;
  outline: string[];
  targetAudience: string;
  optInCTA: string;
  emailSequence: EmailInSequence[];
}

export interface EmailInSequence {
  day: number;
  subject: string;
  purpose: string;
  cta: string;
}

/** Generate a lead magnet brief + welcome email sequence for a topic */
export async function generateLeadMagnet(
  topic: string,
  brand: string,
  audience: string
): Promise<LeadMagnetBrief> {
  const res = await fetch(`${AISA_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${AISA_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are a conversion optimization expert. Generate a lead magnet brief with a 5-email welcome sequence.

The lead magnet must:
- Solve a specific, urgent problem
- Be deliverable instantly (digital)
- Take <15 min to consume
- Lead naturally to the paid product

The email sequence must:
- Day 0: Deliver the lead magnet + quick win
- Day 1: Share a personal story related to the topic
- Day 3: Teach one actionable framework
- Day 5: Social proof / case study
- Day 7: Soft pitch to paid offer

Output JSON:
{
  "title": "Lead magnet title",
  "format": "checklist|guide|template|swipe_file|cheat_sheet|mini_course",
  "hook": "One-sentence hook that makes them opt in",
  "outline": ["Section 1...", "Section 2...", ...],
  "targetAudience": "Who this is for",
  "optInCTA": "Button text for opt-in",
  "emailSequence": [
    { "day": 0, "subject": "...", "purpose": "...", "cta": "..." },
    ...
  ]
}`,
        },
        {
          role: "user",
          content: `Brand: ${brand}\nTopic: ${topic}\nTarget audience: ${audience}`,
        },
      ],
      max_tokens: 1200,
      temperature: 0.8,
      response_format: { type: "json_object" },
    }),
  });
  const d: any = await res.json();
  return JSON.parse(d.choices[0].message.content);
}

/** Generate the full email body for one email in the sequence */
export async function generateEmailBody(
  brief: LeadMagnetBrief,
  emailIndex: number,
  brand: string
): Promise<{ subject: string; body: string }> {
  const email = brief.emailSequence[emailIndex];
  const res = await fetch(`${AISA_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${AISA_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `Write a complete email for an automated welcome sequence.

Rules:
- Sound human, not AI. Short paragraphs. Conversational.
- Use the reader's first name placeholder: {{firstName}}
- One clear CTA — not multiple
- Under 300 words
- Use line breaks for scanability
- No corporate jargon

Context:
- Brand: ${brand}
- Lead magnet: "${brief.title}" (${brief.format})
- This is email ${emailIndex + 1} of ${brief.emailSequence.length}
- Day ${email.day}: ${email.purpose}
- CTA: ${email.cta}
- Subject line guide: ${email.subject}

Output JSON: { "subject": "final subject line", "body": "full email body in plain text" }`,
        },
        { role: "user", content: `Write email #${emailIndex + 1} for the "${brief.title}" welcome sequence.` },
      ],
      max_tokens: 600,
      temperature: 0.75,
      response_format: { type: "json_object" },
    }),
  });
  const d: any = await res.json();
  return JSON.parse(d.choices[0].message.content);
}

/** Generate all emails in a sequence */
export async function generateFullSequence(
  brief: LeadMagnetBrief,
  brand: string
): Promise<{ subject: string; body: string }[]> {
  const emails = [];
  for (let i = 0; i < brief.emailSequence.length; i++) {
    const email = await generateEmailBody(brief, i, brand);
    emails.push(email);
  }
  return emails;
}
