<template>
  <div class="weather-display">
    <!-- Loading State -->
    <div v-if="loading" class="weather-loading" role="status" aria-live="polite" aria-label="Loading weather data">
      <div class="loading-spinner" aria-hidden="true">
        <div class="spinner"></div>
      </div>
      <div class="loading-text">Loading weather data...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="weather-error" role="alert" aria-live="assertive">
      <div class="error-icon" aria-hidden="true">⚠️</div>
      <div class="error-content">
        <h3 class="error-title">Unable to load weather data</h3>
        <p class="error-message">{{ error.message }}</p>
        <button 
          v-if="error.retryable" 
          @click="handleRetry"
          class="retry-button touch-target"
          type="button"
          :disabled="retrying"
          :aria-label="retrying ? 'Retrying to load weather data' : 'Retry loading weather data'"
        >
          {{ retrying ? 'Retrying...' : 'Try Again' }}
        </button>
      </div>
    </div>

    <!-- Weather Content -->
    <div v-else-if="weatherData" class="weather-content">
      <div class="location-header" role="banner">
        <h1 class="location-name" id="location-name">{{ formatLocationName(weatherData.location) }}</h1>
        <div class="last-updated" aria-label="Data last updated time">
          Last updated: 
          <time :datetime="weatherData.current.timestamp.toISOString()">
            {{ formatLastUpdated(weatherData.current.timestamp) }}
          </time>
        </div>
      </div>

      <CurrentWeather :current-weather="weatherData.current" />
      <ForecastList :forecast="weatherData.forecast" />
    </div>

    <!-- No Data State -->
    <div v-else class="weather-empty" role="status">
      <div class="empty-icon" aria-hidden="true">🌤️</div>
      <div class="empty-message">
        <h3>No weather data available</h3>
        <p>Select a location to view weather information</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import CurrentWeather from './CurrentWeather.vue'
import ForecastList from './ForecastList.vue'
import { weatherService } from '@/services/WeatherService'
import type { WeatherData, Location, AppError } from '@/types'

interface Props {
  location: Location | null
}

interface Emits {
  (e: 'retry'): void
  (e: 'weather-loaded', data: WeatherData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Component state
const weatherData = ref<WeatherData | null>(null)
const loading = ref(false)
const error = ref<AppError | null>(null)
const retrying = ref(false)

/**
 * Fetch weather data for the current location
 */
async function fetchWeatherData(): Promise<void> {
  if (!props.location) {
    weatherData.value = null
    error.value = null
    loading.value = false
    return
  }

  loading.value = true
  error.value = null

  try {
    const [currentWeather, forecast] = await Promise.all([
      weatherService.getCurrentWeather(props.location.latitude, props.location.longitude),
      weatherService.getForecast(props.location.latitude, props.location.longitude)
    ])

    weatherData.value = {
      current: currentWeather,
      forecast,
      location: props.location
    }
    
    // Emit weather loaded event for accessibility announcements
    emit('weather-loaded', weatherData.value)
  } catch (err) {
    console.error('Failed to fetch weather data:', err)
    
    // Handle AppError instances
    if (err && typeof err === 'object' && 'type' in err) {
      error.value = err as AppError
    } else {
      // Fallback for unexpected errors
      error.value = {
        type: 'api',
        message: 'An unexpected error occurred while loading weather data',
        retryable: true,
        originalError: err instanceof Error ? err : new Error(String(err))
      }
    }
    
    weatherData.value = null
  } finally {
    loading.value = false
  }
}

/**
 * Handle retry button click
 */
async function handleRetry(): Promise<void> {
  retrying.value = true
  emit('retry')
  
  try {
    await fetchWeatherData()
  } finally {
    retrying.value = false
  }
}

/**
 * Format location name for display
 */
function formatLocationName(location: Location): string {
  const parts = [location.name]
  
  if (location.admin1) {
    parts.push(location.admin1)
  }
  
  parts.push(location.country)
  
  return parts.join(', ')
}

/**
 * Format last updated timestamp
 */
function formatLastUpdated(timestamp: Date): string {
  return timestamp.toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric'
  })
}

// Watch for location changes and fetch weather data
watch(
  () => props.location,
  () => {
    fetchWeatherData()
  },
  { immediate: true }
)

// Expose methods for testing
defineExpose({
  fetchWeatherData,
  handleRetry
})
</script>

<style scoped>
.weather-display {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

/* Loading State */
.weather-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-20) var(--space-6);
  text-align: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: var(--radius-3xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin: var(--space-8) 0;
}

.loading-spinner {
  margin-bottom: var(--space-6);
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(59, 130, 246, 0.2);
  border-top: 4px solid var(--sky-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: var(--text-lg);
  color: var(--text-secondary);
  font-weight: var(--font-medium);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Error State */
.weather-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) var(--space-6);
  text-align: center;
  background: rgba(254, 243, 199, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: var(--radius-3xl);
  box-shadow: var(--shadow-xl);
  margin: var(--space-8) 0;
}

.error-icon {
  font-size: clamp(2.5rem, 6vw, 3.5rem);
  margin-bottom: var(--space-6);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.error-content {
  max-width: 500px;
}

.error-title {
  font-size: clamp(var(--text-xl), 4vw, var(--text-2xl));
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--space-3) 0;
  line-height: var(--leading-tight);
}

.error-message {
  font-size: var(--text-base);
  color: var(--text-secondary);
  margin: 0 0 var(--space-8) 0;
  line-height: var(--leading-relaxed);
}

.retry-button {
  background: linear-gradient(135deg, var(--sky-500) 0%, var(--sky-600) 100%);
  color: var(--text-inverse);
  border: none;
  padding: var(--space-4) var(--space-8);
  border-radius: var(--radius-xl);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--transition-normal);
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
}

.retry-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.retry-button:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--sky-600) 0%, var(--sky-700) 100%);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.retry-button:hover:not(:disabled)::before {
  left: 100%;
}

.retry-button:active:not(:disabled) {
  transform: translateY(0);
}

.retry-button:disabled {
  background: var(--bg-tertiary);
  color: var(--text-muted);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Weather Content */
.weather-content {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.location-header {
  text-align: center;
  margin-bottom: var(--space-8);
  padding: var(--space-8);
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: var(--radius-3xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.location-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 70% 70%, rgba(59, 130, 246, 0.03) 0%, transparent 50%);
  pointer-events: none;
}

.location-name {
  font-size: clamp(var(--text-2xl), 5vw, var(--text-4xl));
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin: 0 0 var(--space-3) 0;
  line-height: var(--leading-tight);
  letter-spacing: -0.025em;
  position: relative;
  z-index: 1;
}

.last-updated {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  font-weight: var(--font-medium);
  position: relative;
  z-index: 1;
}

/* Empty State */
.weather-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-20) var(--space-6);
  text-align: center;
  background: rgba(248, 250, 252, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 2px dashed rgba(203, 213, 225, 0.6);
  border-radius: var(--radius-3xl);
  margin: var(--space-8) 0;
}

.empty-icon {
  font-size: clamp(3rem, 8vw, 4.5rem);
  margin-bottom: var(--space-6);
  opacity: 0.6;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.empty-message h3 {
  font-size: clamp(var(--text-xl), 4vw, var(--text-2xl));
  font-weight: var(--font-semibold);
  color: var(--text-secondary);
  margin: 0 0 var(--space-3) 0;
  line-height: var(--leading-tight);
}

.empty-message p {
  font-size: var(--text-base);
  color: var(--text-tertiary);
  margin: 0;
  line-height: var(--leading-relaxed);
}

/* Mobile-first responsive design */
@media (max-width: 640px) {
  .weather-display {
    padding: 0 var(--space-3);
  }

  .location-header {
    padding: var(--space-6);
    margin-bottom: var(--space-6);
    border-radius: var(--radius-2xl);
  }

  .weather-loading,
  .weather-error,
  .weather-empty {
    padding: var(--space-12) var(--space-4);
    margin: var(--space-6) 0;
    border-radius: var(--radius-2xl);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border-width: 3px;
  }

  .loading-text {
    font-size: var(--text-base);
  }

  .retry-button {
    padding: var(--space-3) var(--space-6);
    font-size: var(--text-sm);
  }
}

@media (max-width: 480px) {
  .weather-display {
    padding: 0 var(--space-2);
  }

  .location-header {
    padding: var(--space-5);
    border-radius: var(--radius-xl);
  }

  .weather-loading,
  .weather-error,
  .weather-empty {
    padding: var(--space-8) var(--space-3);
    border-radius: var(--radius-xl);
  }

  .last-updated {
    font-size: var(--text-xs);
  }

  .spinner {
    width: 36px;
    height: 36px;
  }

  .retry-button {
    padding: var(--space-3) var(--space-5);
    font-size: var(--text-sm);
  }
}

/* Tablet styles */
@media (min-width: 641px) and (max-width: 1024px) {
  .weather-display {
    padding: 0 var(--space-6);
  }

  .location-header {
    padding: var(--space-10);
  }
}

/* Large screen optimizations */
@media (min-width: 1200px) {
  .weather-display {
    max-width: 1000px;
    padding: 0 var(--space-8);
  }

  .location-header {
    padding: var(--space-12);
  }

  .weather-loading,
  .weather-error,
  .weather-empty {
    padding: var(--space-20) var(--space-8);
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .weather-loading,
  .location-header {
    background: var(--bg-primary);
    border: 2px solid var(--text-primary);
  }

  .weather-error {
    background: var(--warning-light);
    border-color: var(--warning);
  }

  .weather-empty {
    background: var(--bg-secondary);
    border-color: var(--text-primary);
  }

  .retry-button {
    background: var(--sky-600);
    border: 1px solid var(--text-primary);
  }

  .retry-button:hover:not(:disabled) {
    background: var(--sky-700);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .weather-content {
    animation: none;
  }

  .empty-icon {
    animation: none;
  }

  .spinner {
    animation: none;
  }

  .retry-button {
    transition: none;
  }

  .retry-button:hover:not(:disabled) {
    transform: none;
  }

  .retry-button::before {
    display: none;
  }
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .retry-button:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--sky-500) 0%, var(--sky-600) 100%);
    transform: none;
    box-shadow: var(--shadow-md);
  }

  .retry-button {
    padding: var(--space-4) var(--space-8);
    min-height: 44px; /* Minimum touch target size */
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .weather-loading,
  .location-header {
    background: rgba(30, 41, 59, 0.98);
    border-color: rgba(100, 116, 139, 0.2);
  }

  .weather-error {
    background: rgba(120, 53, 15, 0.95);
    border-color: rgba(217, 119, 6, 0.3);
  }

  .weather-empty {
    background: rgba(51, 65, 85, 0.95);
    border-color: rgba(100, 116, 139, 0.6);
  }
}

/* Print styles */
@media print {
  .weather-display {
    max-width: none;
    padding: 0;
  }

  .weather-loading,
  .weather-error,
  .weather-empty,
  .location-header {
    background: white !important;
    box-shadow: none !important;
    border: 1px solid #ccc !important;
  }

  .location-header::before {
    display: none;
  }

  .retry-button {
    background: #333 !important;
    color: white !important;
  }

  .spinner {
    border-color: #ccc !important;
    border-top-color: #333 !important;
  }
}

/* Landscape phone optimization */
@media (max-height: 500px) and (orientation: landscape) {
  .weather-loading,
  .weather-error,
  .weather-empty {
    padding: var(--space-8) var(--space-4);
  }

  .location-header {
    padding: var(--space-4);
    margin-bottom: var(--space-4);
  }
}
</style>