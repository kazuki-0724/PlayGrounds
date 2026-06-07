<template>
  <div class="app-wrapper">
    <header>
      <h1>MCP Demo Portal (Gemini API PoC)</h1>
    </header>

    <main class="main-content">
      <section class="settings-pane">
        <ApiKeyInput @update-key="updateApiKey" />
      </section>

      <section class="chat-pane">
        <div class="chat-timeline">
          <div v-for="(msg, index) in chatHistory" :key="index">
            <ChatBubble :message="msg" />
          </div>

          <div v-if="isLoading" class="loading-indicator">
            <span class="spinner"></span> Geminiが思考中、またはMCPツールを呼び出し中...
          </div>

          <ToolLogViewer :logs="currentToolLogs" />
        </div>

        <div class="input-area">
          <textarea
            v-model="inputMessage"
            placeholder="メッセージを入力してください（例：東京の天気を教えて）"
            :disabled="isLoading || !savedApiKey"
            @keydown.enter.prevent="sendMessage"
          ></textarea>
          <button @click="sendMessage" :disabled="isLoading || !savedApiKey || !inputMessage.trim()">
            送信
          </button>
        </div>
        <p v-if="!savedApiKey" class="warning-text">※ 最初にAPIキーを設定してください。</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import ApiKeyInput from './components/ApiKeyInput.vue'
import ChatBubble from './components/ChatBubble.vue'
import ToolLogViewer from './components/ToolLogViewer.vue'

const savedApiKey = ref('')
const inputMessage = ref('')
const chatHistory = ref([])
const currentToolLogs = ref([])
const isLoading = ref(false)

const updateApiKey = (key) => {
  savedApiKey.value = key
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value || !savedApiKey.value) return

  const userText = inputMessage.value
  inputMessage.value = ''
  currentToolLogs.value = [] // 新しい対話のために前回のログをクリア

  // 履歴にユーザー発言を追加
  chatHistory.value.push({
    role: 'user',
    parts: [{ text: userText }]
  })

  isLoading.value = true

  try {
    // バックエンドのExpressサーバーへリクエストを送信
    const response = await axios.post('/api/chat', {
      messages: chatHistory.value
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Gemini-API-Key': savedApiKey.value
      }
    })

    if (response.data?.status === 'success') {
      // モデルからの最終返答を履歴に追加
      if (response.data.reply) {
        chatHistory.value.push(response.data.reply)
      }
      // 実行されたツールログを格納して可視化
      if (response.data.toolLogs) {
        currentToolLogs.value = response.data.toolLogs
      }
    }
  } catch (error) {
    console.error(error)
    alert('通信エラーが発生しました。バックエンドの起動状態やAPIキーを確認してください。')
  } finally {
    isLoading.value = false
  }
}
</script>

<style>
/* 簡易的なグローバル・レイアウト用スタイル */
body { margin: 0; font-family: sans-serif; background-color: #f9f9f9; color: #333; }
.app-wrapper { display: flex; flex-direction: column; height: 100vh; }
header { background: #333; color: white; padding: 10px 20px; }
header h1 { margin: 0; font-size: 1.5rem; }
.main-content { flex: 1; display: flex; flex-direction: column; padding: 20px; gap: 20px; overflow: hidden; }
.chat-pane { flex: 1; display: flex; flex-direction: column; background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; overflow: hidden; }
.chat-timeline { flex: 1; overflow-y: auto; padding-right: 10px; display: flex; flex-direction: column; }
.input-area { display: flex; gap: 10px; margin-top: 15px; }
textarea { flex: 1; height: 60px; resize: none; padding: 8px; border-radius: 4px; border: 1px solid #ccc; }
.warning-text { color: red; font-size: 0.85rem; margin: 5px 0 0 0; }
.loading-indicator { font-size: 0.9rem; color: #666; margin: 10px 0; display: flex; align-items: center; gap: 5px; }
</style>