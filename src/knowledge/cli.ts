/**
 * Knowledge Engine CLI — Ingest, query, and manage knowledge from command line.
 *
 * Usage:
 *   npx tsx src/knowledge/cli.ts ingest <file-or-dir> <business-unit> [title]
 *   npx tsx src/knowledge/cli.ts ingest-url <url> <business-unit> [title]
 *   npx tsx src/knowledge/cli.ts query "<question>" [business-unit]
 *   npx tsx src/knowledge/cli.ts search "<question>" [business-unit]
 *   npx tsx src/knowledge/cli.ts stats [business-unit]
 *   npx tsx src/knowledge/cli.ts vaults
 *   npx tsx src/knowledge/cli.ts ingest-all
 */
import path from "path";
import fs from "fs";
import {
  ingestFile,
  ingestDirectory,
  ingestWebPage,
  ingestText,
  query,
  quickSearch,
  stats,
  vaults,
} from "./knowledge-engine";

const KNOWLEDGE_DIR = path.resolve(__dirname, "../../knowledge");

async function main() {
  const [, , command, ...args] = process.argv;

  switch (command) {
    case "ingest": {
      const [target, businessUnit, title] = args;
      if (!target || !businessUnit) {
        console.error("Usage: ingest <file-or-dir> <business-unit> [title]");
        process.exit(1);
      }

      const fullPath = path.resolve(target);
      const isDir = fs.statSync(fullPath).isDirectory();

      if (isDir) {
        console.log(`Ingesting directory: ${fullPath} → ${businessUnit}`);
        const result = await ingestDirectory(fullPath, { businessUnit, title });
        console.log(`\n✅ Ingested ${result.files} files (${result.totalChunks} chunks)`);
        console.log("\nSummaries:");
        result.summaries.forEach((s, i) => console.log(`\n--- File ${i + 1} ---\n${s}`));
      } else {
        console.log(`Ingesting file: ${fullPath} → ${businessUnit}`);
        const result = await ingestFile(fullPath, { businessUnit, title });
        console.log(`\n✅ Ingested ${result.chunks} chunks`);
        console.log("\nSummary:\n" + result.summary);
      }
      break;
    }

    case "ingest-url": {
      const [url, businessUnit, title] = args;
      if (!url || !businessUnit) {
        console.error("Usage: ingest-url <url> <business-unit> [title]");
        process.exit(1);
      }
      console.log(`Ingesting web page: ${url} → ${businessUnit}`);
      const result = await ingestWebPage(url, { businessUnit, title });
      console.log(`\n✅ Ingested ${result.chunks} chunks`);
      console.log("\nSummary:\n" + result.summary);
      break;
    }

    case "query": {
      const [question, businessUnit] = args;
      if (!question) {
        console.error("Usage: query \"<question>\" [business-unit]");
        process.exit(1);
      }
      console.log(`\n🔍 Querying: "${question}"${businessUnit ? ` in ${businessUnit}` : " (all vaults)"}\n`);
      const result = await query(question, businessUnit);
      console.log(`📊 Confidence: ${result.confidence}\n`);
      console.log("📝 Answer:\n" + result.answer);
      console.log("\n📚 Sources:");
      result.sources.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.title} (score: ${s.score}) — ${s.source}`);
      });
      break;
    }

    case "search": {
      const [question, businessUnit] = args;
      if (!question) {
        console.error("Usage: search \"<question>\" [business-unit]");
        process.exit(1);
      }
      console.log(`\n🔍 Searching: "${question}"\n`);
      const results = quickSearch(question, businessUnit);
      if (results.length === 0) {
        console.log("No results found.");
      } else {
        results.forEach((r, i) => {
          console.log(`\n--- Result ${i + 1} (score: ${r.score.toFixed(3)}) ---`);
          console.log(`Source: ${r.metadata.title} (${r.metadata.source})`);
          console.log(`Vault: ${r.metadata.businessUnit}`);
          console.log(r.content.substring(0, 300) + "...");
        });
      }
      break;
    }

    case "stats": {
      const [businessUnit] = args;
      console.log("\n📊 Knowledge Base Stats:\n");
      const s = stats(businessUnit);
      for (const [unit, info] of Object.entries(s)) {
        console.log(`  📁 ${unit}:`);
        console.log(`     Chunks: ${(info as any).totalChunks}`);
        console.log(`     Words: ${(info as any).totalWords}`);
        console.log(`     Vocabulary: ${(info as any).vocabularySize} terms`);
        console.log(`     Sources: ${(info as any).sources.join(", ") || "none"}`);
        console.log();
      }
      break;
    }

    case "vaults": {
      const v = vaults();
      console.log("\n📚 Knowledge Vaults:");
      if (v.length === 0) {
        console.log("  (none — run 'ingest-all' to populate)");
      } else {
        v.forEach(name => console.log(`  📁 ${name}`));
      }
      break;
    }

    case "ingest-all": {
      console.log("🚀 Ingesting all brand knowledge...\n");

      const units = ["skilldailypay", "leeijann", "silix", "agency-ops"];
      let totalFiles = 0;
      let totalChunks = 0;

      for (const unit of units) {
        const dir = path.join(KNOWLEDGE_DIR, unit);
        if (!fs.existsSync(dir)) {
          console.log(`  ⏭  Skipping ${unit} (no directory)`);
          continue;
        }

        const files = fs.readdirSync(dir).filter(f => f.endsWith(".md") || f.endsWith(".txt"));
        if (files.length === 0) {
          console.log(`  ⏭  Skipping ${unit} (no files)`);
          continue;
        }

        console.log(`  📁 ${unit}: ${files.length} files`);
        const result = await ingestDirectory(dir, { businessUnit: unit });
        totalFiles += result.files;
        totalChunks += result.totalChunks;
        console.log(`     ✅ ${result.totalChunks} chunks ingested`);
      }

      console.log(`\n🎉 Done! ${totalFiles} files → ${totalChunks} chunks across ${units.length} vaults`);
      break;
    }

    default:
      console.log(`
Knowledge Engine CLI

Commands:
  ingest <file-or-dir> <business-unit> [title]  — Ingest documents
  ingest-url <url> <business-unit> [title]       — Ingest a web page
  ingest-all                                      — Ingest all brand docs
  query "<question>" [business-unit]              — Ask a question (AI answer)
  search "<question>" [business-unit]             — Quick search (no AI)
  stats [business-unit]                           — View vault statistics
  vaults                                          — List all vaults
      `);
  }
}

main().catch(console.error);
