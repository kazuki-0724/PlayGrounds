<template>
  <details class="api-key-container" open>
    <summary class="summary-header">
      <div class="title-group">
        <svg class="icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a2 2 0 0 1 2 2v2H6V3a2 2 0 0 1 2-2zm3 4V3a3 3 0 1 0-6 0v2H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1zM5 5V3a2 2 0 1 1 4 0v2H5zm3 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg>
        <h3>Gemini API Configuration</h3>
      </div>
      <span class="status-badge" :class="{ 'is-saved': isSaved }">
        {{ isSaved ? 'Active' : 'Unconfigured' }}
      </span>
    </summary>
    
    <div class="content-body">
      <div class="input-group">
        <div class="input-wrapper">
          <input
            :type="isInputVisible ? 'text' : 'password'"
            v-model="apiKey"
            placeholder="AIzaSy..."
            :disabled="isSaved"
            class="api-input"
            spellcheck="false"
          />
          <button @click="toggleVisibility" class="btn-icon" title="Toggle Visibility">
            {{ isInputVisible ? '👁️' : '👁️‍🗨️' }}
          </button>
        </div>
        <button @click="handleSave" class="btn-primary" :class="{ 'btn-secondary': isSaved }">
          {{ isSaved ? 'Edit' : 'Save' }}
        </button>
      </div>
    </div>
  </details>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['update-key'])

const apiKey = ref('')
const isSaved = ref(false)
const isInputVisible = ref(false)

const toggleVisibility = () => {
  isInputVisible.value = !isInputVisible.value
}

const handleSave = () => {
  if (isSaved.value) {
    isSaved.value = false
  } else {
    if (!apiKey.value.trim()) {
      alert('APIキーを入力してください')
      return
    }
    isSaved.value = true
    emit('update-key', apiKey.value)
  }
}
</script>

<style scoped>
.api-key-container {
  background-color: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  margin-bottom: 20px;
  color: #cccccc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  list-style: none;
  user-select: none;
  outline: none;
}
.summary-header::-webkit-details-marker { display: none; }
.summary-header:hover { background-color: #2a2d2e; }

.title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.icon { width: 16px; height: 16px; color: #c5c5c5; }
h3 { margin: 0; font-size: 0.9rem; font-weight: 600; color: #e7e7e7; }

.status-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: #3c3c3c;
  color: #cccccc;
}
.status-badge.is-saved {
  background-color: #1e4a33;
  color: #4ce08b;
  border: 1px solid #285e41;
}

.content-body {
  padding: 0 16px 16px 16px;
  border-top: 1px solid #3c3c3c;
  margin-top: 4px;
  padding-top: 16px;
}

.input-group { display: flex; gap: 8px; }
.input-wrapper { position: relative; flex: 1; display: flex; }

.api-input {
  width: 100%;
  padding: 6px 36px 6px 10px;
  background-color: #3c3c3c;
  color: #cccccc;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: "Consolas", "Courier New", monospace;
  outline: none;
  transition: border-color 0.2s;
}
.api-input:focus { border-color: #007fd4; }
.api-input:disabled { background-color: #2d2d2d; color: #858585; }

.btn-icon {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #cccccc;
  padding: 4px;
}
.btn-icon:hover { color: #ffffff; }

.btn-primary {
  background-color: #0e639c;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 6px 16px;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-primary:hover { background-color: #1177bb; }
.btn-secondary { background-color: #3a3d41; }
.btn-secondary:hover { background-color: #4d5157; }
</style>