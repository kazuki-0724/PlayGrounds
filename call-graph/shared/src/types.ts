export type NodeKind = "class" | "method";

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  fqcn: string;
  signature?: string;
  filePath: string;
  line: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: "calls";
  confidence: number;
  reason: "resolved" | "ambiguous";
}

export interface AnalysisWarning {
  code:
    | "MISSING_PATH_HEADER"
    | "INVALID_CODE_BLOCK"
    | "TREE_SITTER_PARSE_FAILED"
    | "UNRESOLVED_INVOCATION";
  message: string;
  filePath?: string;
}

export interface AnalysisMeta {
  elapsedMs: number;
  fragmentCount: number;
  warningCount: number;
  ambiguousEdgeCount: number;
}

export interface AnalyzeRequest {
  markdown: string;
}

export interface AnalyzeResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  warnings: AnalysisWarning[];
  meta: AnalysisMeta;
}
