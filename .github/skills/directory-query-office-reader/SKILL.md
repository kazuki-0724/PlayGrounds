---
name: directory-query-office-reader
description: 'When the user asks a question, search files under a specified directory and return a relevant file list. If needed, read Microsoft Office/PDF files using a Node.js script (.docx, .xlsx, .pptx, .pdf).'
argument-hint: 'Target directory, user question, and whether Office document content reading is required'
user-invocable: true
---

# Directory Query Office Reader

## Search Policy

- Do not use semantic search.
- Always perform pure keyword matching based on extracted search terms.
- Extract search terms from the user prompt first, then run the file matching script using only those terms.

## When to Use

- Use when the user asks a question and wants matching files from a specific directory.
- Use when file path and text content matching are needed to shortlist candidate files.
- Use when Office documents should be read to validate relevance before final response.

## Outcome

Return:

- a relevant file list under the target directory
- optional extracted text snippets from Office files when required
- concise evidence for why each file is included

## Required Inputs

- target directory path
- user question text
- whether Office document inspection is needed

## Keyword Extraction Rules

1. Extract explicit phrases in quotes/brackets first (for example: 「西部秩父」).
2. Extract core content words (proper nouns, place names, product names, technical terms).
3. Remove instruction/filler words such as: 探して, 教えて, ありますか, どこ, 含む, ドキュメント, ファイル.
4. Build the search query from extracted terms only. Do not append synonyms or inferred terms.
5. If one exact phrase is clearly specified, use only that phrase as the query.

Example:

- User prompt: 「西部秩父」を含むドキュメントを探して
- Extracted search terms: 西部秩父
- Query used for search script: 西部秩父

## Setup

1. Ensure Node.js is available.
2. Install tool dependencies once:
   - change directory to `.github/skills/directory-query-office-reader/tools`
   - run `npm install`

## Procedure

1. Extract search terms from the user question using the keyword extraction rules.
2. Run file matching script with the target directory and extracted search terms.
3. Parse JSON output and get top candidate files.
4. If Office/PDF inspection is needed, read each `.docx`, `.xlsx`, `.pptx`, `.pdf` candidate with the reader script.
5. Return the candidate file list first, then add short Office text findings only where useful.

## Command Examples

Search candidate files:

`node .github/skills/directory-query-office-reader/tools/find-matching-files.js --dir "<TARGET_DIR>" --query "<EXTRACTED_KEYWORDS>" --limit 30`

Read Office file content:

`node .github/skills/directory-query-office-reader/tools/read-office-doc.js --file "<FILE_PATH>" --maxChars 8000`

## Response Format

- `Extracted search terms`: terms selected from the user prompt
- `Matched files`: ordered list by relevance score
- `Reason`: short note per file, such as filename/path/content token match
- `Office findings` (optional): brief extracted text summary per Office file

## Constraints

- Supported formats: `.docx`, `.xlsx`, `.pptx`, `.pdf`
- Legacy binary Office formats (`.doc`, `.xls`, `.ppt`) are not supported by this script
- For large files, output may be truncated

## Quality Checks

- Ensure results are under the specified directory
- Ensure semantic expansion is not used (keyword-only matching)
- Ensure extracted search terms are shown in the response
- Ensure top files are relevant to the user question
- Only read Office files when needed to improve answer quality
- Keep final response concise and evidence-based
