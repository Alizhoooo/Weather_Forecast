import type { Location } from '@/types/location'
import type { CurrentWeatherData, ForecastData } from '@/types/weather'
import config from '@/config'

/**
 * Cache entry interface for storing data with expiration
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

/**
 * Weather cache data structure
 */
interface WeatherCacheData {
  current: CurrentWeatherData
  forecast: ForecastData[]
}

/**
 * Service for handling localStorage caching with expiration
 */
export class CacheService {
  private readonly LOCATION_CACHE_KEY = 'weather-app-location-cache'
  private readonly WEATHER_CACHE_KEY = 'weather-app-weather-cache'
  private readonly LOCATION_CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
  private readonly WEATHER_CACHE_DURATION = config.cacheDurationMinutes * 60 * 1000
  private readonly MAX_LOCATION_CACHE_SIZE = 50

  /**
   * Cache location search results
   * @param query - Search query used
   * @param locations - Array of locations returned
   */
  cacheLocationSearch(query: string, locations: Location[]): void {
    try {
      const cacheKey = this.normalizeQuery(query)
      const cache = this.getLocationCache()
      
      // Add new entry
      cache[cacheKey] = {
        data: locations,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.LOCATION_CACHE_DURATION
      }

      // Limit cache size by removing oldest entries
      this.limitCacheSize(cache, this.MAX_LOCATION_CACHE_SIZE)
      
      localStorage.setItem(this.LOCATION_CACHE_KEY, JSON.stringify(cache))
    } catch (error) {
      console.warn('Failed to cache location search:', error)
    }
  }

  /**
   * Get cached location search results
   * @param query - Search query to look up
   * @returns Cached locations or null if not found/expired
   */
  getCachedLocationSearch(query: string): Location[] | null {
    try {
      const cacheKey = this.normalizeQuery(query)
      const cache = this.getLocationCache()
      const entry = cache[cacheKey]

      if (!entry || Date.now() > entry.expiresAt) {
        // Clean up expired entry
        if (entry) {
          delete cache[cacheKey]
          localStorage.setItem(this.LOCATION_CACHE_KEY, JSON.stringify(cache))
        }
        return null
      }

      return entry.data
    } catch (error) {
      console.warn('Failed to get cached location search:', error)
      return null
    }
  }

  /**
   * Cache weather data for a location
   * @param lat - Latitude
   * @param lon - Longitude
   * @param current - Current weather data
   * @param forecast - Forecast data
   */
  cacheWeatherData(lat: number, lon: number, current: CurrentWeatherData, forecast: ForecastData[]): void {
    try {
      const cacheKey = this.getWeatherCacheKey(lat, lon)
      const cache = this.getWeatherCache()
      
      cache[cacheKey] = {
        data: { current, forecast },
        timestamp: Date.now(),
        expiresAt: Date.now() + this.WEATHER_CACHE_DURATION
      }

      localStorage.setItem(this.WEATHER_CACHE_KEY, JSON.stringify(cache))
    } catch (error) {
      console.warn('Failed to cache weather data:', error)
    }
  }

  /**
   * Get cached weather data for a location
   * @param lat - Latitude
   * @param lon - Longitude
   * @returns Cached weather data or null if not found/expired
   */
  getCachedWeatherData(lat: number, lon: number): WeatherCacheData | null {
    try {
      const cacheKey = this.getWeatherCacheKey(lat, lon)
      const cache = this.getWeatherCache()
      const entry = cache[cacheKey]

      if (!entry || Date.now() > entry.expiresAt) {
        // Clean up expired entry
        if (entry) {
          delete cache[cacheKey]
          localStorage.setItem(this.WEATHER_CACHE_KEY, JSON.stringify(cache))
        }
        return null
      }

      return entry.data
    } catch (error) {
      console.warn('Failed to get cached weather data:', error)
      return null
    }
  }

  /**
   * Clear all cached data
   */
  clearAllCache(): void {
    try {
      localStorage.removeItem(this.LOCATION_CACHE_KEY)
      localStorage.removeItem(this.WEATHER_CACHE_KEY)
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }

  /**
   * Clear expired entries from all caches
   */
  cleanupExpiredEntries(): void {
    this.cleanupLocationCache()
    this.cleanupWeatherCache()
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    locationCacheSize: number
    weatherCacheSize: number
    locationCacheExpired: number
    weatherCacheExpired: number
  } {
    const locationCache = this.getLocationCache()
    const weatherCache = this.getWeatherCache()
    const now = Date.now()

    const locationExpired = Object.values(locationCache).filter(entry => now > entry.expiresAt).length
    const weatherExpired = Object.values(weatherCache).filter(entry => now > entry.expiresAt).length

    return {
      locationCacheSize: Object.keys(locationCache).length,
      weatherCacheSize: Object.keys(weatherCache).length,
      locationCacheExpired: locationExpired,
      weatherCacheExpired: weatherExpired
    }
  }

  /**
   * Normalize search query for consistent caching
   * @param query - Raw search query
   * @returns Normalized cache key
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ')
  }

  /**
   * Generate cache key for weather data
   * @param lat - Latitude
   * @param lon - Longitude
   * @returns Cache key string
   */
  private getWeatherCacheKey(lat: number, lon: number): string {
    // Round coordinates to 2 decimal places for cache key consistency
    const roundedLat = Math.round(lat * 100) / 100
    const roundedLon = Math.round(lon * 100) / 100
    return `${roundedLat},${roundedLon}`
  }

  /**
   * Get location cache from localStorage
   * @returns Location cache object
   */
  private getLocationCache(): Record<string, CacheEntry<Location[]>> {
    try {
      const cached = localStorage.getItem(this.LOCATION_CACHE_KEY)
      return cached ? JSON.parse(cached) : {}
    } catch (error) {
      console.warn('Failed to parse location cache:', error)
      return {}
    }
  }

  /**
   * Get weather cache from localStorage
   * @returns Weather cache object
   */
  private getWeatherCache(): Record<string, CacheEntry<WeatherCacheData>> {
    try {
      const cached = localStorage.getItem(this.WEATHER_CACHE_KEY)
      if (!cached) return {}
      
      const parsed = JSON.parse(cached)
      
      // Convert timestamp strings back to Date objects
      Object.values(parsed).forEach((entry: any) => {
        if (entry.data?.current?.timestamp) {
          entry.data.current.timestamp = new Date(entry.data.current.timestamp)
        }
        if (entry.data?.forecast) {
          entry.data.forecast.forEach((forecast: any) => {
            if (forecast.date) {
              forecast.date = new Date(forecast.date)
            }
          })
        }
      })
      
      return parsed
    } catch (error) {
      console.warn('Failed to parse weather cache:', error)
      return {}
    }
  }

  /**
   * Limit cache size by removing oldest entries
   * @param cache - Cache object to limit
   * @param maxSize - Maximum number of entries
   */
  private limitCacheSize<T>(cache: Record<string, CacheEntry<T>>, maxSize: number): void {
    const entries = Object.entries(cache)
    if (entries.length <= maxSize) return

    // Sort by timestamp (oldest first) and remove excess entries
    entries
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .slice(0, entries.length - maxSize)
      .forEach(([key]) => delete cache[key])
  }

  /**
   * Clean up expired location cache entries
   */
  private cleanupLocationCache(): void {
    try {
      const cache = this.getLocationCache()
      const now = Date.now()
      let hasExpired = false

      Object.keys(cache).forEach(key => {
        if (now > cache[key].expiresAt) {
          delete cache[key]
          hasExpired = true
        }
      })

      if (hasExpired) {
        localStorage.setItem(this.LOCATION_CACHE_KEY, JSON.stringify(cache))
      }
    } catch (error) {
      console.warn('Failed to cleanup location cache:', error)
    }
  }

  /**
   * Clean up expired weather cache entries
   */
  private cleanupWeatherCache(): void {
    try {
      const cache = this.getWeatherCache()
      const now = Date.now()
      let hasExpired = false

      Object.keys(cache).forEach(key => {
        if (now > cache[key].expiresAt) {
          delete cache[key]
          hasExpired = true
        }
      })

      if (hasExpired) {
        localStorage.setItem(this.WEATHER_CACHE_KEY, JSON.stringify(cache))
      }
    } catch (error) {
      console.warn('Failed to cleanup weather cache:', error)
    }
  }
}

// Export a singleton instance
export const cacheService = new CacheService()