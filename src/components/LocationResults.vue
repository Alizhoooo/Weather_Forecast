<template>
  <div class="location-results" v-if="showResults">
    <!-- Loading state -->
    <div v-if="loading" class="results-loading" aria-live="polite">
      <div class="loading-spinner"></div>
      <span class="loading-text">Searching for locations...</span>
    </div>

    <!-- No results state -->
    <div 
      v-else-if="!loading && locations.length === 0 && hasSearched"
      class="no-results"
      role="status"
      aria-live="polite"
    >
      <div class="no-results-icon">📍</div>
      <p class="no-results-text">No locations found</p>
      <p class="no-results-help">Try searching with a different location name</p>
    </div>

    <!-- Results list -->
    <div 
      v-else-if="!loading && locations.length > 0"
      class="results-list"
      role="listbox"
      aria-label="Location search results"
      :aria-activedescendant="highlightedIndex >= 0 ? `location-${locations[highlightedIndex]?.id}` : undefined"
    >
      <button
        v-for="(location, index) in locations"
        :key="location.id"
        :id="`location-${location.id}`"
        class="location-item touch-target"
        :class="{ 'location-item--highlighted': highlightedIndex === index }"
        role="option"
        :aria-selected="highlightedIndex === index"
        :tabindex="highlightedIndex === index ? 0 : -1"
        @click="selectLocation(location)"
        @mouseenter="highlightedIndex = index"
        @mouseleave="highlightedIndex = -1"
        @keydown.enter="selectLocation(location)"
        @keydown.space.prevent="selectLocation(location)"
        @keydown.arrow-up.prevent="navigateUp"
        @keydown.arrow-down.prevent="navigateDown"
        @keydown.escape="$emit('close')"
        @focus="highlightedIndex = index"
      >
        <div class="location-main">
          <span class="location-name">{{ location.name }}</span>
          <span class="location-region" v-if="location.admin1">
            , {{ location.admin1 }}
          </span>
        </div>
        <div class="location-country">{{ location.country }}</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, readonly } from 'vue'
import type { Location } from '@/types'

// Props
interface Props {
  locations: Location[]
  loading?: boolean
  hasSearched?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  hasSearched: false
})

// Emits
interface Emits {
  (e: 'select-location', location: Location): void
  (e: 'close'): void
}

const emit = defineEmits<Emits>()

// Reactive state
const highlightedIndex = ref(-1)
const keyboardNavActive = ref(false)

// Computed properties
const showResults = computed(() => {
  return props.loading || (props.hasSearched && props.locations.length === 0) || props.locations.length > 0
})

// Methods
const selectLocation = (location: Location) => {
  emit('select-location', location)
  highlightedIndex.value = -1
}

const navigateUp = () => {
  if (highlightedIndex.value > 0) {
    highlightedIndex.value--
  } else {
    highlightedIndex.value = props.locations.length - 1
  }
  focusHighlightedItem()
}

const navigateDown = () => {
  if (highlightedIndex.value < props.locations.length - 1) {
    highlightedIndex.value++
  } else {
    highlightedIndex.value = 0
  }
  focusHighlightedItem()
}

// Initialize keyboard navigation
const initializeKeyboardNavigation = () => {
  if (props.locations.length > 0 && highlightedIndex.value === -1) {
    highlightedIndex.value = 0
    focusHighlightedItem()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!showResults.value || props.loading || props.locations.length === 0) return

  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      navigateUp()
      break
    case 'ArrowDown':
      event.preventDefault()
      navigateDown()
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (highlightedIndex.value >= 0 && highlightedIndex.value < props.locations.length) {
        selectLocation(props.locations[highlightedIndex.value])
      }
      break
    case 'Escape':
      event.preventDefault()
      emit('close')
      break
  }
}

// Focus management
const focusHighlightedItem = () => {
  if (highlightedIndex.value >= 0 && highlightedIndex.value < props.locations.length) {
    const locationId = props.locations[highlightedIndex.value].id
    const element = document.getElementById(`location-${locationId}`)
    if (element) {
      element.focus()
    }
  }
}

// Watch for location changes to reset highlight
watch(() => props.locations, () => {
  highlightedIndex.value = -1
})

// Watch for loading state changes
watch(() => props.loading, (newLoading) => {
  if (newLoading) {
    highlightedIndex.value = -1
  }
})

// Watch for highlighted index changes to manage focus
watch(highlightedIndex, () => {
  if (keyboardNavActive.value) {
    focusHighlightedItem()
  }
})

// Keyboard navigation detection
const handleGlobalKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Tab') {
    keyboardNavActive.value = true
  }
}

const handleGlobalMouseDown = () => {
  keyboardNavActive.value = false
}

// Keyboard event listeners
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('keydown', handleGlobalKeyDown)
  document.addEventListener('mousedown', handleGlobalMouseDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('keydown', handleGlobalKeyDown)
  document.removeEventListener('mousedown', handleGlobalMouseDown)
})

// Expose methods for parent components
defineExpose({
  highlightedIndex: readonly(highlightedIndex),
  initializeKeyboardNavigation,
  navigateUp,
  navigateDown
})
</script>

<style scoped>
.location-results {
  width: 100%;
  max-width: 600px;
  margin: var(--space-4) auto 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  z-index: var(--z-dropdown);
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Loading state */
.results-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  gap: var(--space-3);
}

.loading-spinner {
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

.loading-text {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

/* No results state */
.no-results {
  text-align: center;
  padding: var(--space-12) var(--space-6);
  color: var(--text-secondary);
}

.no-results-icon {
  font-size: var(--text-4xl);
  margin-bottom: var(--space-4);
  opacity: 0.6;
}

.no-results-text {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin: 0 0 var(--space-2) 0;
  color: var(--text-primary);
}

.no-results-help {
  font-size: var(--text-sm);
  margin: 0;
  color: var(--text-tertiary);
}

/* Results list */
.results-list {
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-medium) transparent;
}

.location-item {
  width: 100%;
  padding: var(--space-4) var(--space-6);
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: block;
  position: relative;
}

.location-item:last-child {
  border-bottom: none;
}

.location-item:hover,
.location-item--highlighted {
  background: rgba(59, 130, 246, 0.1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.location-item:focus {
  outline: none;
  background: rgba(59, 130, 246, 0.15);
  box-shadow: inset 2px 0 0 var(--sky-500);
}

.location-item:focus-visible {
  outline: 2px solid var(--sky-500);
  outline-offset: -2px;
}

.location-item:active {
  background: rgba(59, 130, 246, 0.2);
  transform: scale(0.98);
}

.location-main {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
  line-height: var(--leading-tight);
}

.location-name {
  color: var(--text-primary);
}

.location-region {
  color: var(--text-secondary);
  font-weight: var(--font-medium);
}

.location-country {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  line-height: var(--leading-normal);
  font-weight: var(--font-medium);
}

/* Mobile-first responsive design */
@media (max-width: 640px) {
  .location-results {
    max-width: 100%;
    margin: var(--space-3) auto 0;
    border-radius: var(--radius-xl);
  }
  
  .location-item {
    padding: var(--space-4) var(--space-4);
  }
  
  .location-main {
    font-size: var(--text-sm);
  }
  
  .location-country {
    font-size: var(--text-xs);
  }

  .no-results {
    padding: var(--space-8) var(--space-4);
  }

  .no-results-icon {
    font-size: var(--text-3xl);
  }
}

@media (max-width: 480px) {
  .location-results {
    border-radius: var(--radius-lg);
    margin: var(--space-2) auto 0;
  }

  .location-item {
    padding: var(--space-3) var(--space-3);
  }

  .results-list {
    max-height: 280px;
  }
}

/* Tablet styles */
@media (min-width: 641px) and (max-width: 1024px) {
  .location-item {
    padding: var(--space-5) var(--space-6);
  }

  .location-main {
    font-size: var(--text-lg);
  }
}

/* Large screen optimizations */
@media (min-width: 1200px) {
  .location-results {
    max-width: 700px;
  }

  .location-item {
    padding: var(--space-5) var(--space-8);
  }

  .results-list {
    max-height: 400px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .location-results {
    background: var(--bg-primary);
    border-color: var(--text-primary);
  }
  
  .location-item {
    border-bottom-color: var(--border-medium);
  }
  
  .location-item:focus {
    box-shadow: inset 3px 0 0 var(--sky-600);
    background: var(--bg-secondary);
  }
  
  .location-item:hover,
  .location-item--highlighted {
    background: var(--bg-secondary);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .location-results {
    animation: none;
  }

  .location-item {
    transition: none;
  }

  .location-item:active {
    transform: none;
  }

  .loading-spinner {
    animation: none;
  }
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .location-item {
    padding: var(--space-5) var(--space-4);
    min-height: 44px; /* Minimum touch target size */
  }

  .location-item:hover {
    background: none;
  }

  .location-item:active {
    background: rgba(59, 130, 246, 0.2);
    transform: none;
  }
}

/* Scrollbar styling for webkit browsers */
.results-list::-webkit-scrollbar {
  width: 6px;
}

.results-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

.results-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-sm);
}

.results-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .location-results {
    background: rgba(30, 41, 59, 0.98);
    border-color: rgba(100, 116, 139, 0.2);
  }

  .location-item:hover,
  .location-item--highlighted {
    background: rgba(59, 130, 246, 0.2);
  }

  .location-item:focus {
    background: rgba(59, 130, 246, 0.25);
  }

  .results-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }

  .results-list::-webkit-scrollbar-thumb {
    background: rgba(100, 116, 139, 0.3);
  }

  .results-list::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.5);
  }
}

/* Print styles */
@media print {
  .location-results {
    display: none;
  }
}
</style>