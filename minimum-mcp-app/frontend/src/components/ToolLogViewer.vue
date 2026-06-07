<template>
  <details v-if="logs && logs.length > 0" class="log-viewer-container" open>
    <summary class="log-header-main">
      <div class="header-title">
        <svg class="icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm.5 4v3.5H12v1H8.5V12h-1V8.5H4v-1h3.5V4h1z"/></svg>
        <span>MCP Output Log ({{ logs.length }})</span>
      </div>
    </summary>
    
    <div class="log-list">
      <div v-for="(log, index) in logs" :key="index" class="log-item">
        <div class="log-item-header">
          <span class="syntax-keyword">call</span>
          <span class="syntax-function">{{ log.toolName }}</span>()
        </div>
        <div class="log-body">
          <div class="log-section">
            <span class="section-label">// Arguments</span>
            <pre><code>{{ JSON.stringify(log.arguments, null, 2) }}</code></pre>
          </div>
          <div class="log-section">
            <span class="section-label">// Result</span>
            <pre><code class="result-code">{{ JSON.stringify(log.result, null, 2) }}</code></pre>
          </div>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup>
defineProps({
  logs: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.log-viewer-container {
  background-color: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  margin: 16px 0;
  font-family: "Consolas", "Courier New", monospace;
  color: #cccccc;
  text-align: left; /* 強制的に左寄せ */
}

.log-header-main {
  background-color: #252526;
  padding: 8px 12px;
  border-bottom: 1px solid #3c3c3c;
  cursor: pointer;
  list-style: none;
  user-select: none;
  font-size: 0.85rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  text-align: left; /* 強制的に左寄せ */
}
.log-header-main::-webkit-details-marker { display: none; }
.log-header-main:hover { background-color: #2a2d2e; }

.header-title {
  display: flex;
  align-items: center;
  justify-content: flex-start; /* 左寄せ */
  gap: 8px;
  color: #e7e7e7;
}
.icon { width: 14px; height: 14px; color: #858585; }

.log-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* 子要素が中央に寄るのを防ぐ */
  gap: 16px;
}

.log-item {
  border-left: 2px solid #3c3c3c;
  padding-left: 12px;
  width: 100%; /* 幅を確保 */
  box-sizing: border-box;
}

.log-item-header {
  font-size: 0.9rem;
  margin-bottom: 8px;
  color: #d4d4d4;
  text-align: left;
}

.syntax-keyword { color: #569cd6; margin-right: 6px; }
.syntax-function { color: #dcdcaa; }

.log-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* 子要素が中央に寄るのを防ぐ */
  gap: 12px;
  width: 100%;
}

.log-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* 左寄せ */
  gap: 4px;
  width: 100%;
}

.section-label {
  font-size: 0.8rem;
  color: #6a9955;
  text-align: left;
}

pre {
  margin: 0;
  background: transparent;
  text-align: left; /* プレテキストの左寄せ */
  width: 100%;
  overflow-x: auto;
}

code {
  display: block;
  font-family: "Consolas", "Courier New", monospace;
  font-size: 0.85rem;
  color: #9cdcfe;
  white-space: pre-wrap;
  word-break: break-all;
  text-align: left; /* コードの左寄せ */
}

.result-code {
  color: #ce9178;
}
</style>