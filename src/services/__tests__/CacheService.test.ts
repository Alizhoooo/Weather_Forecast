import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CacheService } from '../CacheService'
import type { Location } from '@/types/location'
import type { CurrentWeatherData, ForecastData } from '@/types/weather'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('CacheService', () => {
  let cacheService: CacheService

  beforeEach(() => {
    cacheService = new CacheService()
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
    mockLocalStorage.removeItem.mockClear()
    mockLocalStorage.clear.mockClear()
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Location Search Caching', () => {
    const mockLocations: Location[] = [
      {
        id: 1,
        name: 'New York',
        country: 'United States',
        admin1: 'New York',
        latitude: 40.7128,
        longitude: -74.0060
      },
      {
        id: 2,
        name: 'London',
        country: 'United Kingdom',
        latitude: 51.5074,
        longitude: -0.1278
      }
    ]

    it('should cache location search results', () => {
      const query = 'New York'
      
      mockLocalStorage.getItem.mockReturnValue('{}')
      
      cacheService.cacheLocationSearch(query, mockLocations)
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'weather-app-location-cache',
        expect.stringContaining('"new york"')
      )
    })

    it('should normalize query keys for consistent caching', () => {
      mockLocalStorage.getItem.mockReturnValue('{}')
      
      // Test different variations of the same query
      cacheService.cacheLocationSearch('  New York  ', mockLocations)
      cacheService.cacheLocationSearch('NEW YORK', mockLocations)
      cacheService.cacheLocationSearch('new    york', mockLocations)
      
      // All should be normalized to the same key
      const calls = mockLocalStorage.setItem.mock.calls
      calls.forEach(call => {
        const cacheData = JSON.parse(call[1])
        expect(Object.keys(cacheData)).toContain('new york')
      })
    })

    it('should retrieve cached location search results', () => {
      const query = 'london'
      const now = Date.now()
      const cacheData = {
        london: {
          data: mockLocations,
          timestamp: now,
          expiresAt: now + 24 * 60 * 60 * 1000 // 24 hours
        }
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cacheData))
      
      const result = cacheService.getCachedLocationSearch(query)
      
      expect(result).toEqual(mockLocations)
    })

    it('should return null for expired location cache entries', () => {
      const query = 'london'
      const now = Date.now()
      const cacheData = {
        london: {
          data: mockLocations,
          timestamp: now - 25 * 60 * 60 * 1000, // 25 hours ago
          expiresAt: now - 60 * 60 * 1000 // Expired 1 hour ago
        }
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cacheData))
      
      const result = cacheService.getCachedLocationSearch(query)
      
      expect(result).toBeNull()
      // Should clean up expired entry
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'weather-app-location-cache',
        '{}'
      )
    })

    it('should return null for non-existent cache entries', () => {
      mockLocalStorage.getItem.mockReturnValue('{}')
      
      const result = cacheService.getCachedLocationSearch('nonexistent')
      
      expect(result).toBeNull()
    })

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const result = cacheService.getCachedLocationSearch('test')
      
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse location cache:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })

    it('should limit location cache size', () => {
      mockLocalStorage.getItem.mockReturnValue('{}')
      
      // Create cache with many entries
      const manyEntries: Record<string, any> = {}
      for (let i = 0; i < 60; i++) {
        manyEntries[`location${i}`] = {
          data: mockLocations,
          timestamp: Date.now() - i * 1000, // Different timestamps
          expiresAt: Date.now() + 24 * 60 * 60 * 1000
        }
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(manyEntries))
      
      cacheService.cacheLocationSearch('new location', mockLocations)
      
      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1])
      expect(Object.keys(savedData)).toHaveLength(50) // Should be limited to 50
    })
  })

  describe('Weather Data Caching', () => {
    const mockCurrentWeather: CurrentWeatherData = {
      temperature: 20.5,
      weatherCode: 1,
      windSpeed: 10.2,
      windDirection: 180,
      humidity: 65,
      timestamp: new Date('2024-01-15T12:00:00Z')
    }

    const mockForecast: ForecastData[] = [
      {
        date: new Date('2024-01-15'),
        temperatureMax: 25.0,
        temperatureMin: 15.0,
        weatherCode: 1,
        precipitationSum: 0.0
      },
      {
        date: new Date('2024-01-16'),
        temperatureMax: 22.0,
        temperatureMin: 12.0,
        weatherCode: 2,
        precipitationSum: 2.5
      }
    ]

    it('should cache weather data for coordinates', () => {
      const lat = 40.7128
      const lon = -74.0060
      
      mockLocalStorage.getItem.mockReturnValue('{}')
      
      cacheService.cacheWeatherData(lat, lon, mockCurrentWeather, mockForecast)
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'weather-app-weather-cache',
        expect.stringContaining('40.71,-74.01')
      )
    })

    it('should round coordinates for consistent cache keys', () => {
      mockLocalStorage.getItem.mockReturnValue('{}')
      
      // Test coordinates that should round to the same key
      cacheService.cacheWeatherData(40.7128, -74.0060, mockCurrentWeather, mockForecast)
      cacheService.cacheWeatherData(40.7134, -74.0055, mockCurrentWeather, mockForecast)
      
      const calls = mockLocalStorage.setItem.mock.calls
      calls.forEach(call => {
        const cacheData = JSON.parse(call[1])
        expect(Object.keys(cacheData)).toContain('40.71,-74.01')
      })
    })

    it('should retrieve cached weather data', () => {
      const lat = 40.7128
      const lon = -74.0060
      const now = Date.now()
      const cacheData = {
        '40.71,-74.01': {
          data: {
            current: {
              ...mockCurrentWeather,
              timestamp: mockCurrentWeather.timestamp.toISOString()
            },
            forecast: mockForecast.map(f => ({
              ...f,
              date: f.date.toISOString()
            }))
          },
          timestamp: now,
          expiresAt: now + 10 * 60 * 1000 // 10 minutes
        }
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cacheData))
      
      const result = cacheService.getCachedWeatherData(lat, lon)
      
      expect(result).toBeDefined()
      expect(result?.current.temperature).toBe(20.5)
      expect(result?.current.timestamp).toBeInstanceOf(Date)
      expect(result?.forecast).toHaveLength(2)
      expect(result?.forecast[0].date).toBeInstanceOf(Date)
    })

    it('should return null for expired weather cache entries', () => {
      const lat = 40.7128
      const lon = -74.0060
      const now = Date.now()
      const cacheData = {
        '40.71,-74.01': {
          data: { current: mockCurrentWeather, forecast: mockForecast },
          timestamp: now - 15 * 60 * 1000, // 15 minutes ago
          expiresAt: now - 5 * 60 * 1000 // Expired 5 minutes ago
        }
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cacheData))
      
      const result = cacheService.getCachedWeatherData(lat, lon)
      
      expect(result).toBeNull()
      // Should clean up expired entry
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'weather-app-weather-cache',
        '{}'
      )
    })

    it('should handle malformed weather cache data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const result = cacheService.getCachedWeatherData(40.7128, -74.0060)
      
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse weather cache:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Cache Management', () => {
    it('should clear all cache data', () => {
      cacheService.clearAllCache()
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('weather-app-location-cache')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('weather-app-weather-cache')
    })

    it('should handle localStorage errors when clearing cache', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      cacheService.clearAllCache()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to clear cache:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })

    it('should cleanup expired entries from both caches', () => {
      const now = Date.now()
      const expiredLocationCache = {
        'expired1': {
          data: [],
          timestamp: now - 25 * 60 * 60 * 1000,
          expiresAt: now - 60 * 60 * 1000
        },
        'valid1': {
          data: [],
          timestamp: now,
          expiresAt: now + 24 * 60 * 60 * 1000
        }
      }
      
      const expiredWeatherCache = {
        '40.71,-74.01': {
          data: { current: {}, forecast: [] },
          timestamp: now - 15 * 60 * 1000,
          expiresAt: now - 5 * 60 * 1000
        },
        '51.51,-0.13': {
          data: { current: {}, forecast: [] },
          timestamp: now,
          expiresAt: now + 10 * 60 * 1000
        }
      }
      
      mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify(expiredLocationCache))
        .mockReturnValueOnce(JSON.stringify(expiredWeatherCache))
      
      cacheService.cleanupExpiredEntries()
      
      // Should save cleaned up caches
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'weather-app-location-cache',
        expect.stringContaining('valid1')
      )
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'weather-app-weather-cache',
        expect.stringContaining('51.51,-0.13')
      )
    })

    it('should provide cache statistics', () => {
      const now = Date.now()
      const locationCache = {
        'valid1': {
          data: [],
          timestamp: now,
          expiresAt: now + 24 * 60 * 60 * 1000
        },
        'expired1': {
          data: [],
          timestamp: now - 25 * 60 * 60 * 1000,
          expiresAt: now - 60 * 60 * 1000
        }
      }
      
      const weatherCache = {
        '40.71,-74.01': {
          data: { current: {}, forecast: [] },
          timestamp: now,
          expiresAt: now + 10 * 60 * 1000
        },
        '51.51,-0.13': {
          data: { current: {}, forecast: [] },
          timestamp: now - 15 * 60 * 1000,
          expiresAt: now - 5 * 60 * 1000
        }
      }
      
      mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify(locationCache))
        .mockReturnValueOnce(JSON.stringify(weatherCache))
      
      const stats = cacheService.getCacheStats()
      
      expect(stats).toEqual({
        locationCacheSize: 2,
        weatherCacheSize: 2,
        locationCacheExpired: 1,
        weatherCacheExpired: 1
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle localStorage setItem errors gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('{}')
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage full')
      })
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      cacheService.cacheLocationSearch('test', [])
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to cache location search:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })

    it('should handle localStorage getItem errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const result = cacheService.getCachedLocationSearch('test')
      
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('should handle corrupted cache data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('{"corrupted": "data"}')
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const result = cacheService.getCachedLocationSearch('test')
      
      expect(result).toBeNull()
      
      consoleSpy.mockRestore()
    })
  })
})