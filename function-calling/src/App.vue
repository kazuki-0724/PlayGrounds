<script setup>
import { nextTick, ref } from 'vue';
import AppHeader from './components/AppHeader.vue';
import ChatMessageList from './components/ChatMessageList.vue';
import ChatInputBar from './components/ChatInputBar.vue';
import { postChat } from './services/chatApi.js';

const prompt = ref('');
const sending = ref(false);
const messages = ref([
  {
    id: 0,
    role: 'ai',
    text: 'こんにちは。社員情報やレシピ材料の取得に対応しています。例: カレーの材料をカゴに追加して。',
    loading: false
  }
]);

let messageSeq = 1;

function createMessage(role, text, loading = false) {
  const message = { id: messageSeq++, role, text, loading };
  messages.value.push(message);
  return message.id;
}

function updateMessage(messageId, patch) {
  const index = messages.value.findIndex((message) => message.id === messageId);
  if (index < 0) return;
  messages.value[index] = { ...messages.value[index], ...patch };
}

async function sendPrompt() {
  const trimmedPrompt = prompt.value.trim();
  if (!trimmedPrompt || sending.value) return;

  createMessage('user', trimmedPrompt);
  prompt.value = '';

  const loadingMessageId = createMessage('ai', '考え中...', true);
  sending.value = true;

  await nextTick();
  const lastMessage = document.querySelector('.message-row:last-child');
  lastMessage?.scrollIntoView({ behavior: 'smooth', block: 'end' });

  try {
    const data = await postChat(trimmedPrompt);
    updateMessage(loadingMessageId, {
      text: data.text || data.error || '回答を取得できませんでした。'
    });
  } catch (error) {
    updateMessage(loadingMessageId, {
      text: `通信エラー: ${error.message}`
    });
  } finally {
    updateMessage(loadingMessageId, { loading: false });
    sending.value = false;
  }
}
</script>

<template>
  <div>
    <AppHeader />
    <ChatMessageList :messages="messages" />
    <ChatInputBar v-model="prompt" :sending="sending" @send="sendPrompt" />
  </div>
</template>
