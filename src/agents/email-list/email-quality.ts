/**
 * Email Quality Scoring — adapted from ai-marketing-skills newsletter expert panel.
 *
 * Scores email content across 6 dimensions using an AI panel of experts.
 * Uses AISA (GPT-4.1-mini) for cheap, fast evaluation.
 */

import { env } from "../../config/env";

const AISA_URL = env.aisa.baseUrl;
const AISA_KEY = env.aisa.apiKey;

// Expert panel rubric (from ai-marketing-skills/content-ops/experts/newsletter.md)
const SCORING_PROMPT = `You are a panel of 8 email marketing experts scoring a newsletter/email draft.

Score each dimension 0-100:

1. **Value Density** — Every paragraph teaches something specific. No filler.
2. **Scanability** — Headers, bullets, bold. A skimmer gets 80% of the value.
3. **Why-This-Matters Clarity** — Reader knows immediately why they should care.
4. **CTA Clarity** — One clear next action. Reader knows exactly what to do.
5. **Subject Line** — Would you open this? 40-50 chars, curiosity or value signal.
6. **Hook Power** — First 2 sentences are impossible to stop reading. Specific, surprising.
7. **Voice Authenticity** — Sounds human, not AI. Short punchy sentences, personal framing.
8. **Forward-Worthy** — Would a reader forward this to a friend? The ultimate test.

For each dimension, give:
- Score (0-100)
- One-sentence reason

Then give an overall score (weighted average) and top 2 priority fixes.

Respond in JSON format:
{
  "scores": {
    "value_density": { "score": N, "reason": "..." },
    "scanability": { "score": N, "reason": "..." },
    "why_this_matters": { "score": N, "reason": "..." },
    "cta_clarity": { "score": N, "reason": "..." },
    "subject_line": { "score": N, "reason": "..." },
    "hook_power": { "score": N, "reason": "..." },
    "voice_authenticity": { "score": N, "reason": "..." },
    "forward_worthy": { "score": N, "reason": "..." }
  },
  "overall_score": N,
  "grade": "A/B/C/D/F",
  "priority_fixes": ["fix1", "fix2"]
}`;

export interface EmailScore {
  scores: Record<string, { score: number; reason: string }>;
  overall_score: number;
  grade: string;
  priority_fixes: string[];
}

/** Score an email draft across 8 quality dimensions */
export async function scoreEmail(subjectLine: string, bodyContent: string): Promise<EmailScore> {
  const res = await fetch(`${AISA_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${AISA_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: SCORING_PROMPT },
        { role: "user", content: `Subject Line: ${subjectLine}\n\nEmail Body:\n${bodyContent}` },
      ],
      max_tokens: 800,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });
  const d: any = await res.json();
  return JSON.parse(d.choices[0].message.content);
}

/** Generate an improved version of an email based on scores */
export async function improveEmail(
  subjectLine: string,
  bodyContent: string,
  scores: EmailScore
): Promise<{ subject: string; body: string }> {
  const fixes = scores.priority_fixes.join(", ");
  const weakest = Object.entries(scores.scores)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${v.reason}`)
    .join("\n");

  const res = await fetch(`${AISA_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${AISA_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You rewrite emails to score higher. Fix these issues: ${fixes}\n\nWeakest areas:\n${weakest}\n\nKeep the same message but make it punchier, more scannable, and more human. Output JSON: {"subject": "...", "body": "..."}`,
        },
        { role: "user", content: `Subject: ${subjectLine}\n\nBody:\n${bodyContent}` },
      ],
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });
  const d: any = await res.json();
  return JSON.parse(d.choices[0].message.content);
}
