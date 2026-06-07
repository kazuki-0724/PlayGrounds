<template>
  <div :class="['bubble-wrapper', message.role]">
    <div class="avatar">
      {{ message.role === 'user' ? 'ユーザー' : 'Gemini' }}
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
    required: true // { role: 'user' | 'model', parts: [{ text: '...' }] }
  }
})

// Markdown文字列を安全にHTMLへパース
const renderedContent = computed(() => {
  const text = props.message.parts?.[0]?.text || ''
  return marked.parse(text)
})
</script>

<style scoped>
.bubble-wrapper {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
  max-width: 80%;
}
.user {
  align-self: flex-end;
  align-items: flex-end;
}
.model {
  align-self: flex-start;
  align-items: flex-start;
}
.avatar {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 4px;
}
.bubble-content {
  padding: 12px;
  border-radius: 8px;
  background-color: #f1f1f1;
  line-height: 1.5;
}
.user .bubble-content {
  background-color: #007bff;
  color: white;
}
/* Markdown内部の装飾用スタイル */
:deep(p) { margin: 0 0 8px 0; }
:deep(p:last-child) { margin-bottom: 0; }
:deep(code) { background: #eee; padding: 2px 4px; border-radius: 4px; }
.user :deep(code) { background: #0056b3; color: white; }
</style>