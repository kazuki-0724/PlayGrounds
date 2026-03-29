<script setup>
defineProps({
  messages: {
    type: Array,
    required: true
  }
});
</script>

<template>
  <main class="pt-20 pb-36 px-4 max-w-2xl mx-auto flex flex-col gap-6">
    <div v-for="message in messages" :key="message.id" class="message-row" :class="message.role">
      <div class="message-bubble" :class="{ loading: message.loading }">
        {{ message.text }}
      </div>
    </div>
  </main>
</template>
