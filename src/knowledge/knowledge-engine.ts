/**
 * Knowledge Engine — The brain of the agency.
 * Our NotebookLM clone: ingest docs, ask questions, get AI-powered answers
 * grounded in YOUR documents.
 *
 * Features:
 * - Ingest: markdown, text, PDF, HTML, web pages
 * - Query: semantic search + Claude RAG (Retrieval Augmented Generation)
 * - Summarize: auto-summary on ingest
 * - Per-business-unit isolation (vaults)
 * - Agent-callable API
 */
import { parseFile, parseText, parseHTML, parseWebPage, ParsedChunk, IngestOptions } from "./document-parser";
import { addChunks, search, listVaults, getVaultStats, deleteSource, clearVault } from "./vector-store";
import fs from "fs";
import path from "path";

const SUMMARIES_DIR = path.resolve(__dirname, "../../data/summaries");

// Lazy-load Anthropic SDK only when needed for AI features
let _client: any = null;
async function getClient() {
  if (!_client) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const { env } = await import("../config/env");
    _client = new Anthropic({ apiKey: env.anthropic.apiKey });
  }
  return _client;
}

function ensureSummariesDir() {
  if (!fs.existsSync(SUMMARIES_DIR)) {
    fs.mkdirSync(SUMMARIES_DIR, { recursive: true });
  }
}

// ── INGEST ──

/** Ingest a local file into a business unit vault */
export async function ingestFile(filePath: string, options: IngestOptions): Promise<{
  chunks: number;
  summary: string;
}> {
  const chunks = await parseFile(filePath, options);
  const count = addChunks(options.businessUnit, chunks);

  return { chunks: count, summary: `Ingested ${count} chunks from ${path.basename(filePath)}` };
}

/** Ingest raw text */
export async function ingestText(text: string, source: string, options: IngestOptions): Promise<{
  chunks: number;
  summary: string;
}> {
  const chunks = parseText(text, source, options);
  const count = addChunks(options.businessUnit, chunks);
  return { chunks: count, summary: `Ingested ${count} chunks from ${source}` };
}

/** Ingest a web page by URL */
export async function ingestWebPage(url: string, options: IngestOptions): Promise<{
  chunks: number;
  summary: string;
}> {
  const chunks = await parseWebPage(url, options);
  const count = addChunks(options.businessUnit, chunks);
  return { chunks: count, summary: `Ingested ${count} chunks from ${url}` };
}

/** Bulk ingest all files from a directory */
export async function ingestDirectory(dirPath: string, options: IngestOptions): Promise<{
  files: number;
  totalChunks: number;
  summaries: string[];
}> {
  const files = fs.readdirSync(dirPath).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return [".md", ".txt", ".html", ".pdf", ".markdown"].includes(ext);
  });

  let totalChunks = 0;
  const summaries: string[] = [];

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const result = await ingestFile(filePath, {
      ...options,
      title: options.title ? `${options.title} - ${file}` : file,
    });
    totalChunks += result.chunks;
    summaries.push(result.summary);
  }

  return { files: files.length, totalChunks, summaries };
}

// ── QUERY (RAG) ──

export interface QueryResult {
  answer: string;
  sources: Array<{
    title: string;
    source: string;
    score: number;
    snippet: string;
  }>;
  confidence: "high" | "medium" | "low";
}

/** Ask a question — retrieves relevant chunks and generates an AI answer */
export async function query(
  question: string,
  businessUnit?: string,
  maxSources: number = 5
): Promise<QueryResult> {
  // 1. Retrieve relevant chunks
  const results = search(question, businessUnit, maxSources);

  if (results.length === 0) {
    return {
      answer: `No relevant documents found${businessUnit ? ` in the ${businessUnit} knowledge base` : ""}. Try ingesting some documents first.`,
      sources: [],
      confidence: "low",
    };
  }

  // 2. Build context from retrieved chunks
  const context = results
    .map((r, i) => `[Source ${i + 1}: ${r.metadata.title} (${r.metadata.source})]:\n${r.content}`)
    .join("\n\n---\n\n");

  // 3. Generate answer with Claude
  const client = await getClient();
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `You are a knowledge assistant for the SkillDailyPay AI Media Agency. Answer questions based ONLY on the provided source documents. If the sources don't contain enough information, say so. Be specific and actionable. Always reference which source your answer comes from.`,
    messages: [
      {
        role: "user",
        content: `Based on the following sources, answer this question: "${question}"\n\n${context}`,
      },
    ],
  });

  const answer = response.content[0].type === "text" ? response.content[0].text : "";

  // 4. Determine confidence based on scores
  const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;
  const confidence = avgScore > 0.3 ? "high" : avgScore > 0.15 ? "medium" : "low";

  return {
    answer,
    sources: results.map(r => ({
      title: r.metadata.title,
      source: r.metadata.source,
      score: Math.round(r.score * 100) / 100,
      snippet: r.content.substring(0, 150) + "...",
    })),
    confidence,
  };
}

/** Quick search without AI generation — just returns matching chunks */
export function quickSearch(
  question: string,
  businessUnit?: string,
  limit: number = 5
): Array<{ content: string; metadata: ParsedChunk["metadata"]; score: number }> {
  return search(question, businessUnit, limit);
}

// ── SUMMARIZE ──

/** Generate and store a summary of content */
async function generateSummary(text: string, title: string, businessUnit: string): Promise<string> {
  // Truncate if too long for a single call
  const truncated = text.length > 8000 ? text.substring(0, 8000) + "\n\n[truncated]" : text;

  try {
    const client = await getClient();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Summarize this document in 3-5 bullet points. Focus on key facts, strategies, and actionable information:\n\nTitle: ${title}\n\n${truncated}`,
        },
      ],
    });

    const summary = response.content[0].type === "text" ? response.content[0].text : "Summary generation failed.";

    // Store summary
    ensureSummariesDir();
    const summaryFile = path.join(SUMMARIES_DIR, `${businessUnit}-${slugify(title)}.md`);
    fs.writeFileSync(summaryFile, `# Summary: ${title}\n\n${summary}\n\nGenerated: ${new Date().toISOString()}\n`, "utf-8");

    return summary;
  } catch (err) {
    console.error("Summary generation error:", err);
    return `[Summary failed for ${title}]`;
  }
}

// ── MANAGEMENT ──

/** Get stats for all vaults or a specific one */
export function stats(businessUnit?: string) {
  if (businessUnit) {
    return { [businessUnit]: getVaultStats(businessUnit) };
  }

  const vaults = listVaults();
  const allStats: Record<string, any> = {};
  for (const v of vaults) {
    allStats[v] = getVaultStats(v);
  }
  return allStats;
}

/** List all knowledge vaults */
export function vaults(): string[] {
  return listVaults();
}

/** Remove a source document from a vault */
export function removeSource(businessUnit: string, source: string): number {
  return deleteSource(businessUnit, source);
}

/** Clear all knowledge from a vault */
export function clearKnowledge(businessUnit: string): void {
  clearVault(businessUnit);
}

/** Get context for an agent — retrieves most relevant info for a task */
export async function getAgentContext(
  agentName: string,
  taskDescription: string,
  businessUnit: string,
  maxChunks: number = 3
): Promise<string> {
  const results = search(taskDescription, businessUnit, maxChunks);
  if (results.length === 0) return "";

  let context = `## Knowledge Context for ${agentName}\n\n`;
  for (const r of results) {
    context += `### ${r.metadata.title} (relevance: ${Math.round(r.score * 100)}%)\n${r.content}\n\n`;
  }
  return context;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}
