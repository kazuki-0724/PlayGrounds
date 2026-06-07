<template>
  <div :class="['bubble-wrapper', message.role]">
    <div class="avatar">
      <span v-if="message.role === 'user'" class="icon-user">👤</span>
      <span v-else class="icon-model">✨</span>
      <span class="role-name">{{ message.role === 'user' ? 'User' : 'Gemini' }}</span>
    </div>
    <div class="bubble-content" v-html="renderedContent"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const renderedContent = computed(() => {
  const text = props.message.parts?.[0]?.text || ''
  return marked.parse(text)
})
</script>

<style scoped>
.bubble-wrapper {
  display: flex;
  flex-direction: column;
  margin-bottom: 24px;
  width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
}

/* ユーザー側は全体を右寄せ */
.user {
  align-items: flex-end;
}

/* モデル側は全体を左寄せ */
.model {
  align-items: flex-start;
}

.avatar {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333333; /* 背景が明るいエリアなので黒系の文字色 */
}

/* ユーザー側は右寄せになるため、アイコンを一番右に配置すると自然になります */
.user .avatar {
  flex-direction: row-reverse; 
}

.bubble-content {
  line-height: 1.6;
  font-size: 0.95rem;
  padding: 12px 16px;
  border-radius: 6px;
  text-align: left; /* 中のテキストは左寄せを維持 */
}

/* User style */
.user .bubble-content {
  background-color: rgba(0, 122, 204, 0.1);
  border: 1px solid rgba(0, 122, 204, 0.3);
  color: #111111; /* 黒文字を指定 */
  max-width: 85%;
}

/* Model style */
.model .bubble-content {
  background-color: #1e1e1e;
  border: 1px solid #3c3c3c;
  color: #d4d4d4; /* 白文字 */
  max-width: 95%;
}

/* Markdown Styles */
:deep(p) { margin: 0 0 12px 0; }
:deep(p:last-child) { margin-bottom: 0; }
:deep(a) { color: #3794ff; text-decoration: none; }
:deep(a:hover) { text-decoration: underline; }

/* ユーザー側のインラインコード (明るい背景用) */
.user :deep(code) { 
  font-family: "Consolas", "Courier New", monospace;
  background-color: rgba(0, 0, 0, 0.05); 
  color: #0056b3; 
  padding: 2px 4px; 
  border-radius: 4px; 
  font-size: 0.9em;
}

/* AI側のインラインコード (暗い背景用) */
.model :deep(code) { 
  font-family: "Consolas", "Courier New", monospace;
  background-color: #2d2d2d; 
  color: #ce9178;
  padding: 2px 4px; 
  border-radius: 4px; 
  font-size: 0.9em;
}

:deep(pre) {
  background-color: #1e1e1e !important;
  border: 1px solid #3c3c3c;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 12px 0;
}
:deep(pre code) {
  background-color: transparent !important;
  color: #d4d4d4 !important;
  padding: 0;
}
</style>