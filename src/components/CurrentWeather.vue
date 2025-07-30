<template>
  <div class="current-weather" v-if="currentWeather" role="region" aria-labelledby="current-weather-title">
    <div class="weather-header">
      <h2 id="current-weather-title" class="weather-title">Current Weather</h2>
      <div class="weather-timestamp" aria-label="Last updated time">
        <time :datetime="currentWeather.timestamp.toISOString()">
          {{ formatTimestamp(currentWeather.timestamp) }}
        </time>
      </div>
    </div>

    <div class="weather-main">
      <div class="temperature-section">
        <div class="weather-icon" aria-hidden="true" role="img" :aria-label="getWeatherDescription(currentWeather.weatherCode)">
          {{ getWeatherIcon(currentWeather.weatherCode) }}
        </div>
        <div class="temperature" :aria-label="`Current temperature ${formatTemperature(currentWeather.temperature)}`">
          {{ formatTemperature(currentWeather.temperature) }}
        </div>
        <div class="weather-description">
          {{ getWeatherDescription(currentWeather.weatherCode) }}
        </div>
      </div>

      <div class="weather-details" role="list" aria-label="Weather details">
        <div class="detail-item" role="listitem">
          <div class="detail-label" id="humidity-label">Humidity</div>
          <div class="detail-value" aria-labelledby="humidity-label">
            <span class="detail-icon" aria-hidden="true">💧</span>
            <span :aria-label="`Humidity ${formatHumidity(currentWeather.humidity)}`">
              {{ formatHumidity(currentWeather.humidity) }}
            </span>
          </div>
        </div>

        <div class="detail-item" role="listitem">
          <div class="detail-label" id="wind-label">Wind</div>
          <div class="detail-value" aria-labelledby="wind-label">
            <span class="detail-icon" aria-hidden="true">💨</span>
            <span :aria-label="`Wind speed and direction ${formatWind(currentWeather.windSpeed, currentWeather.windDirection)}`">
              {{ formatWind(currentWeather.windSpeed, currentWeather.windDirection) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CurrentWeatherData } from '@/types/weather'

interface Props {
  currentWeather: CurrentWeatherData | null
}

defineProps<Props>()

/**
 * Format temperature with proper unit
 */
function formatTemperature(temperature: number): string {
  return `${Math.round(temperature)}°C`
}

/**
 * Format humidity as percentage
 */
function formatHumidity(humidity: number): string {
  return `${Math.round(humidity)}%`
}

/**
 * Format wind speed and direction
 */
function formatWind(speed: number, direction: number): string {
  const windDirection = getWindDirection(direction)
  return `${Math.round(speed)} km/h ${windDirection}`
}

/**
 * Get wind direction from degrees
 */
function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: Date): string {
  return timestamp.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  }
  
  return descriptionMap[weatherCode] || 'Unknown conditions'
}
</script>

<style scoped>
.current-weather {
  background: linear-gradient(135deg, var(--sky-400) 0%, var(--sky-600) 50%, var(--sky-700) 100%);
  border-radius: var(--radius-3xl);
  padding: var(--space-8);
  color: var(--text-inverse);
  box-shadow: var(--shadow-xl);
  margin-bottom: var(--space-8);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.current-weather::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
  pointer-events: none;
}

.weather-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-8);
  position: relative;
  z-index: 1;
}

.weather-title {
  font-size: clamp(var(--text-xl), 4vw, var(--text-2xl));
  font-weight: var(--font-semibold);
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.weather-timestamp {
  font-size: var(--text-sm);
  opacity: 0.9;
  font-weight: var(--font-medium);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  text-align: right;
}

.weather-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-8);
  align-items: center;
  position: relative;
  z-index: 1;
}

.temperature-section {
  text-align: center;
}

.weather-icon {
  font-size: clamp(3rem, 8vw, 4.5rem);
  margin-bottom: var(--space-3);
  line-height: 1;
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

.temperature {
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: var(--font-bold);
  margin-bottom: var(--space-2);
  line-height: 1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  letter-spacing: -0.02em;
}

.weather-description {
  font-size: clamp(var(--text-base), 3vw, var(--text-lg));
  opacity: 0.95;
  text-transform: capitalize;
  font-weight: var(--font-medium);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.weather-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-xl);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all var(--transition-normal);
}

.detail-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.detail-label {
  font-size: var(--text-sm);
  opacity: 0.9;
  font-weight: var(--font-medium);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.detail-value {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.detail-icon {
  font-size: var(--text-xl);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

/* Mobile-first responsive design */
@media (max-width: 640px) {
  .current-weather {
    padding: var(--space-6);
    margin-bottom: var(--space-6);
    border-radius: var(--radius-2xl);
  }

  .weather-main {
    grid-template-columns: 1fr;
    gap: var(--space-6);
  }

  .weather-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
    margin-bottom: var(--space-6);
  }

  .weather-timestamp {
    text-align: left;
    opacity: 0.8;
  }

  .detail-item {
    padding: var(--space-3) var(--space-4);
  }
}

@media (max-width: 480px) {
  .current-weather {
    padding: var(--space-5);
    border-radius: var(--radius-xl);
  }

  .weather-header {
    margin-bottom: var(--space-5);
  }

  .weather-main {
    gap: var(--space-5);
  }

  .weather-details {
    gap: var(--space-3);
  }

  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-3);
  }

  .detail-value {
    align-self: flex-end;
  }

  .detail-label {
    font-size: var(--text-xs);
  }

  .detail-value {
    font-size: var(--text-sm);
  }
}

/* Tablet styles */
@media (min-width: 641px) and (max-width: 1024px) {
  .current-weather {
    padding: var(--space-8) var(--space-10);
  }

  .weather-main {
    gap: var(--space-10);
  }
}

/* Large screen optimizations */
@media (min-width: 1200px) {
  .current-weather {
    padding: var(--space-10) var(--space-12);
  }

  .weather-details {
    gap: var(--space-5);
  }

  .detail-item {
    padding: var(--space-5) var(--space-6);
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .current-weather {
    background: var(--sky-800);
    border: 2px solid var(--text-inverse);
  }

  .current-weather::before {
    display: none;
  }

  .weather-title,
  .weather-timestamp,
  .temperature,
  .weather-description,
  .detail-label,
  .detail-value {
    text-shadow: none;
    color: var(--text-inverse);
  }

  .detail-item {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .weather-icon {
    animation: none;
  }

  .detail-item {
    transition: none;
  }

  .detail-item:hover {
    transform: none;
  }
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .detail-item:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: none;
  }
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .current-weather {
    background: linear-gradient(135deg, var(--sky-600) 0%, var(--sky-800) 50%, var(--sky-900) 100%);
  }
}

/* Print styles */
@media print {
  .current-weather {
    background: white !important;
    color: black !important;
    box-shadow: none !important;
    border: 1px solid #ccc !important;
  }

  .current-weather::before {
    display: none;
  }

  .weather-title,
  .weather-timestamp,
  .temperature,
  .weather-description,
  .detail-label,
  .detail-value {
    color: black !important;
    text-shadow: none !important;
  }

  .detail-item {
    background: #f5f5f5 !important;
    border: 1px solid #ddd !important;
  }
}

/* Landscape phone optimization */
@media (max-height: 500px) and (orientation: landscape) {
  .current-weather {
    padding: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .weather-header {
    margin-bottom: var(--space-4);
  }

  .weather-main {
    gap: var(--space-4);
  }

  .weather-details {
    gap: var(--space-2);
  }

  .detail-item {
    padding: var(--space-2) var(--space-3);
  }
}
</style>