<template>
  <div class="search-bar">
    <div class="search-input-container">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        class="search-input"
        :placeholder="props.placeholder"
        :disabled="isLoading || props.disabled"
        @input="handleInput"
        @keydown.enter="handleEnterKey"
        @keydown.escape="clearSearch"
        @keydown.arrow-down.prevent="handleArrowDown"
        @focus="handleFocus"
        @blur="handleBlur"
        aria-label="Location search"
        aria-describedby="search-help"
        autocomplete="off"
        spellcheck="false"
        role="searchbox"
        :aria-expanded="searchQuery.length >= MIN_QUERY_LENGTH"
      />
      <div
        v-if="isLoading"
        class="search-loading"
        aria-label="Searching for locations"
      >
        <div class="spinner"></div>
      </div>
      <button
        v-if="searchQuery && !isLoading"
        class="clear-button touch-target"
        @click="clearSearch"
        aria-label="Clear search input"
        type="button"
        tabindex="0"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
    <div id="search-help" class="search-help">
      Enter at least 2 characters to search for locations
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { Location } from '@/types'

// Props
interface Props {
  disabled?: boolean
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: 'Search for a location...'
})

// Emits
interface Emits {
  (e: 'search', query: string): void
  (e: 'clear'): void
  (e: 'focus'): void
  (e: 'blur'): void
  (e: 'arrow-down'): void
}

const emit = defineEmits<Emits>()

// Reactive state
const searchQuery = ref('')
const isLoading = ref(false)
const isFocused = ref(false)
const searchInput = ref<HTMLInputElement>()

// Debounce timer and configuration
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_DELAY = 300 // milliseconds
const MIN_QUERY_LENGTH = 2

// Methods
const handleInput = () => {
  const query = searchQuery.value.trim()
  
  // Clear existing timer
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  
  // If query is too short, clear results and don't search
  if (query.length < MIN_QUERY_LENGTH) {
    isLoading.value = false
    emit('clear')
    return
  }
  
  // Set up debounced search with improved logic
  debounceTimer = setTimeout(() => {
    // Double-check that the query hasn't changed and is still valid
    const currentQuery = searchQuery.value.trim()
    if (currentQuery === query && currentQuery.length >= MIN_QUERY_LENGTH && !props.disabled) {
      performSearch(currentQuery)
    }
  }, DEBOUNCE_DELAY)
}

const performSearch = (query: string) => {
  if (props.disabled) return
  
  isLoading.value = true
  emit('search', query)
}

const handleEnterKey = () => {
  const query = searchQuery.value.trim()
  if (query.length >= MIN_QUERY_LENGTH && !props.disabled) {
    // Clear debounce timer and search immediately
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    performSearch(query)
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  isLoading.value = false
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  emit('clear')
  searchInput.value?.focus()
}

const handleFocus = () => {
  isFocused.value = true
  emit('focus')
}

const handleBlur = () => {
  isFocused.value = false
  emit('blur')
}

const handleArrowDown = () => {
  emit('arrow-down')
}

// Public methods for parent components
const setLoading = (loading: boolean) => {
  isLoading.value = loading
}

const focus = () => {
  searchInput.value?.focus()
}

const setValue = (value: string) => {
  searchQuery.value = value
}

// Expose methods to parent
defineExpose({
  setLoading,
  focus,
  setValue,
  clearSearch
})

// Watch for external disabled state changes
watch(() => props.disabled, (newDisabled) => {
  if (newDisabled && debounceTimer) {
    clearTimeout(debounceTimer)
    isLoading.value = false
  }
})

// Cleanup on unmount
onMounted(() => {
  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
  }
})
</script>

<style scoped>
.search-bar {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: var(--space-4) var(--space-6);
  padding-right: 3rem; /* Space for loading spinner or clear button */
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-2xl);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--text-primary);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-normal);
  font-weight: var(--font-medium);
}

.search-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 1);
  box-shadow: var(--shadow-xl), 0 0 0 3px rgba(59, 130, 246, 0.2);
  transform: translateY(-1px);
}

.search-input:hover:not(:disabled) {
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.98);
}

.search-input:disabled {
  background: rgba(255, 255, 255, 0.7);
  color: var(--text-muted);
  cursor: not-allowed;
  transform: none;
}

.search-input::placeholder {
  color: var(--text-tertiary);
  font-weight: var(--font-normal);
}

.search-loading {
  position: absolute;
  right: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-light);
  border-top: 2px solid var(--sky-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.clear-button {
  position: absolute;
  right: var(--space-4);
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: var(--text-xl);
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all var(--transition-fast);
  font-weight: var(--font-normal);
}

.clear-button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  transform: scale(1.1);
}

.clear-button:focus-visible {
  outline: 2px solid var(--sky-500);
  outline-offset: 2px;
  background: var(--bg-tertiary);
}

.clear-button:active {
  transform: scale(0.95);
}

.search-help {
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  font-weight: var(--font-medium);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Mobile-first responsive design */
@media (max-width: 640px) {
  .search-input {
    font-size: 16px; /* Prevent zoom on iOS */
    padding: var(--space-4) var(--space-5);
    padding-right: 2.75rem;
  }
  
  .search-bar {
    max-width: 100%;
  }

  .clear-button {
    width: 24px;
    height: 24px;
    right: var(--space-3);
  }

  .search-help {
    font-size: var(--text-xs);
  }
}

@media (max-width: 480px) {
  .search-input {
    padding: var(--space-3) var(--space-4);
    padding-right: 2.5rem;
    border-radius: var(--radius-xl);
  }

  .clear-button {
    width: 22px;
    height: 22px;
    font-size: var(--text-lg);
  }
}

/* Tablet styles */
@media (min-width: 641px) and (max-width: 1024px) {
  .search-input {
    padding: var(--space-5) var(--space-6);
    font-size: var(--text-lg);
  }
}

/* Large screen optimizations */
@media (min-width: 1200px) {
  .search-bar {
    max-width: 700px;
  }

  .search-input {
    padding: var(--space-5) var(--space-8);
    font-size: var(--text-lg);
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .search-input {
    border-color: var(--text-primary);
    background: var(--bg-primary);
    color: var(--text-primary);
  }
  
  .search-input:focus {
    border-color: var(--sky-600);
    box-shadow: 0 0 0 3px var(--sky-200);
  }

  .clear-button {
    background: var(--bg-primary);
    border: 1px solid var(--text-primary);
  }

  .search-help {
    color: var(--text-inverse);
    text-shadow: none;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .search-input,
  .clear-button {
    transition: none;
  }

  .search-input:focus {
    transform: none;
  }

  .clear-button:hover {
    transform: none;
  }

  .clear-button:active {
    transform: none;
  }

  .spinner {
    animation: none;
  }
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .search-input:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.95);
  }

  .clear-button:hover {
    background: var(--bg-secondary);
    transform: none;
  }

  .clear-button {
    width: 32px;
    height: 32px;
    font-size: var(--text-xl);
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .search-input {
    background: rgba(30, 41, 59, 0.95);
    border-color: rgba(100, 116, 139, 0.3);
    color: var(--text-primary);
  }

  .search-input:focus {
    background: rgba(30, 41, 59, 1);
    border-color: rgba(100, 116, 139, 0.8);
  }

  .search-input:hover:not(:disabled) {
    background: rgba(30, 41, 59, 0.98);
    border-color: rgba(100, 116, 139, 0.5);
  }

  .search-help {
    color: rgba(203, 213, 225, 0.8);
  }
}

/* Print styles */
@media print {
  .search-bar {
    display: none;
  }
}
</style>