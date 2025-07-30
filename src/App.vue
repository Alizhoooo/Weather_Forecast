<script setup lang="ts">
import { ref, onErrorCaptured, onMounted, onUnmounted } from 'vue'
import SearchBar from './components/SearchBar.vue'
import LocationResults from './components/LocationResults.vue'
import WeatherDisplay from './components/WeatherDisplay.vue'
import ErrorMessage from './components/ErrorMessage.vue'
import LoadingSpinner from './components/LoadingSpinner.vue'
import LiveRegion from './components/LiveRegion.vue'
import { locationService } from './services/LocationService'
import { NetworkChecker } from './utils/errorHandling'
import type { Location, AppError, WeatherData } from './types'
import { createAppError } from './types'

// Application state using Vue's reactive system
const selectedLocation = ref<Location | null>(null)
const searchResults = ref<Location[]>([])
const isSearching = ref(false)
const hasSearched = ref(false)
const globalError = ref<AppError | null>(null)
const isInitializing = ref(true)
const isOnline = ref(navigator.onLine)
const networkChecker = NetworkChecker.getInstance()
const keyboardNavActive = ref(false)
const searchBarRef = ref<InstanceType<typeof SearchBar> | null>(null)
const locationResultsRef = ref<InstanceType<typeof LocationResults> | null>(null)
const liveRegionMessage = ref('')

// Global error boundary for unexpected errors
onErrorCaptured((error: Error, instance, info) => {
  console.error('Global error captured:', error, info)
  
  globalError.value = createAppError(
    'api',
    'An unexpected error occurred in the application. Please refresh the page and try again.',
    true,
    error
  )
  
  // Return false to prevent the error from propagating further
  return false
})

// Handle location search
async function handleSearch(query: string): Promise<void> {
  if (!query.trim()) {
    clearSearchResults()
    return
  }

  isSearching.value = true
  globalError.value = null

  try {
    const results = await locationService.searchLocations(query)
    searchResults.value = results
    hasSearched.value = true
    
    // Announce search results to screen readers
    if (results.length > 0) {
      liveRegionMessage.value = `Found ${results.length} location${results.length === 1 ? '' : 's'} for "${query}"`
    } else {
      liveRegionMessage.value = `No locations found for "${query}"`
    }
  } catch (error) {
    console.error('Search error:', error)
    
    // Handle AppError instances
    if (error && typeof error === 'object' && 'type' in error) {
      globalError.value = error as AppError
    } else {
      globalError.value = createAppError(
        'api',
        'Failed to search for locations. Please try again.',
        true,
        error instanceof Error ? error : new Error(String(error))
      )
    }
    
    searchResults.value = []
    hasSearched.value = true
  } finally {
    isSearching.value = false
  }
}

// Handle location selection
function handleLocationSelect(location: Location): void {
  selectedLocation.value = location
  clearSearchResults()
  globalError.value = null
  
  // Announce location selection to screen readers
  liveRegionMessage.value = `Selected ${location.name}, ${location.country}. Loading weather data.`
}

// Clear search results
function clearSearchResults(): void {
  searchResults.value = []
  hasSearched.value = false
  isSearching.value = false
}

// Handle retry for global errors
function handleGlobalRetry(): void {
  globalError.value = null
  
  // If we have a selected location, try to refresh weather data
  if (selectedLocation.value) {
    // The WeatherDisplay component will handle the retry internally
    return
  }
  
  // Otherwise, just clear the error
  clearSearchResults()
}

// Handle weather display retry
function handleWeatherRetry(): void {
  // Clear any global errors when weather component retries
  globalError.value = null
}

// Handle weather data loaded
function handleWeatherLoaded(data: WeatherData): void {
  const temp = Math.round(data.current.temperature)
  const condition = getWeatherDescription(data.current.weatherCode)
  liveRegionMessage.value = `Weather data loaded for ${data.location.name}. Current temperature is ${temp}°C with ${condition}.`
}

// Helper function to get weather description
function getWeatherDescription(weatherCode: number): string {
  const descriptionMap: Record<number, string> = {
    0: 'clear sky',
    1: 'mainly clear',
    2: 'partly cloudy',
    3: 'overcast',
    45: 'fog',
    48: 'depositing rime fog',
    51: 'light drizzle',
    53: 'moderate drizzle',
    55: 'dense drizzle',
    61: 'slight rain',
    63: 'moderate rain',
    65: 'heavy rain',
    71: 'slight snow fall',
    73: 'moderate snow fall',
    75: 'heavy snow fall',
    95: 'thunderstorm'
  }
  
  return descriptionMap[weatherCode] || 'unknown conditions'
}

// Handle arrow down from search bar
function handleSearchArrowDown(): void {
  locationResultsRef.value?.initializeKeyboardNavigation()
}

// Network status listener
const networkStatusListener = (online: boolean) => {
  isOnline.value = online
  
  if (!online) {
    globalError.value = createAppError(
      'network',
      'You are currently offline. Some features may not be available.',
      true
    )
  } else if (globalError.value?.type === 'network') {
    // Clear network errors when coming back online
    globalError.value = null
  }
}

// Keyboard navigation detection
const handleKeyDown = (event: KeyboardEvent) => {
  // Detect keyboard navigation
  if (event.key === 'Tab') {
    keyboardNavActive.value = true
  }
  
  // Global keyboard shortcuts
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'k':
      case '/':
        event.preventDefault()
        searchBarRef.value?.focus()
        break
    }
  }
  
  // Escape key handling
  if (event.key === 'Escape') {
    if (searchResults.value.length > 0) {
      clearSearchResults()
    }
  }
}

const handleMouseDown = () => {
  keyboardNavActive.value = false
}

// Focus management for skip link
const handleSkipToMain = (event: Event) => {
  event.preventDefault()
  const mainContent = document.getElementById('main-content')
  if (mainContent) {
    mainContent.focus()
    mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Initialize application
onMounted(() => {
  // Set up network status monitoring
  networkChecker.addNetworkListener(networkStatusListener)
  isOnline.value = networkChecker.isNetworkOnline()
  
  // Set up keyboard navigation detection
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('mousedown', handleMouseDown)
  
  // Set up skip link handler
  const skipLink = document.querySelector('.skip-link')
  if (skipLink) {
    skipLink.addEventListener('click', handleSkipToMain)
  }
  
  // Simulate brief initialization period for better UX
  setTimeout(() => {
    isInitializing.value = false
  }, 500)
})

// Cleanup on unmount
onUnmounted(() => {
  networkChecker.removeNetworkListener(networkStatusListener)
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('mousedown', handleMouseDown)
  
  const skipLink = document.querySelector('.skip-link')
  if (skipLink) {
    skipLink.removeEventListener('click', handleSkipToMain)
  }
})
</script>

<template>
  <div class="app" :class="{ 'keyboard-nav-active': keyboardNavActive }">
    <!-- Skip to main content link -->
    <a href="#main-content" class="skip-link">Skip to main content</a>
    
    <!-- Live region for screen reader announcements -->
    <LiveRegion :message="liveRegionMessage" />
    
    <!-- Global loading state during initialization -->
    <div v-if="isInitializing" class="app-initializing">
      <LoadingSpinner 
        size="large" 
        message="Initializing Weather App..." 
        aria-label="Loading application"
      />
    </div>

    <!-- Main application content -->
    <div v-else class="app-content" data-testid="app-content">
      <!-- Header -->
      <header class="app-header" role="banner">
        <div class="header-content">
          <h1 class="app-title" id="app-title">Weather Forecast</h1>
          <p class="app-subtitle" aria-describedby="app-title">Search for locations and view weather conditions</p>
        </div>
      </header>

      <!-- Main content area -->
      <main class="app-main" role="main" id="main-content" tabindex="-1">
        <!-- Network status indicator -->
        <div v-if="!isOnline" class="network-status offline" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="network-status__icon" aria-hidden="true">📡</div>
          <div class="network-status__content">
            <strong>You're offline</strong>
            <p>Check your internet connection. Some features may not work.</p>
          </div>
        </div>

        <!-- Global error display -->
        <div v-if="globalError" class="global-error" role="alert" aria-live="assertive" aria-atomic="true">
          <ErrorMessage 
            :error="globalError" 
            @retry="handleGlobalRetry"
          />
        </div>

        <!-- Search section -->
        <section class="search-section" aria-labelledby="search-heading">
          <h2 id="search-heading" class="sr-only">Location Search</h2>
          <SearchBar 
            ref="searchBarRef"
            @search="handleSearch"
            @clear="clearSearchResults"
            @arrow-down="handleSearchArrowDown"
            :disabled="isSearching"
            placeholder="Search for a city or location..."
          />
          
          <LocationResults
            v-if="searchResults.length > 0 || isSearching || hasSearched"
            ref="locationResultsRef"
            :locations="searchResults"
            :loading="isSearching"
            :has-searched="hasSearched"
            @select-location="handleLocationSelect"
            @close="clearSearchResults"
          />
        </section>

        <!-- Weather display section -->
        <section 
          v-if="selectedLocation || globalError" 
          class="weather-section" 
          aria-labelledby="weather-heading"
        >
          <h2 id="weather-heading" class="sr-only">Weather Information</h2>
          <WeatherDisplay 
            :location="selectedLocation"
            @retry="handleWeatherRetry"
            @weather-loaded="handleWeatherLoaded"
          />
        </section>

        <!-- Welcome message when no location is selected -->
        <section v-else class="welcome-section" aria-labelledby="welcome-heading">
          <div class="welcome-content">
            <div class="welcome-icon" aria-hidden="true">🌤️</div>
            <h2 id="welcome-heading" class="welcome-title">Welcome to Weather Forecast</h2>
            <p class="welcome-text">
              Search for any city or location above to view current weather conditions and a 7-day forecast.
            </p>
            <div class="welcome-features" role="list" aria-label="Application features">
              <div class="feature" role="listitem">
                <span class="feature-icon" aria-hidden="true">🔍</span>
                <span class="feature-text">Search worldwide locations</span>
              </div>
              <div class="feature" role="listitem">
                <span class="feature-icon" aria-hidden="true">🌡️</span>
                <span class="feature-text">Current weather conditions</span>
              </div>
              <div class="feature" role="listitem">
                <span class="feature-icon" aria-hidden="true">📅</span>
                <span class="feature-text">7-day weather forecast</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- Footer -->
      <footer class="app-footer" role="contentinfo">
        <div class="footer-content">
          <p class="footer-text">
            Weather data provided by 
            <a 
              href="https://open-meteo.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              class="footer-link"
              aria-label="Open-Meteo weather service (opens in new tab)"
            >
              Open-Meteo
            </a>
          </p>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

.app-initializing {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.app-content {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

/* Header */
.app-header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: var(--space-8) 0;
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-4);
  text-align: center;
}

.app-title {
  font-size: clamp(var(--text-3xl), 5vw, var(--text-5xl));
  font-weight: var(--font-bold);
  color: var(--text-inverse);
  margin: 0 0 var(--space-2) 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.025em;
}

.app-subtitle {
  font-size: clamp(var(--text-lg), 3vw, var(--text-xl));
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  font-weight: var(--font-normal);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Main content */
.app-main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
  width: 100%;
}

.network-status {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  margin-bottom: var(--space-6);
  border-radius: var(--radius-xl);
  border: 1px solid;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
}

.network-status.offline {
  background: rgba(255, 251, 235, 0.95);
  border-color: rgba(251, 191, 36, 0.3);
  color: var(--warning);
}

.network-status__icon {
  font-size: var(--text-2xl);
  flex-shrink: 0;
}

.network-status__content {
  flex: 1;
}

.network-status__content strong {
  display: block;
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-1);
}

.network-status__content p {
  margin: 0;
  font-size: var(--text-sm);
  opacity: 0.9;
}

.global-error {
  margin-bottom: var(--space-8);
}

/* Search section */
.search-section {
  margin-bottom: var(--space-12);
  position: relative;
}

/* Weather section */
.weather-section {
  margin-bottom: var(--space-8);
}

/* Welcome section */
.welcome-section {
  text-align: center;
  padding: var(--space-16) var(--space-4);
}

.welcome-content {
  max-width: 600px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: var(--space-12) var(--space-8);
  border-radius: var(--radius-3xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform var(--transition-slow), box-shadow var(--transition-slow);
}

.welcome-content:hover {
  transform: translateY(-2px);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
}

.welcome-icon {
  font-size: clamp(3rem, 8vw, 4rem);
  margin-bottom: var(--space-6);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.welcome-title {
  font-size: clamp(var(--text-2xl), 4vw, var(--text-4xl));
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--space-4) 0;
  line-height: var(--leading-tight);
}

.welcome-text {
  font-size: var(--text-lg);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
  margin: 0 0 var(--space-8) 0;
}

.welcome-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-6);
  margin-top: var(--space-8);
}

.feature {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: rgba(59, 130, 246, 0.1);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(59, 130, 246, 0.2);
  transition: all var(--transition-normal);
}

.feature:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

.feature-icon {
  font-size: var(--text-2xl);
  flex-shrink: 0;
}

.feature-text {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

/* Footer */
.app-footer {
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: var(--space-6) 0;
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-4);
  text-align: center;
}

.footer-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: var(--text-sm);
  margin: 0;
}

.footer-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-weight: var(--font-medium);
  transition: color var(--transition-fast);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
  margin: 0 calc(-1 * var(--space-2));
}

.footer-link:hover {
  color: var(--text-inverse);
  text-decoration: underline;
}

.footer-link:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.8);
  outline-offset: 2px;
}

/* Mobile-first responsive design */
@media (max-width: 640px) {
  .app-header {
    padding: var(--space-6) 0;
  }

  .app-main {
    padding: var(--space-6) var(--space-3);
  }

  .welcome-section {
    padding: var(--space-8) var(--space-3);
  }

  .welcome-content {
    padding: var(--space-8) var(--space-6);
  }

  .welcome-features {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }

  .feature {
    padding: var(--space-3);
  }

  .feature-text {
    font-size: var(--text-xs);
  }
}

@media (max-width: 480px) {
  .header-content,
  .footer-content {
    padding: 0 var(--space-3);
  }

  .app-main {
    padding: var(--space-4) var(--space-2);
  }

  .welcome-section {
    padding: var(--space-6) var(--space-2);
  }

  .welcome-content {
    padding: var(--space-6) var(--space-4);
  }

  .welcome-icon {
    margin-bottom: var(--space-4);
  }
}

/* Tablet styles */
@media (min-width: 641px) and (max-width: 1024px) {
  .app-main {
    padding: var(--space-8) var(--space-6);
  }

  .welcome-features {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Large screen optimizations */
@media (min-width: 1200px) {
  .welcome-features {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .app-header {
    background: rgba(0, 0, 0, 0.9);
    border-bottom-color: var(--text-inverse);
  }

  .app-title,
  .app-subtitle {
    color: var(--text-inverse);
    text-shadow: none;
  }

  .welcome-content {
    background: var(--bg-primary);
    border: 2px solid var(--text-primary);
  }

  .feature {
    background: var(--bg-secondary);
    border-color: var(--text-primary);
  }

  .footer-link {
    color: var(--text-inverse);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .welcome-content {
    transition: none;
  }

  .welcome-content:hover {
    transform: none;
  }

  .welcome-icon {
    animation: none;
  }

  .feature {
    transition: none;
  }

  .feature:hover {
    transform: none;
  }

  .footer-link {
    transition: none;
  }
}

/* Focus management for accessibility */
.app-content:focus {
  outline: none;
}

#main-content:focus {
  outline: none;
}

/* Skip link styles */
.skip-link {
  position: absolute;
  top: -40px;
  left: var(--space-4);
  background: var(--black);
  color: var(--white);
  padding: var(--space-3) var(--space-6);
  text-decoration: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  z-index: var(--z-tooltip);
  transition: top var(--transition-fast);
  box-shadow: var(--shadow-lg);
}

.skip-link:focus {
  top: var(--space-4);
}

.skip-link:hover {
  background: var(--black-soft);
}

/* Keyboard navigation enhancements */
.keyboard-nav-active *:focus {
  outline: 2px solid var(--sky-500) !important;
  outline-offset: 2px !important;
}

.keyboard-nav-active .feature:focus {
  outline: 2px solid var(--sky-500);
  outline-offset: 2px;
  border-radius: var(--radius-lg);
}

/* Print styles */
@media print {
  .app-header,
  .app-footer {
    background: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  .welcome-content {
    background: white !important;
    box-shadow: none !important;
  }
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .feature:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.2);
    transform: none;
  }

  .welcome-content:hover {
    transform: none;
    box-shadow: var(--shadow-xl);
  }
}

/* Landscape phone optimization */
@media (max-height: 500px) and (orientation: landscape) {
  .app-header {
    padding: var(--space-4) 0;
  }

  .app-main {
    padding: var(--space-4) var(--space-4);
  }

  .welcome-section {
    padding: var(--space-4) var(--space-4);
  }

  .welcome-content {
    padding: var(--space-6) var(--space-6);
  }
}
</style>
