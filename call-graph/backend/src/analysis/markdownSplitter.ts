import type { AnalysisWarning } from "@call-graph/shared";

export interface JavaFragment {
  path: string;
  code: string;
  startLine: number;
}

export interface SplitResult {
  fragments: JavaFragment[];
  warnings: AnalysisWarning[];
}

const PATH_HEADER = /^###\s+(.+)$/;
const JAVA_BLOCK_START = /^```java\s*$/;
const BLOCK_END = /^```\s*$/;

export function splitMarkdownToJavaFragments(markdown: string): SplitResult {
  const lines = markdown.split(/\r?\n/);
  const fragments: JavaFragment[] = [];
  const warnings: AnalysisWarning[] = [];

  let currentPath: string | undefined;
  let inJavaBlock = false;
  let blockStartLine = -1;
  let codeLines: string[] = [];

  lines.forEach((line, index) => {
    const pathMatch = line.match(PATH_HEADER);
    if (pathMatch && !inJavaBlock) {
      currentPath = pathMatch[1].trim();
      return;
    }

    if (!inJavaBlock && line.match(JAVA_BLOCK_START)) {
      inJavaBlock = true;
      blockStartLine = index + 1;
      codeLines = [];
      return;
    }

    if (inJavaBlock && line.match(BLOCK_END)) {
      inJavaBlock = false;
      if (!currentPath) {
        warnings.push({
          code: "MISSING_PATH_HEADER",
          message: `Java block at line ${blockStartLine} has no preceding ### path header`
        });
      } else {
        fragments.push({
          path: currentPath,
          code: codeLines.join("\n"),
          startLine: blockStartLine
        });
      }
      return;
    }

    if (inJavaBlock) {
      codeLines.push(line);
    }
  });

  if (inJavaBlock) {
    warnings.push({
      code: "INVALID_CODE_BLOCK",
      message: `Unclosed java code block started at line ${blockStartLine}`
    });
  }

  return { fragments, warnings };
}
