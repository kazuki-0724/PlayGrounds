import type { AnalysisWarning, GraphEdge, GraphNode } from "@call-graph/shared";
import Parser from "tree-sitter";
import Java from "tree-sitter-java";
import type { JavaFragment } from "./markdownSplitter.js";

interface MethodCandidate {
  id: string;
  name: string;
  className: string;
}

interface InvocationRecord {
  callerId: string;
  methodName: string;
  filePath: string;
}

export interface JavaAnalysisResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  warnings: AnalysisWarning[];
}

function nodeText(source: string, startIndex: number, endIndex: number): string {
  return source.slice(startIndex, endIndex);
}

function walk(node: Parser.SyntaxNode, visit: (n: Parser.SyntaxNode) => void): void {
  visit(node);
  for (let i = 0; i < node.childCount; i += 1) {
    const child = node.child(i);
    if (child) {
      walk(child, visit);
    }
  }
}

export function analyzeJavaFragments(fragments: JavaFragment[]): JavaAnalysisResult {
  const parser = new Parser();
  parser.setLanguage(Java as unknown as Parser.Language);

  const nodes: GraphNode[] = [];
  const warnings: AnalysisWarning[] = [];
  const methodCandidatesByName = new Map<string, MethodCandidate[]>();
  const invocations: InvocationRecord[] = [];

  for (const fragment of fragments) {
    let tree: Parser.Tree;
    try {
      tree = parser.parse(fragment.code);
    } catch {
      warnings.push({
        code: "TREE_SITTER_PARSE_FAILED",
        message: `Failed to parse ${fragment.path}`,
        filePath: fragment.path
      });
      continue;
    }

    if (tree.rootNode.hasError) {
      warnings.push({
        code: "TREE_SITTER_PARSE_FAILED",
        message: `Syntax errors detected in ${fragment.path}; best-effort extraction applied`,
        filePath: fragment.path
      });
    }

    let currentClassName = "<anonymous>";
    let currentMethodId: string | undefined;

    walk(tree.rootNode, (n) => {
      if (n.type === "class_declaration") {
        const nameNode = n.childForFieldName("name");
        if (nameNode) {
          currentClassName = nodeText(fragment.code, nameNode.startIndex, nameNode.endIndex);
          nodes.push({
            id: `class:${fragment.path}:${currentClassName}`,
            kind: "class",
            label: currentClassName,
            fqcn: currentClassName,
            filePath: fragment.path,
            line: nameNode.startPosition.row + 1
          });
        }
      }

      if (n.type === "method_declaration") {
        const nameNode = n.childForFieldName("name");
        const paramsNode = n.childForFieldName("parameters");
        if (nameNode) {
          const methodName = nodeText(fragment.code, nameNode.startIndex, nameNode.endIndex);
          const signature = paramsNode
            ? `${methodName}${nodeText(fragment.code, paramsNode.startIndex, paramsNode.endIndex)}`
            : methodName;
          const methodId = `method:${fragment.path}:${currentClassName}:${signature}`;
          currentMethodId = methodId;

          nodes.push({
            id: methodId,
            kind: "method",
            label: methodName,
            fqcn: `${currentClassName}.${methodName}`,
            signature,
            filePath: fragment.path,
            line: nameNode.startPosition.row + 1
          });

          const list = methodCandidatesByName.get(methodName) ?? [];
          list.push({
            id: methodId,
            name: methodName,
            className: currentClassName
          });
          methodCandidatesByName.set(methodName, list);
        }
      }

      if (n.type === "method_invocation") {
        const nameNode = n.childForFieldName("name");
        if (nameNode && currentMethodId) {
          invocations.push({
            callerId: currentMethodId,
            methodName: nodeText(fragment.code, nameNode.startIndex, nameNode.endIndex),
            filePath: fragment.path
          });
        }
      }
    });
  }

  const edges: GraphEdge[] = [];
  let edgeSequence = 0;

  for (const invocation of invocations) {
    const candidates = methodCandidatesByName.get(invocation.methodName) ?? [];
    if (candidates.length === 0) {
      warnings.push({
        code: "UNRESOLVED_INVOCATION",
        message: `Unable to resolve invocation '${invocation.methodName}' in ${invocation.filePath}`,
        filePath: invocation.filePath
      });
      continue;
    }

    const confidence = candidates.length === 1 ? 1 : Number((1 / candidates.length).toFixed(3));
    for (const candidate of candidates) {
      edgeSequence += 1;
      edges.push({
        id: `edge:${edgeSequence}`,
        from: invocation.callerId,
        to: candidate.id,
        kind: "calls",
        confidence,
        reason: candidates.length === 1 ? "resolved" : "ambiguous"
      });
    }
  }

  // Deduplicate nodes by id when class/method appears multiple times in traversal contexts.
  const uniqueNodes = Array.from(new Map(nodes.map((node) => [node.id, node])).values());

  return { nodes: uniqueNodes, edges, warnings };
}
