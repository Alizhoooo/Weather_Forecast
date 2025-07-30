<template>
  <div 
    class="loading-spinner"
    :class="{ 'loading-spinner--inline': inline }"
    role="status"
    :aria-label="ariaLabel"
    :aria-describedby="descriptionId"
  >
    <div class="loading-spinner__container">
      <svg 
        class="loading-spinner__icon"
        :class="`loading-spinner__icon--${size}`"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          class="loading-spinner__track"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="2"
        />
        <circle
          class="loading-spinner__progress"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
      
      <span 
        v-if="message && message.trim()"
        :id="descriptionId"
        class="loading-spinner__message"
        :class="{ 'sr-only': hideMessage }"
      >
        {{ message }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'small' | 'medium' | 'large'
  message?: string
  hideMessage?: boolean
  inline?: boolean
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  message: 'Loading...',
  hideMessage: false,
  inline: false,
  ariaLabel: 'Loading content'
})

const descriptionId = computed(() => 
  props.message && props.message.trim() ? `loading-desc-${Math.random().toString(36).substr(2, 9)}` : undefined
)
</script>

<style scoped>
.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-6);
}

.loading-spinner--inline {
  display: inline-flex;
  padding: 0;
}

.loading-spinner__container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.loading-spinner__icon {
  animation: spin 1s linear infinite;
  color: var(--sky-500);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.loading-spinner__icon--small {
  width: 16px;
  height: 16px;
}

.loading-spinner__icon--medium {
  width: 24px;
  height: 24px;
}

.loading-spinner__icon--large {
  width: 32px;
  height: 32px;
}

.loading-spinner__track {
  opacity: 0.2;
  stroke: currentColor;
}

.loading-spinner__progress {
  opacity: 1;
  stroke: currentColor;
  stroke-dasharray: 31.416; /* 2 * π * 10 */
  stroke-dashoffset: 23.562; /* 75% of circumference */
  transform-origin: center;
  transition: stroke-dashoffset var(--transition-normal);
}

.loading-spinner__message {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-align: center;
  font-weight: var(--font-medium);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.loading-spinner--inline .loading-spinner__container {
  flex-direction: row;
  gap: var(--space-2);
}

.loading-spinner--inline .loading-spinner__message {
  font-size: var(--text-xs);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Mobile-first responsive design */
@media (max-width: 640px) {
  .loading-spinner {
    padding: var(--space-4);
  }
  
  .loading-spinner__container {
    gap: var(--space-3);
  }
  
  .loading-spinner__message {
    font-size: var(--text-xs);
  }
}

@media (max-width: 480px) {
  .loading-spinner {
    padding: var(--space-3);
  }

  .loading-spinner__container {
    gap: var(--space-2);
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .loading-spinner__icon {
    color: var(--text-primary);
    filter: none;
  }
  
  .loading-spinner__track {
    opacity: 0.5;
  }

  .loading-spinner__message {
    text-shadow: none;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner__icon {
    animation: none;
  }
  
  .loading-spinner__progress {
    stroke-dasharray: none;
    stroke-dashoffset: 0;
    transition: none;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .loading-spinner__message {
    text-shadow: none;
  }
}

/* Print styles */
@media print {
  .loading-spinner {
    display: none;
  }
}
</style>