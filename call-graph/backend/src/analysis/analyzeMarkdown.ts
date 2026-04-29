import type { AnalyzeResponse } from "@call-graph/shared";
import { analyzeJavaFragments } from "./javaAnalyzer.js";
import { splitMarkdownToJavaFragments } from "./markdownSplitter.js";

export function analyzeMarkdown(markdown: string): AnalyzeResponse {
  const started = performance.now();

  const split = splitMarkdownToJavaFragments(markdown);
  const java = analyzeJavaFragments(split.fragments);

  const warnings = [...split.warnings, ...java.warnings];

  return {
    nodes: java.nodes,
    edges: java.edges,
    warnings,
    meta: {
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      fragmentCount: split.fragments.length,
      warningCount: warnings.length,
      ambiguousEdgeCount: java.edges.filter((edge) => edge.reason === "ambiguous").length
    }
  };
}
