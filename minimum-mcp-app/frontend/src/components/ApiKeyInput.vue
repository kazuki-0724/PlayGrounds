<template>
  <div class="api-key-container">
    <h3>Gemini API 設定</h3>
    <div class="input-group">
      <input
        :type="isInputVisible ? 'text' : 'password'"
        v-model="apiKey"
        placeholder="AIzaSy..."
        :disabled="isSaved"
      />
      <button @click="toggleVisibility">
        {{ isInputVisible ? '隠す' : '表示' }}
      </button>
      <button @click="handleSave" :class="{ 'btn-saved': isSaved }">
        {{ isSaved ? '変更する' : '保存' }}
      </button>
    </div>
    <p class="status-text">
      ステータス: <span>{{ isSaved ? '設定済み' : '未設定' }}</span>
    </p>
  </div>
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
    // 編集モードへ移行
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
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 20px;
}
.input-group {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}
input {
  flex: 1;
  padding: 8px;
}
button {
  padding: 8px 16px;
  cursor: pointer;
}
.btn-saved {
  background-color: #e0e0e0;
}
.status-text span {
  font-weight: bold;
}
</style>