<template>
  <div v-if="logs && logs.length > 0" class="log-viewer-container">
    <h4>🔄 MCP ツール呼び出しログ</h4>
    <div v-for="(log, index) in logs" :key="index" class="log-item">
      <div class="log-header">
        <span class="tool-name">関数名: <code>{{ log.toolName }}</code></span>
      </div>
      <div class="log-body">
        <div class="log-section">
          <strong>📥 引数 (Arguments):</strong>
          <pre><code>{{ JSON.stringify(log.arguments, null, 2) }}</code></pre>
        </div>
        <div class="log-section">
          <strong>✅ 実行結果 (Result):</strong>
          <pre><code>{{ JSON.stringify(log.result, null, 2) }}</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  logs: {
    type: Array,
    default: () => [] // [{ toolName: '', arguments: {}, result: {} }]
  }
})
</script>

<style scoped>
.log-viewer-container {
  background-color: #fffde7;
  border: 1px solid #fff59d;
  border-radius: 8px;
  padding: 12px;
  margin: 15px 0;
  font-size: 0.9rem;
}
h4 { margin: 0 0 10px 0; color: #f57f17; }
.log-item {
  border-left: 3px solid #fbc02d;
  padding-left: 10px;
  margin-bottom: 10px;
}
.log-item:last-child { margin-bottom: 0; }
.tool-name code { background: #fff9c4; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
.log-body { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
pre { background: #fafafa; padding: 8px; border-radius: 4px; overflow-x: auto; margin: 4px 0 0 0; }
code { font-family: monospace; }
</style>