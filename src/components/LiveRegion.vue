<template>
  <div
    :aria-live="politeness"
    :aria-atomic="atomic"
    :aria-relevant="relevant"
    class="live-region"
    role="status"
  >
    <span v-if="message">{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  message?: string
  politeness?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
  relevant?: 'additions' | 'additions removals' | 'additions text' | 'all' | 'removals' | 'removals additions' | 'removals text' | 'text' | 'text additions' | 'text removals'
  clearDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  message: '',
  politeness: 'polite',
  atomic: true,
  relevant: 'additions text',
  clearDelay: 5000
})

const message = ref(props.message)

// Watch for message changes and auto-clear after delay
watch(() => props.message, (newMessage) => {
  message.value = newMessage
  
  if (newMessage && props.clearDelay > 0) {
    setTimeout(() => {
      if (message.value === newMessage) {
        message.value = ''
      }
    }, props.clearDelay)
  }
}, { immediate: true })

// Expose method to manually clear message
const clearMessage = () => {
  message.value = ''
}

defineExpose({
  clearMessage
})
</script>

<style scoped>
.live-region {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>