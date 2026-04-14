/**
 * Vector Store — Lightweight local TF-IDF + cosine similarity search.
 * No external dependencies. Pure Node.js.
 */
import fs from "fs";
import path from "path";
import { ParsedChunk } from "./document-parser";

const STORE_DIR = path.resolve(__dirname, "../../data/vector-store");

interface StoredChunk {
  id: string;
  content: string;
  tfidf: Record<string, number>;
  metadata: ParsedChunk["metadata"];
}

interface VaultIndex {
  chunks: StoredChunk[];
  vocabulary: Record<string, number>;
  totalDocs: number;
}

const vaultCache: Record<string, VaultIndex> = {};

function ensureStore() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
}

function vaultPath(unit: string): string {
  return path.join(STORE_DIR, `${unit}.json`);
}

function loadVault(unit: string): VaultIndex {
  if (vaultCache[unit]) return vaultCache[unit];
  ensureStore();
  const fp = vaultPath(unit);
  if (fs.existsSync(fp)) {
    vaultCache[unit] = JSON.parse(fs.readFileSync(fp, "utf-8"));
    return vaultCache[unit];
  }
  const empty: VaultIndex = { chunks: [], vocabulary: {}, totalDocs: 0 };
  vaultCache[unit] = empty;
  return empty;
}

function saveVault(unit: string) {
  ensureStore();
  const vault = vaultCache[unit];
  if (vault) fs.writeFileSync(vaultPath(unit), JSON.stringify(vault), "utf-8");
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
}

function termFrequency(tokens: string[]): Record<string, number> {
  const tf: Record<string, number> = {};
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
  const len = tokens.length || 1;
  for (const k in tf) tf[k] /= len;
  return tf;
}

function computeTFIDF(tf: Record<string, number>, vocab: Record<string, number>, totalDocs: number): Record<string, number> {
  const tfidf: Record<string, number> = {};
  for (const term in tf) {
    const df = vocab[term] || 1;
    tfidf[term] = tf[term] * (Math.log(totalDocs / df) + 1);
  }
  return tfidf;
}

function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  let dot = 0, magA = 0, magB = 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const va = a[key] || 0, vb = b[key] || 0;
    dot += va * vb; magA += va * va; magB += vb * vb;
  }
  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  return mag === 0 ? 0 : dot / mag;
}

export function addChunks(businessUnit: string, chunks: ParsedChunk[]): number {
  const vault = loadVault(businessUnit);

  for (const chunk of chunks) {
    vault.chunks = vault.chunks.filter(c => c.id !== chunk.id);
    const tokens = tokenize(chunk.content);
    const tf = termFrequency(tokens);
    for (const t of new Set(tokens)) vault.vocabulary[t] = (vault.vocabulary[t] || 0) + 1;
    vault.totalDocs++;
    vault.chunks.push({
      id: chunk.id,
      content: chunk.content,
      tfidf: computeTFIDF(tf, vault.vocabulary, vault.totalDocs),
      metadata: chunk.metadata,
    });
  }

  // Recompute all TF-IDF with updated vocab
  for (const chunk of vault.chunks) {
    const tokens = tokenize(chunk.content);
    const tf = termFrequency(tokens);
    chunk.tfidf = computeTFIDF(tf, vault.vocabulary, vault.totalDocs);
  }

  saveVault(businessUnit);
  return chunks.length;
}

export function search(
  query: string,
  businessUnit?: string,
  limit: number = 5,
  minScore: number = 0.03
): Array<{ content: string; metadata: ParsedChunk["metadata"]; score: number }> {
  const units = businessUnit ? [businessUnit] : listVaults();
  const results: Array<{ content: string; metadata: ParsedChunk["metadata"]; score: number }> = [];

  const queryTokens = tokenize(query);

  for (const unit of units) {
    const vault = loadVault(unit);
    if (!vault.chunks.length) continue;

    const queryTF = termFrequency(queryTokens);
    const queryTFIDF = computeTFIDF(queryTF, vault.vocabulary, vault.totalDocs);

    for (const chunk of vault.chunks) {
      const score = cosineSimilarity(queryTFIDF, chunk.tfidf);
      if (score >= minScore) {
        results.push({ content: chunk.content, metadata: chunk.metadata, score });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

export function listVaults(): string[] {
  ensureStore();
  return fs.readdirSync(STORE_DIR).filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""));
}

export function getVaultStats(unit: string) {
  const vault = loadVault(unit);
  return {
    totalChunks: vault.chunks.length,
    totalWords: vault.chunks.reduce((s, c) => s + (c.metadata.wordCount || 0), 0),
    sources: [...new Set(vault.chunks.map(c => c.metadata.source))],
    vocabularySize: Object.keys(vault.vocabulary).length,
  };
}

export function deleteSource(unit: string, source: string): number {
  const vault = loadVault(unit);
  const before = vault.chunks.length;
  vault.chunks = vault.chunks.filter(c => c.metadata.source !== source);
  vault.totalDocs -= (before - vault.chunks.length);
  saveVault(unit);
  return before - vault.chunks.length;
}

export function clearVault(unit: string): void {
  vaultCache[unit] = { chunks: [], vocabulary: {}, totalDocs: 0 };
  saveVault(unit);
}
