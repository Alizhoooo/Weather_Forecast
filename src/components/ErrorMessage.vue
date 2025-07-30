<template>
  <div 
    class="error-message"
    :class="`error-message--${error.type}`"
    role="alert"
    :aria-live="ariaLive"
    :aria-describedby="errorId"
  >
    <div class="error-message__icon" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
    </div>
    
    <div class="error-message__content">
      <p :id="errorId" class="error-message__text">
        {{ error.message }}
      </p>
      
      <button 
        v-if="error.retryable && showRetry"
        class="error-message__retry"
        type="button"
        @click="handleRetry"
        :aria-describedby="retryId"
      >
        Try Again
      </button>
      
      <span 
        v-if="error.retryable && showRetry"
        :id="retryId" 
        class="sr-only"
      >
        Retry the failed operation
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AppError } from '../types/error'

interface Props {
  error: AppError
  showRetry?: boolean
  ariaLive?: 'polite' | 'assertive'
}

interface Emits {
  (e: 'retry'): void
}

const props = withDefaults(defineProps<Props>(), {
  showRetry: true,
  ariaLive: 'polite'
})

const emit = defineEmits<Emits>()

const errorId = computed(() => `error-${Math.random().toString(36).substr(2, 9)}`)
const retryId = computed(() => `retry-${Math.random().toString(36).substr(2, 9)}`)

const handleRetry = () => {
  emit('retry')
}
</script>

<style scoped>
.error-message {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  border: 1px solid;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
}

.error-message--network {
  background: rgba(255, 251, 235, 0.95);
  border-color: rgba(251, 191, 36, 0.3);
  color: var(--warning);
}

.error-message--api {
  background: rgba(254, 242, 242, 0.95);
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--error);
}

.error-message--data {
  background: rgba(239, 246, 255, 0.95);
  border-color: rgba(59, 130, 246, 0.3);
  color: var(--info);
}

.error-message--user {
  background: rgba(255, 251, 235, 0.95);
  border-color: rgba(251, 191, 36, 0.3);
  color: var(--warning);
}

.error-message__icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin-top: var(--space-1);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.error-message__content {
  flex: 1;
  min-width: 0;
}

.error-message__text {
  margin: 0 0 var(--space-4) 0;
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  word-wrap: break-word;
  font-weight: var(--font-medium);
}

.error-message__retry {
  background: transparent;
  border: 1.5px solid currentColor;
  color: inherit;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
}

.error-message__retry::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: currentColor;
  transition: left var(--transition-normal);
  z-index: -1;
}

.error-message__retry:hover::before {
  left: 0;
}

.error-message__retry:hover {
  color: white;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.error-message__retry:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.error-message__retry:active {
  transform: translateY(0);
}

/* Mobile-first responsive design */
@media (max-width: 640px) {
  .error-message {
    padding: var(--space-4);
    gap: var(--space-3);
    border-radius: var(--radius-lg);
  }
  
  .error-message__icon {
    width: 20px;
    height: 20px;
  }
  
  .error-message__text {
    font-size: var(--text-xs);
    margin-bottom: var(--space-3);
  }
  
  .error-message__retry {
    padding: var(--space-2) var(--space-3);
    font-size: 0.625rem;
  }
}

@media (max-width: 480px) {
  .error-message {
    padding: var(--space-3);
    gap: var(--space-2);
  }

  .error-message__text {
    margin-bottom: var(--space-2);
  }

  .error-message__retry {
    padding: var(--space-1) var(--space-2);
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .error-message--network,
  .error-message--api,
  .error-message--data,
  .error-message--user {
    background: var(--bg-primary);
    border-width: 2px;
  }

  .error-message__icon {
    filter: none;
  }

  .error-message__retry {
    border-width: 2px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .error-message {
    transition: none;
  }

  .error-message__retry {
    transition: none;
  }

  .error-message__retry::before {
    transition: none;
  }

  .error-message__retry:hover {
    transform: none;
  }

  .error-message__retry:active {
    transform: none;
  }
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .error-message__retry {
    padding: var(--space-3) var(--space-4);
    min-height: 44px; /* Minimum touch target size */
  }

  .error-message__retry:hover {
    transform: none;
    box-shadow: none;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .error-message--network {
    background: rgba(120, 53, 15, 0.95);
    border-color: rgba(217, 119, 6, 0.4);
  }

  .error-message--api {
    background: rgba(127, 29, 29, 0.95);
    border-color: rgba(239, 68, 68, 0.4);
  }

  .error-message--data {
    background: rgba(30, 58, 138, 0.95);
    border-color: rgba(59, 130, 246, 0.4);
  }

  .error-message--user {
    background: rgba(120, 53, 15, 0.95);
    border-color: rgba(217, 119, 6, 0.4);
  }
}

/* Print styles */
@media print {
  .error-message {
    background: white !important;
    border: 1px solid #ccc !important;
    box-shadow: none !important;
  }

  .error-message__icon {
    filter: none !important;
  }

  .error-message__retry {
    border: 1px solid #333 !important;
    color: #333 !important;
  }
}
</style>