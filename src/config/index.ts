/**
 * Application configuration using environment variables
 * Provides type-safe access to environment variables with fallbacks
 */

export const config = {
  // API Configuration
  weatherApiBaseUrl: import.meta.env.VITE_WEATHER_API_BASE_URL || 'https://api.open-meteo.com/v1/forecast',
  geocodingApiBaseUrl: import.meta.env.VITE_GEOCODING_API_BASE_URL || 'https://geocoding-api.open-meteo.com/v1/search',
  
  // Application Configuration
  appTitle: import.meta.env.VITE_APP_TITLE || 'Weather Forecast App',
  maxLocationResults: parseInt(import.meta.env.VITE_MAX_LOCATION_RESULTS || '10', 10),
  forecastDays: parseInt(import.meta.env.VITE_FORECAST_DAYS || '7', 10),
  cacheDurationMinutes: parseInt(import.meta.env.VITE_CACHE_DURATION_MINUTES || '10', 10),
  
  // Build Configuration
  buildSourcemap: import.meta.env.VITE_BUILD_SOURCEMAP !== 'false',
  
  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE
} as const

// Validate critical configuration
if (!config.weatherApiBaseUrl || !config.geocodingApiBaseUrl) {
  throw new Error('Missing required API configuration. Please check your environment variables.')
}

export default config