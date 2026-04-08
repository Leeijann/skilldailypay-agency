/**
 * Knowledge Base Connector
 * Interfaces with NotebookLM and local brand docs to feed context to agents.
 *
 * Each business unit has its own knowledge base:
 * - SkillDailyPay: Legacy Builders Program docs, funnel strategies
 * - Leeijann Design: Blog SOPs, SEO guidelines, content calendar
 * - Silix LLC: Product catalog, supplier info, TikTok Shop policies
 * - Hell Corner: TBD
 */

import fs from "fs";
import path from "path";

const BRAND_DOCS_DIR = path.resolve(__dirname, "../../src/knowledge/brand-docs");

export interface KnowledgeDoc {
  id: string;
  businessUnit: string;
  title: string;
  content: string;
  tags: string[];
  lastUpdated: string;
}

export interface KnowledgeQuery {
  query: string;
  businessUnit?: string;
  tags?: string[];
  limit?: number;
}

/** Business unit knowledge base paths */
const KNOWLEDGE_BASES: Record<string, string> = {
  skilldailypay: "skilldailypay",
  leeijann: "leeijann",
  silix: "silix",
  hellcorner: "hellcorner",
};

function ensureDirs() {
  for (const dir of Object.values(KNOWLEDGE_BASES)) {
    const fullPath = path.join(BRAND_DOCS_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
}

/** Store a document in the knowledge base */
export function storeDocument(doc: KnowledgeDoc): void {
  ensureDirs();
  const dir = path.join(BRAND_DOCS_DIR, doc.businessUnit);
  const filePath = path.join(dir, `${doc.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(doc, null, 2), "utf-8");
}

/** Retrieve documents by business unit */
export function getDocsByUnit(businessUnit: string): KnowledgeDoc[] {
  ensureDirs();
  const dir = path.join(BRAND_DOCS_DIR, businessUnit);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  return files.map((f) => {
    const content = fs.readFileSync(path.join(dir, f), "utf-8");
    return JSON.parse(content);
  });
}

/** Simple keyword search across all knowledge bases */
export function searchKnowledge(query: KnowledgeQuery): KnowledgeDoc[] {
  ensureDirs();
  const units = query.businessUnit
    ? [query.businessUnit]
    : Object.keys(KNOWLEDGE_BASES);

  const results: KnowledgeDoc[] = [];
  const queryLower = query.query.toLowerCase();

  for (const unit of units) {
    const docs = getDocsByUnit(unit);
    for (const doc of docs) {
      const matchesQuery =
        doc.title.toLowerCase().includes(queryLower) ||
        doc.content.toLowerCase().includes(queryLower);
      const matchesTags =
        !query.tags || query.tags.some((t) => doc.tags.includes(t));

      if (matchesQuery && matchesTags) {
        results.push(doc);
      }
    }
  }

  return results.slice(0, query.limit || 10);
}

/** Get context string for an agent about a specific business unit */
export function getBusinessContext(businessUnit: string): string {
  const docs = getDocsByUnit(businessUnit);
  if (docs.length === 0) return "";

  let context = `## Knowledge Base: ${businessUnit}\n\n`;
  for (const doc of docs) {
    context += `### ${doc.title}\n${doc.content}\n\n`;
  }
  return context;
}

/** Initialize default brand docs */
export function initBrandDocs() {
  const defaults: KnowledgeDoc[] = [
    {
      id: "sdp-overview",
      businessUnit: "skilldailypay",
      title: "SkillDailyPay Overview",
      content:
        "SkillDailyPay is an online business education brand. Primary product: Legacy Builders Program. " +
        "Website: skilldailypay.com. Focus: Teaching people to build real income streams online through " +
        "digital entrepreneurship, affiliate marketing, and content creation.",
      tags: ["brand", "overview", "legacy-builders"],
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "leeijann-overview",
      businessUnit: "leeijann",
      title: "Leeijann Design Overview",
      content:
        "Leeijann Design is a content and design brand. Primary platform: leeijanndesign.blogspot.com. " +
        "Focus: Blog content, design tips, and creative entrepreneurship. Supports SkillDailyPay through " +
        "SEO content and cross-promotion.",
      tags: ["brand", "overview", "blog"],
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "silix-overview",
      businessUnit: "silix",
      title: "Silix LLC Overview",
      content:
        "Silix LLC is an e-commerce company specializing in silicone products. " +
        "Sales channels: TikTok Shop, Amazon (planned). Products are marketed through " +
        "TikTok affiliate videos and product demonstration content.",
      tags: ["brand", "overview", "ecommerce"],
      lastUpdated: new Date().toISOString(),
    },
  ];

  for (const doc of defaults) {
    storeDocument(doc);
  }
}
