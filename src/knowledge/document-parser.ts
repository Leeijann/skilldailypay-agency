/**
 * Document Parser — Ingests markdown, text, PDF, HTML, and web pages
 * into chunked documents ready for the knowledge engine.
 */
import fs from "fs";
import path from "path";

export interface ParsedChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    sourceType: "markdown" | "text" | "pdf" | "html" | "web";
    title: string;
    businessUnit: string;
    chunkIndex: number;
    totalChunks: number;
    headings: string[];
    wordCount: number;
    ingestedAt: string;
  };
}

export interface IngestOptions {
  businessUnit: string;
  title?: string;
  chunkSize?: number;       // target words per chunk (default 300)
  chunkOverlap?: number;    // overlap words between chunks (default 50)
}

const DEFAULT_CHUNK_SIZE = 300;
const DEFAULT_CHUNK_OVERLAP = 50;

/** Parse a local file into chunks */
export async function parseFile(filePath: string, options: IngestOptions): Promise<ParsedChunk[]> {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, "utf-8");
  const title = options.title || path.basename(filePath, ext);

  switch (ext) {
    case ".md":
    case ".markdown":
      return chunkMarkdown(raw, filePath, title, options);
    case ".txt":
      return chunkPlainText(raw, filePath, title, options);
    case ".html":
    case ".htm":
      return chunkHTML(raw, filePath, title, options);
    case ".pdf":
      return chunkPDF(filePath, title, options);
    default:
      // Treat unknown as plain text
      return chunkPlainText(raw, filePath, title, options);
  }
}

/** Parse raw text content */
export function parseText(text: string, source: string, options: IngestOptions): ParsedChunk[] {
  const title = options.title || source;
  return chunkPlainText(text, source, title, options);
}

/** Parse HTML string */
export function parseHTML(html: string, source: string, options: IngestOptions): ParsedChunk[] {
  const title = options.title || source;
  return chunkHTML(html, source, title, options);
}

/** Parse a web page URL */
export async function parseWebPage(url: string, options: IngestOptions): Promise<ParsedChunk[]> {
  const res = await fetch(url);
  const html = await res.text();
  const title = options.title || url;
  return chunkHTML(html, url, title, { ...options }, "web");
}

// ── Chunking strategies ──

function chunkMarkdown(raw: string, source: string, title: string, options: IngestOptions): ParsedChunk[] {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const overlap = options.chunkOverlap || DEFAULT_CHUNK_OVERLAP;

  // Split by headings first for semantic boundaries
  const sections: { heading: string; content: string }[] = [];
  const lines = raw.split("\n");
  let currentHeading = title;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,4}\s+(.+)/);
    if (headingMatch) {
      if (currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n") });
      }
      currentHeading = headingMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentContent.length > 0) {
    sections.push({ heading: currentHeading, content: currentContent.join("\n") });
  }

  // Now chunk each section
  const chunks: ParsedChunk[] = [];
  let globalIndex = 0;

  for (const section of sections) {
    const words = section.content.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) continue;

    let start = 0;
    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      const chunkText = `## ${section.heading}\n\n${words.slice(start, end).join(" ")}`;

      chunks.push({
        id: `${slugify(title)}-${globalIndex}`,
        content: chunkText,
        metadata: {
          source,
          sourceType: "markdown",
          title,
          businessUnit: options.businessUnit,
          chunkIndex: globalIndex,
          totalChunks: 0, // filled after
          headings: [section.heading],
          wordCount: end - start,
          ingestedAt: new Date().toISOString(),
        },
      });

      globalIndex++;
      start = end - overlap;
      if (start >= words.length) break;
    }
  }

  // Fill totalChunks
  for (const chunk of chunks) {
    chunk.metadata.totalChunks = chunks.length;
  }
  return chunks;
}

function chunkPlainText(raw: string, source: string, title: string, options: IngestOptions): ParsedChunk[] {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const overlap = options.chunkOverlap || DEFAULT_CHUNK_OVERLAP;
  const words = raw.split(/\s+/).filter(w => w.length > 0);
  const chunks: ParsedChunk[] = [];

  let start = 0;
  let index = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push({
      id: `${slugify(title)}-${index}`,
      content: words.slice(start, end).join(" "),
      metadata: {
        source,
        sourceType: "text",
        title,
        businessUnit: options.businessUnit,
        chunkIndex: index,
        totalChunks: 0,
        headings: [],
        wordCount: end - start,
        ingestedAt: new Date().toISOString(),
      },
    });

    index++;
    start = end - overlap;
    if (start >= words.length) break;
  }

  for (const chunk of chunks) {
    chunk.metadata.totalChunks = chunks.length;
  }
  return chunks;
}

function chunkHTML(
  html: string,
  source: string,
  title: string,
  options: IngestOptions,
  sourceType: "html" | "web" = "html"
): ParsedChunk[] {
  // Strip HTML tags, extract text
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  const chunks = chunkPlainText(text, source, title, options);
  for (const chunk of chunks) {
    chunk.metadata.sourceType = sourceType;
  }
  return chunks;
}

async function chunkPDF(filePath: string, title: string, options: IngestOptions): Promise<ParsedChunk[]> {
  // PDF support disabled — convert PDFs to text first
  console.warn(`PDF parsing skipped for ${filePath}. Convert to .txt or .md first.`);
  return [];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}
