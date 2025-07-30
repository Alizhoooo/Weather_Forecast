<template>
  <div class="forecast-list" v-if="forecast && forecast.length > 0" role="region" aria-labelledby="forecast-title">
    <div class="forecast-header">
      <h2 id="forecast-title" class="forecast-title">7-Day Forecast</h2>
    </div>

    <div class="forecast-items" role="list" aria-label="Daily weather forecast">
      <div 
        v-for="(day, index) in forecast" 
        :key="day.date.getTime()"
        class="forecast-item"
        :class="{ 'forecast-item--today': index === 0 }"
        role="listitem"
        :aria-label="`${formatDayName(day.date, index)} weather: ${getWeatherDescription(day.weatherCode)}, high ${formatTemperature(day.temperatureMax)}, low ${formatTemperature(day.temperatureMin)}`"
        tabindex="0"
        @keydown.enter="$event.preventDefault()"
        @keydown.space="$event.preventDefault()"
      >
        <div class="forecast-date">
          <div class="day-name">{{ formatDayName(day.date, index) }}</div>
          <div class="date-text">
            <time :datetime="day.date.toISOString().split('T')[0]">
              {{ formatDate(day.date) }}
            </time>
          </div>
        </div>

        <div class="forecast-weather">
          <div class="weather-icon" aria-hidden="true" role="img" :aria-label="getWeatherDescription(day.weatherCode)">
            {{ getWeatherIcon(day.weatherCode) }}
          </div>
          <div class="weather-description">
            {{ getWeatherDescription(day.weatherCode) }}
          </div>
        </div>

        <div class="forecast-precipitation" v-if="day.precipitationSum > 0" :aria-label="`Expected precipitation ${formatPrecipitation(day.precipitationSum)}`">
          <span class="precipitation-icon" aria-hidden="true">🌧️</span>
          <span class="precipitation-value">{{ formatPrecipitation(day.precipitationSum) }}</span>
        </div>

        <div class="forecast-temperature" :aria-label="`High ${formatTemperature(day.temperatureMax)}, low ${formatTemperature(day.temperatureMin)}`">
          <div class="temp-high" :aria-label="`High temperature ${formatTemperature(day.temperatureMax)}`">{{ formatTemperature(day.temperatureMax) }}</div>
          <div class="temp-separator" aria-hidden="true">/</div>
          <div class="temp-low" :aria-label="`Low temperature ${formatTemperature(day.temperatureMin)}`">{{ formatTemperature(day.temperatureMin) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ForecastData } from '@/types/weather'

interface Props {
  forecast: ForecastData[] | null
}

defineProps<Props>()

/**
 * Format temperature with proper unit
 */
function formatTemperature(temperature: number): string {
  return `${Math.round(temperature)}°`
}

/**
 * Format precipitation amount
 */
function formatPrecipitation(precipitation: number): string {
  return `${precipitation.toFixed(1)}mm`
}

/**
 * Format day name with special handling for today
 */
function formatDayName(date: Date, index: number): string {
  if (index === 0) {
    return 'Today'
  }
  
  return date.toLocaleDateString(undefined, {
    weekday: 'long'
  })
}

/**
 * Format date for display with timezone consideration
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Get weather icon based on weather code
 * Using WMO weather interpretation codes
 */
function getWeatherIcon(weatherCode: number): string {
  const iconMap: Record<number, string> = {
    0: '☀️',   // Clear sky
    1: '🌤️',   // Mainly clear
    2: '⛅',   // Partly cloudy
    3: '☁️',   // Overcast
    45: '🌫️',  // Fog
    48: '🌫️',  // Depositing rime fog
    51: '🌦️',  // Light drizzle
    53: '🌦️',  // Moderate drizzle
    55: '🌦️',  // Dense drizzle
    56: '🌧️',  // Light freezing drizzle
    57: '🌧️',  // Dense freezing drizzle
    61: '🌧️',  // Slight rain
    63: '🌧️',  // Moderate rain
    65: '🌧️',  // Heavy rain
    66: '🌧️',  // Light freezing rain
    67: '🌧️',  // Heavy freezing rain
    71: '🌨️',  // Slight snow fall
    73: '🌨️',  // Moderate snow fall
    75: '🌨️',  // Heavy snow fall
    77: '🌨️',  // Snow grains
    80: '🌦️',  // Slight rain showers
    81: '🌦️',  // Moderate rain showers
    82: '🌦️',  // Violent rain showers
    85: '🌨️',  // Slight snow showers
    86: '🌨️',  // Heavy snow showers
    95: '⛈️',  // Thunderstorm
    96: '⛈️',  // Thunderstorm with slight hail
    99: '⛈️'   // Thunderstorm with heavy hail
  }
  
  return iconMap[weatherCode] || '🌤️'
}

/**
 * Get weather description based on weather code
 */
function getWeatherDescription(weatherCode: number): string {
  const descriptionMap: Record<number, string> = {
    0: 'Clear',
    1: 'Mostly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    56: 'Freezing drizzle',
    57: 'Heavy freezing drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    66: 'Freezing rain',
    67: 'Heavy freezing rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Light showers',
    81: 'Showers',
    82: 'Heavy showers',
    85: 'Light snow showers',
    86: 'Snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Heavy thunderstorm'
  }
  
  return descriptionMap[weatherCode] || 'Unknown'
}
</script>

<style scoped>
.forecast-list {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: var(--radius-3xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-xl);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.forecast-list::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 10% 10%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 90% 90%, rgba(59, 130, 246, 0.03) 0%, transparent 50%);
  pointer-events: none;
}

.forecast-header {
  margin-bottom: var(--space-6);
  position: relative;
  z-index: 1;
}

.forecast-title {
  font-size: clamp(var(--text-xl), 4vw, var(--text-2xl));
  font-weight: var(--font-semibold);
  margin: 0;
  color: var(--text-primary);
  text-align: center;
}

.forecast-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  position: relative;
  z-index: 1;
}

.forecast-item {
  display: grid;
  grid-template-columns: 1fr 2fr auto 1fr;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-xl);
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(226, 232, 240, 0.5);
  transition: all var(--transition-normal);
  position: relative;
}

.forecast-item:hover {
  background: rgba(241, 245, 249, 0.9);
  border-color: rgba(203, 213, 225, 0.8);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.forecast-item:focus {
  outline: 2px solid var(--sky-500);
  outline-offset: 2px;
  background: rgba(241, 245, 249, 0.9);
  border-color: rgba(59, 130, 246, 0.4);
}

.forecast-item:focus-visible {
  outline: 2px solid var(--sky-500);
  outline-offset: 2px;
}

.forecast-item--today {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: var(--shadow-md);
}

.forecast-item--today:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.08) 100%);
  border-color: rgba(59, 130, 246, 0.4);
}

.forecast-date {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.day-name {
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  color: var(--text-primary);
  line-height: var(--leading-tight);
}

.date-text {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-weight: var(--font-medium);
}

.forecast-item--today .day-name {
  color: var(--sky-700);
  font-weight: var(--font-bold);
}

.forecast-weather {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.weather-icon {
  font-size: clamp(var(--text-xl), 4vw, var(--text-2xl));
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.weather-description {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: var(--font-medium);
  line-height: var(--leading-tight);
}

.forecast-precipitation {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--sky-600);
  font-weight: var(--font-semibold);
  background: rgba(59, 130, 246, 0.1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
}

.precipitation-icon {
  font-size: var(--text-sm);
}

.forecast-temperature {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  justify-content: flex-end;
  font-weight: var(--font-semibold);
}

.temp-high {
  font-size: var(--text-base);
  color: var(--text-primary);
}

.temp-separator {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: 0 var(--space-1);
}

.temp-low {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* Mobile-first responsive design */
@media (max-width: 640px) {
  .forecast-list {
    padding: var(--space-6);
    border-radius: var(--radius-2xl);
  }

  .forecast-items {
    gap: var(--space-2);
  }

  .forecast-item {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto auto;
    gap: var(--space-3);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
  }

  .forecast-date {
    grid-column: 1;
    grid-row: 1;
  }

  .forecast-temperature {
    grid-column: 2;
    grid-row: 1;
    justify-content: flex-end;
  }

  .forecast-weather {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-content: center;
    gap: var(--space-2);
  }

  .forecast-precipitation {
    grid-column: 1 / -1;
    grid-row: 3;
    justify-content: center;
    margin-top: var(--space-1);
  }

  .weather-description {
    font-size: var(--text-xs);
  }
}

@media (max-width: 480px) {
  .forecast-list {
    padding: var(--space-5);
    border-radius: var(--radius-xl);
  }

  .forecast-header {
    margin-bottom: var(--space-5);
  }

  .forecast-item {
    padding: var(--space-3);
    gap: var(--space-2);
  }

  .day-name {
    font-size: var(--text-xs);
  }

  .date-text {
    font-size: 0.625rem;
  }

  .weather-description {
    font-size: 0.625rem;
  }

  .temp-high {
    font-size: var(--text-sm);
  }

  .temp-low {
    font-size: var(--text-xs);
  }

  .forecast-precipitation {
    font-size: 0.625rem;
    padding: 2px var(--space-1);
  }
}

/* Tablet styles */
@media (min-width: 641px) and (max-width: 1024px) {
  .forecast-list {
    padding: var(--space-8) var(--space-10);
  }

  .forecast-item {
    padding: var(--space-5) var(--space-6);
    gap: var(--space-5);
  }
}

/* Large screen optimizations */
@media (min-width: 1200px) {
  .forecast-list {
    padding: var(--space-10) var(--space-12);
  }

  .forecast-item {
    padding: var(--space-6) var(--space-8);
    gap: var(--space-6);
  }

  .forecast-items {
    gap: var(--space-4);
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .forecast-list {
    background: var(--bg-primary);
    border: 2px solid var(--text-primary);
  }

  .forecast-list::before {
    display: none;
  }

  .forecast-item {
    background: var(--bg-secondary);
    border-color: var(--border-medium);
  }

  .forecast-item--today {
    background: var(--sky-100);
    border-color: var(--sky-600);
  }

  .forecast-precipitation {
    background: var(--sky-200);
    color: var(--sky-800);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .forecast-item {
    transition: none;
  }

  .forecast-item:hover {
    transform: none;
  }
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .forecast-item:hover {
    background: rgba(248, 250, 252, 0.8);
    border-color: rgba(226, 232, 240, 0.5);
    transform: none;
    box-shadow: none;
  }

  .forecast-item--today:hover {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
    border-color: rgba(59, 130, 246, 0.3);
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .forecast-list {
    background: rgba(30, 41, 59, 0.98);
    border-color: rgba(100, 116, 139, 0.2);
  }

  .forecast-item {
    background: rgba(51, 65, 85, 0.8);
    border-color: rgba(100, 116, 139, 0.3);
  }

  .forecast-item:hover {
    background: rgba(51, 65, 85, 0.9);
    border-color: rgba(100, 116, 139, 0.5);
  }

  .forecast-item--today {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%);
    border-color: rgba(59, 130, 246, 0.4);
  }
}

/* Print styles */
@media print {
  .forecast-list {
    background: white !important;
    box-shadow: none !important;
    border: 1px solid #ccc !important;
  }

  .forecast-list::before {
    display: none;
  }

  .forecast-item {
    background: #f9f9f9 !important;
    border: 1px solid #ddd !important;
  }

  .forecast-item--today {
    background: #e6f3ff !important;
    border-color: #74b9ff !important;
  }

  .forecast-precipitation {
    background: #f0f8ff !important;
    color: #0066cc !important;
  }
}

/* Landscape phone optimization */
@media (max-height: 500px) and (orientation: landscape) {
  .forecast-list {
    padding: var(--space-4);
  }

  .forecast-header {
    margin-bottom: var(--space-4);
  }

  .forecast-items {
    gap: var(--space-1);
  }

  .forecast-item {
    padding: var(--space-2) var(--space-3);
  }
}
</style>