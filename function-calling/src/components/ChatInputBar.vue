<script setup>
defineProps({
  modelValue: {
    type: String,
    required: true
  },
  sending: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'send']);

function onKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    emit('send');
  }
}
</script>

<template>
  <div class="fixed bottom-6 left-0 w-full px-4 z-40">
    <div class="max-w-2xl mx-auto">
      <div class="bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_12px_40px_rgba(25,28,29,0.1)] p-2 flex items-center gap-2 border border-outline-variant/20">
        <input
          class="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-slate-400 text-sm py-3 px-2"
          placeholder="例: 社員E001の部署、またはカレーの材料をカゴに追加して"
          type="text"
          :value="modelValue"
          @input="emit('update:modelValue', $event.target.value)"
          @keydown="onKeydown"
        />
        <button
          class="w-11 h-11 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-60"
          type="button"
          aria-label="送信"
          :disabled="sending"
          @click="emit('send')"
        >
          <span class="material-symbols-outlined">arrow_upward</span>
        </button>
      </div>
    </div>
  </div>
</template>
