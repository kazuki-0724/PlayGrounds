#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const mammoth = require("mammoth");
const ExcelJS = require("exceljs");
const JSZip = require("jszip");
const pdfParse = require("pdf-parse");

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

function cleanText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function readDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return cleanText(result.value);
}

async function readXlsx(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const chunks = [];

  for (const sheet of workbook.worksheets) {
    chunks.push(`[Sheet: ${sheet.name}]`);

    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = row.values;
      const cells = Array.isArray(values)
        ? values.slice(1).map((cell) => {
            if (cell === null || cell === undefined) {
              return "";
            }

            if (typeof cell === "object" && cell.text) {
              return String(cell.text);
            }

            return String(cell);
          })
        : [String(values)];

      chunks.push(cells.join(","));
    });

    chunks.push("");
  }

  return cleanText(chunks.join("\n\n"));
}

async function readPptx(filePath) {
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const slideEntries = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const aNum = Number(a.match(/slide(\d+)\.xml/)[1]);
      const bNum = Number(b.match(/slide(\d+)\.xml/)[1]);
      return aNum - bNum;
    });

  const chunks = [];

  for (const name of slideEntries) {
    const xml = await zip.file(name).async("text");
    const textNodes = Array.from(xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)).map((m) => m[1]);
    const slideText = cleanText(textNodes.join("\n"));
    const match = name.match(/slide(\d+)\.xml/);
    const slideNo = match ? match[1] : "?";

    chunks.push(`[Slide: ${slideNo}]`);
    chunks.push(slideText);
  }

  return cleanText(chunks.join("\n\n"));
}

async function readPdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const result = await pdfParse(buffer);
  return cleanText(result.text);
}

async function readOfficeDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".docx") {
    return readDocx(filePath);
  }

  if (ext === ".xlsx") {
    return readXlsx(filePath);
  }

  if (ext === ".pptx") {
    return readPptx(filePath);
  }

  if (ext === ".pdf") {
    return readPdf(filePath);
  }

  throw new Error("Unsupported extension. Supported: .docx, .xlsx, .pptx, .pdf");
}

async function main() {
  const args = parseArgs(process.argv);
  const filePath = path.resolve(String(args.file || ""));
  const maxChars = Number(args.maxChars || 8000);

  if (!filePath || !fs.existsSync(filePath)) {
    console.error("Error: --file must be an existing file path.");
    process.exit(1);
  }

  try {
    const text = await readOfficeDocument(filePath);
    const shortened = text.length > maxChars ? `${text.slice(0, maxChars)}\n\n[TRUNCATED]` : text;
    console.log(shortened);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
