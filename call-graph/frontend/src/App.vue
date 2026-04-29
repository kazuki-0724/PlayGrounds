<template>
  <main class="layout">
    <section class="controls">
      <h1>Java Call Graph</h1>
      <p class="caption">Markdownを貼り付けるかファイルを読み込んで解析します。</p>

      <textarea
        v-model="markdown"
        class="markdown-input"
        placeholder="### src/main/java/App.java
```java
class App { void run() { helper(); } }
```"
      />

      <div class="actions">
        <label class="file-btn">
          ファイル選択
          <input type="file" accept=".md,.markdown,text/markdown" @change="onPickFile" />
        </label>
        <button class="run-btn" :disabled="loading" @click="runAnalyze">
          {{ loading ? "解析中..." : "解析する" }}
        </button>
      </div>

      <input
        v-model="query"
        class="search"
        placeholder="クラス名/メソッド名を検索"
        @input="applySearch"
      />

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <div class="stats" v-if="result">
        <span>nodes: {{ result.nodes.length }}</span>
        <span>edges: {{ result.edges.length }}</span>
        <span>warnings: {{ result.warnings.length }}</span>
        <span>elapsed: {{ result.meta.elapsedMs }}ms</span>
      </div>

      <ul class="warnings" v-if="result?.warnings.length">
        <li v-for="(w, idx) in result.warnings" :key="idx">{{ w.message }}</li>
      </ul>
    </section>

    <section class="graph-wrap">
      <div ref="graphEl" class="graph" />
      <aside v-if="selectedNode" class="detail">
        <h2>選択ノード</h2>
        <p><strong>label:</strong> {{ selectedNode.data("label") }}</p>
        <p><strong>fqcn:</strong> {{ selectedNode.data("fqcn") }}</p>
        <p><strong>signature:</strong> {{ selectedNode.data("signature") || "-" }}</p>
        <p class="source-row">
          <strong>source:</strong>
          {{ selectedNode.data("filePath") }}:{{ selectedNode.data("line") }}
        </p>
      </aside>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import cytoscape, { type Core, type NodeSingular } from "cytoscape";
import type { AnalyzeResponse, GraphEdge, GraphNode } from "@call-graph/shared";

const API_BASE = "http://localhost:8787";

const markdown = ref("");
const loading = ref(false);
const errorMessage = ref("");
const query = ref("");
const result = ref<AnalyzeResponse | null>(null);
const graphEl = ref<HTMLElement | null>(null);
const selectedNode = ref<NodeSingular | null>(null);

let cy: Core | null = null;
let activeNeighborhoodLayout: { stop: () => void } | null = null;

const GRAPH_PADDING_X = 70;
const GRAPH_PADDING_TOP = 40;
const CLASS_BAND_HEIGHT = 150;
const BAND_GAP = 50;

function getMethodBandBottom(height: number): number {
  return Math.max(GRAPH_PADDING_TOP + 120, height - CLASS_BAND_HEIGHT - BAND_GAP);
}

function constrainMethodNodesToBand(): void {
  if (!cy) {
    return;
  }

  const methodNodes = cy.nodes("[kind = 'method']");
  if (methodNodes.length === 0) {
    return;
  }

  const width = cy.width();
  const height = cy.height();
  const minX = GRAPH_PADDING_X;
  const maxX = Math.max(minX + 1, width - GRAPH_PADDING_X);
  const minY = GRAPH_PADDING_TOP;
  const maxY = getMethodBandBottom(height);

  const xs = methodNodes.map((n) => n.position("x"));
  const ys = methodNodes.map((n) => n.position("y"));
  const sourceMinX = Math.min(...xs);
  const sourceMaxX = Math.max(...xs);
  const sourceMinY = Math.min(...ys);
  const sourceMaxY = Math.max(...ys);

  methodNodes.positions((node) => {
    const sourceX = node.position("x");
    const sourceY = node.position("y");

    const normalizedX = sourceMaxX === sourceMinX ? 0.5 : (sourceX - sourceMinX) / (sourceMaxX - sourceMinX);
    const normalizedY = sourceMaxY === sourceMinY ? 0.5 : (sourceY - sourceMinY) / (sourceMaxY - sourceMinY);

    return {
      x: minX + normalizedX * (maxX - minX),
      y: minY + normalizedY * (maxY - minY)
    };
  });
}

function placeClassNodesInBand(): void {
  if (!cy) {
    return;
  }

  const classNodes = cy.nodes("[kind = 'class']");
  if (classNodes.length === 0) {
    return;
  }

  const width = cy.width();
  const height = cy.height();
  const bandTop = Math.max(getMethodBandBottom(height) + BAND_GAP, height - CLASS_BAND_HEIGHT);
  const bandBottom = Math.max(bandTop + 1, height - 24);
  const usableWidth = Math.max(1, width - GRAPH_PADDING_X * 2);
  const minHorizontalSpacing = 52;
  const maxPerRow = Math.max(1, Math.floor(usableWidth / minHorizontalSpacing));
  const rowCount = Math.max(1, Math.ceil(classNodes.length / maxPerRow));
  const rowStep = Math.max(22, (bandBottom - bandTop) / rowCount);

  classNodes.positions((_, i) => {
    const row = Math.floor(i / maxPerRow);
    const col = i % maxPerRow;
    const itemsInRow = Math.min(maxPerRow, classNodes.length - row * maxPerRow);
    const ratio = itemsInRow === 1 ? 0.5 : col / (itemsInRow - 1);

    return {
      x: GRAPH_PADDING_X + usableWidth * ratio,
      y: bandTop + rowStep * row
    };
  });
}

function runBaseLayout(): void {
  if (!cy) {
    return;
  }

  const classNodes = cy.nodes("[kind = 'class']");
  classNodes.unlock();

  const methodNodes = cy.nodes("[kind = 'method']");
  const methodSubgraph = methodNodes.union(methodNodes.connectedEdges());
  const layout = methodSubgraph.layout({
    name: "cose",
    animate: false,
    fit: false,
    nodeRepulsion: 250000,
    idealEdgeLength: 120,
    gravity: 0.65
  });

  layout.run();
  constrainMethodNodesToBand();
  placeClassNodesInBand();
  classNodes.lock();
  cy.fit(cy.elements(), 90);
}

function toElements(nodes: GraphNode[], edges: GraphEdge[]) {
  return [
    ...nodes.map((node) => ({
      data: {
        ...node
      }
    })),
    ...edges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        confidence: edge.confidence,
        reason: edge.reason
      }
    }))
  ];
}

function renderGraph(payload: AnalyzeResponse): void {
  if (!graphEl.value) {
    return;
  }

  cy?.destroy();

  cy = cytoscape({
    container: graphEl.value,
    elements: toElements(payload.nodes, payload.edges),
    style: [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "background-color": "#1e7acb",
          color: "#0f2d46",
          "text-valign": "top",
          "text-halign": "center",
          "text-margin-y": "-8px",
          "text-background-color": "rgba(247, 251, 255, 0.94)",
          "text-background-opacity": 1,
          "text-background-padding": "4px",
          "text-background-shape": "round-rectangle",
          "text-outline-color": "rgba(247, 251, 255, 0.95)",
          "text-outline-width": 2,
          "font-size": "10px",
          "font-weight": 600
        }
      },
      {
        selector: "node[kind = 'class']",
        style: {
          "background-color": "#f28f3b",
          shape: "round-rectangle",
          "text-valign": "bottom",
          "text-margin-y": "8px"
        }
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": "#88a9c6",
          "target-arrow-color": "#88a9c6",
          "target-arrow-shape": "triangle",
          "curve-style": "bezier"
        }
      },
      {
        selector: ".faded",
        style: {
          opacity: 0.15
        }
      },
      {
        selector: ".active",
        style: {
          opacity: 1,
          "line-color": "#0e5a8a",
          "target-arrow-color": "#0e5a8a"
        }
      },
      {
        selector: ".selected-node",
        style: {
          "border-width": 5,
          "border-color": "#ff5f56",
          "border-opacity": 1,
          "text-background-color": "#ffffff",
          "text-background-opacity": 1,
          "text-outline-color": "#ffffff",
          "text-outline-width": 3,
          color: "#102131",
          opacity: 1,
          "z-index": 999
        }
      },
      {
        selector: ".class-related-method",
        style: {
          "background-color": "#ffcc00",
          "border-width": 4,
          "border-color": "#b88a00",
          "border-opacity": 1,
          color: "#2f2300",
          "text-background-color": "#fff3bf",
          "text-background-opacity": 1,
          "text-outline-color": "#fff3bf",
          "text-outline-width": 3
        }
      },
      {
        selector: ".class-related-class",
        style: {
          "background-color": "#ffb700",
          "border-width": 5,
          "border-color": "#8b5e00",
          "border-opacity": 1,
          color: "#2c2000",
          "text-background-color": "#ffefb0",
          "text-background-opacity": 1,
          "text-outline-color": "#ffefb0",
          "text-outline-width": 3
        }
      },
      {
        selector: ".search-hit",
        style: {
          "border-width": 3,
          "border-color": "#fe5f55"
        }
      }
    ],
    layout: {
      name: "preset"
    }
  });

  runBaseLayout();

  cy.on("tap", "node", (evt) => {
    const node = evt.target;
    selectedNode.value = node;
    highlightNeighbors(node);
    cy?.nodes().removeClass("selected-node class-related-method class-related-class");
    node.addClass("selected-node");
    highlightRelatedNodesByKind(node);
  });

  cy.on("tap", (evt) => {
    if (evt.target === cy) {
      selectedNode.value = null;
      cy?.elements().removeClass(
        "faded active selected-node class-related-method class-related-class"
      );
    }
  });
}

function highlightRelatedNodesByKind(node: NodeSingular): void {
  if (!cy) {
    return;
  }

  const kind = String(node.data("kind") ?? "");

  if (kind === "class") {
    const classFqcn = String(node.data("fqcn") ?? "").trim();
    if (!classFqcn) {
      return;
    }

    cy
      .nodes("[kind = 'method']")
      .filter((methodNode) => {
        const methodFqcn = String(methodNode.data("fqcn") ?? "");
        return methodFqcn.startsWith(`${classFqcn}.`);
      })
      .addClass("class-related-method");
    return;
  }

  if (kind === "method") {
    const methodFqcn = String(node.data("fqcn") ?? "").trim();
    const separator = methodFqcn.lastIndexOf(".");
    if (separator <= 0) {
      return;
    }

    const classFqcn = methodFqcn.slice(0, separator);
    cy
      .nodes("[kind = 'class']")
      .filter((classNode) => String(classNode.data("fqcn") ?? "") === classFqcn)
      .addClass("class-related-class");
  }
}

function animateConnectedNeighborhood(node: NodeSingular): void {
  if (!cy) {
    return;
  }

  const connected = node.closedNeighborhood();
  const neighborhood = connected.nodes().union(connected.edges());
  if (connected.nodes().length < 2) {
    return;
  }

  activeNeighborhoodLayout?.stop();

  const layout = neighborhood.layout({
    name: "concentric",
    animate: true,
    animationDuration: 500,
    fit: false,
    padding: 30,
    avoidOverlap: true,
    minNodeSpacing: 36,
    spacingFactor: 1.2,
    concentric: (n) => (n.id() === node.id() ? 2 : 1),
    levelWidth: () => 1
  }) as { stop: () => void };

  activeNeighborhoodLayout = layout;

  layout.run();

  setTimeout(() => {
    if (!cy) {
      return;
    }

    constrainMethodNodesToBand();
    placeClassNodesInBand();
    cy.nodes("[kind = 'class']").lock();
  }, 520);
}

function highlightNeighbors(node: NodeSingular): void {
  if (!cy) {
    return;
  }

  cy.elements().removeClass("faded active");
  cy.elements().addClass("faded");

  const connected = node.closedNeighborhood();
  connected.removeClass("faded");
  connected.addClass("active");

  animateConnectedNeighborhood(node);
}

function applySearch(): void {
  if (!cy) {
    return;
  }

  const keyword = query.value.trim().toLowerCase();
  cy.nodes().removeClass("search-hit");

  if (!keyword) {
    return;
  }

  const hits = cy
    .nodes()
    .filter((n) => {
      const label = String(n.data("label") ?? "").toLowerCase();
      const fqcn = String(n.data("fqcn") ?? "").toLowerCase();
      return label.includes(keyword) || fqcn.includes(keyword);
    })
    .addClass("search-hit");

  if (hits.length > 0) {
    cy.fit(hits, 80);
  }
}

async function runAnalyze(): Promise<void> {
  if (!markdown.value.trim()) {
    errorMessage.value = "Markdownを入力してください";
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ markdown: markdown.value })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const payload = (await response.json()) as AnalyzeResponse;
    result.value = payload;
    renderGraph(payload);
    applySearch();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "解析に失敗しました";
  } finally {
    loading.value = false;
  }
}

function onPickFile(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  file.text().then((text) => {
    markdown.value = text;
  });
}

onMounted(() => {
  if (graphEl.value) {
    cy = cytoscape({
      container: graphEl.value,
      elements: [],
      style: [],
      layout: { name: "grid" }
    });
  }
});

onBeforeUnmount(() => {
  activeNeighborhoodLayout?.stop();
  cy?.destroy();
});
</script>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  height: 100vh;
  padding: 16px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #ffffffd6;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 20px #00376114;
}

.caption {
  margin: 0;
  color: #47607a;
}

.markdown-input {
  min-height: 260px;
  resize: vertical;
  font-family: "JetBrains Mono", monospace;
}

.actions {
  display: flex;
  gap: 8px;
}

.file-btn {
  padding: 8px 12px;
  border-radius: 8px;
  background: #cfe8fb;
}

.file-btn input {
  display: none;
}

.run-btn {
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  background: #0e5a8a;
  color: #fff;
}

.search {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #90aac4;
}

.error {
  color: #b30000;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  font-size: 12px;
}

.warnings {
  margin: 0;
  padding-left: 18px;
  color: #955404;
  font-size: 12px;
  max-height: 140px;
  overflow: auto;
}

.graph-wrap {
  position: relative;
  background: #fafdffde;
  border-radius: 12px;
  box-shadow: 0 8px 20px #00376114;
  overflow: hidden;
}

.graph {
  width: 100%;
  height: 100%;
  min-height: 460px;
}

.detail {
  position: absolute;
  top: 16px;
  right: 16px;
  width: min(320px, 40vw);
  background: #ffffffeb;
  border: 1px solid #bfd5e8;
  border-radius: 10px;
  padding: 10px;
  font-size: 12px;
}

.detail p,
.source-row {
  overflow-wrap: anywhere;
  word-break: break-word;
}

@media (max-width: 980px) {
  .layout {
    grid-template-columns: 1fr;
    height: auto;
  }

  .graph {
    height: 60vh;
  }

  .detail {
    width: calc(100% - 32px);
  }
}
</style>
