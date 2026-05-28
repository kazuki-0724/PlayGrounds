#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }
  return args;
}

function normalizeText(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[。、，．！!？?「」『』（）()\[\]{}【】]/g, " ")
    .trim();
}

function tokenize(input) {
  const normalized = normalizeText(input);
  const raw = normalized
    .split(/\s+/)
    .filter(Boolean);

  const jaKeywordRuns = normalized.match(/[一-龠々〆ヵヶァ-ヶーa-z0-9]{2,}/gi) || [];
  const tokens = new Set([...raw, ...jaKeywordRuns]);

  // Add lightweight variants for Japanese compound words without exploding n-grams.
  for (const token of [...tokens]) {
    if (!/[一-龠々〆ヵヶァ-ヶー]/.test(token)) {
      continue;
    }

    if (token.endsWith("情報") && token.length > 2) {
      tokens.add(token.slice(0, -2));
    }

    if (token.endsWith("駅") && token.length >= 3) {
      const chars = Array.from(token);
      tokens.add(chars.slice(-3).join(""));
    }
  }

  return [...tokens];
}

function isSkippableDir(name) {
  return [".git", ".hg", ".svn", "node_modules", "dist", "build", "coverage", ".next"].includes(name);
}

function isLikelyTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const textLike = new Set([
    ".txt", ".md", ".markdown", ".json", ".yaml", ".yml", ".xml", ".html", ".css", ".scss", ".less",
    ".js", ".cjs", ".mjs", ".ts", ".tsx", ".jsx", ".py", ".rb", ".go", ".java", ".cs", ".php", ".sh",
    ".ps1", ".sql", ".toml", ".ini", ".cfg", ".conf", ".env", ".csv", ".log"
  ]);
  return textLike.has(ext);
}

function isOfficeOrPdfFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".docx" || ext === ".xlsx" || ext === ".pptx" || ext === ".pdf";
}

function walkFiles(rootDir) {
  const results = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];

    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!isSkippableDir(entry.name)) {
          stack.push(fullPath);
        }
        continue;
      }

      if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function readTextContent(filePath, maxBytes) {
  try {
    const stat = fs.statSync(filePath);
    const length = Math.min(stat.size, maxBytes);
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, 0);
    fs.closeSync(fd);
    return buffer.toString("utf8");
  } catch {
    return "";
  }
}

function readOfficeOrPdfContent(filePath, maxChars) {
  const readerScript = path.resolve(__dirname, "read-office-doc.js");
  try {
    return execFileSync(
      process.execPath,
      [readerScript, "--file", filePath, "--maxChars", String(maxChars)],
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
    );
  } catch {
    return "";
  }
}

function scoreFile(filePath, queryTokens, rootDir) {
  const relPath = path.relative(rootDir, filePath);
  const pathNorm = normalizeText(relPath);
  const fileNameNorm = normalizeText(path.basename(filePath));

  let score = 0;
  const matched = [];

  for (const token of queryTokens) {
    if (fileNameNorm.includes(token)) {
      score += 5;
      matched.push(`filename:${token}`);
    } else if (pathNorm.includes(token)) {
      score += 3;
      matched.push(`path:${token}`);
    }
  }

  let content = "";
  if (isLikelyTextFile(filePath)) {
    content = normalizeText(readTextContent(filePath, 200_000));
  } else if (isOfficeOrPdfFile(filePath)) {
    content = normalizeText(readOfficeOrPdfContent(filePath, 50_000));
  }

  if (content) {
    for (const token of queryTokens) {
      if (content.includes(token)) {
        score += 2;
        matched.push(`content:${token}`);
      }
    }
  }

  return { score, matched, relPath };
}

function main() {
  const args = parseArgs(process.argv);
  const targetDir = path.resolve(String(args.dir || ""));
  const query = String(args.query || "");
  const limit = Number(args.limit || 30);

  if (!targetDir || !fs.existsSync(targetDir)) {
    console.error("Error: --dir must be an existing directory path.");
    process.exit(1);
  }

  if (!query.trim()) {
    console.error("Error: --query is required.");
    process.exit(1);
  }

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    console.error("Error: query did not contain searchable tokens.");
    process.exit(1);
  }

  const files = walkFiles(targetDir);
  const scored = [];

  for (const filePath of files) {
    const result = scoreFile(filePath, queryTokens, targetDir);
    if (result.score > 0) {
      scored.push(result);
    }
  }

  scored.sort((a, b) => b.score - a.score || a.relPath.localeCompare(b.relPath));

  const top = scored.slice(0, Math.max(1, limit));
  const output = {
    directory: targetDir,
    query,
    totalCandidates: scored.length,
    results: top.map((item) => ({
      file: item.relPath.replaceAll(path.sep, "/"),
      score: item.score,
      matchedBy: item.matched
    }))
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
