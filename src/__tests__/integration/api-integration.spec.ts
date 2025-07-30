import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { locationService } from '@/services/LocationService'
import { weatherService } from '@/services/WeatherService'
import type { Location, GeocodingResponse, WeatherResponse } from '@/types'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

// Mock window events for NetworkChecker
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener
})
Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener
})

// Mock localStorage for caching
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('API Integration Tests', () => {
  // Test data
  const mockLocation: Location = {
    id: 1,
    name: 'New York',
    country: 'United States',
    admin1: 'New York',
    latitude: 40.7128,
    longitude: -74.0060
  }

  const mockWeatherResponse: WeatherResponse = {
    current: {
      time: '2024-01-15T12:00:00Z',
      temperature_2m: 15.5,
      weather_code: 1,
      wind_speed_10m: 10.2,
      wind_direction_10m: 180,
      relative_humidity_2m: 65
    },
    daily: {
      time: ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18', '2024-01-19', '2024-01-20', '2024-01-21'],
      temperature_2m_max: [20.5, 18.2, 22.1, 19.8, 21.3, 17.9, 23.4],
      temperature_2m_min: [10.1, 8.5, 12.3, 9.7, 11.8, 7.2, 13.6],
      weather_code: [1, 2, 3, 1, 2, 61, 1],
      precipitation_sum: [0.0, 2.5, 1.2, 0.0, 3.1, 8.7, 0.0]
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Location Service Integration', () => {
    it('should successfully search for locations and handle API response', async () => {
      const locationResponse: GeocodingResponse = {
        results: [mockLocation]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(locationResponse)
      })

      const result = await locationService.searchLocations('New York')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockLocation)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://geocoding-api.open-meteo.com/v1/search?name=New%20York&count=10&language=en&format=json'
      )
    })

    it('should handle API rate limiting with proper error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })

      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'api',
        message: expect.stringContaining('Too many requests'),
        retryable: true
      })
    })

    it('should handle server errors with retry capability', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      })

      await expect(locationService.searchLocations('Paris')).rejects.toMatchObject({
        type: 'api',
        message: 'Search service unavailable (503)',
        retryable: true
      })
    })

    it('should handle network connectivity issues', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(locationService.searchLocations('Tokyo')).rejects.toMatchObject({
        type: 'network',
        message: 'Unable to connect to location search service. Please check your internet connection.',
        retryable: true
      })
    })

    it('should handle malformed API responses gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      })

      const result = await locationService.searchLocations('Berlin')
      expect(result).toEqual([])
    })

    it('should filter out invalid location data from API', async () => {
      const mixedResponse: GeocodingResponse = {
        results: [
          mockLocation, // Valid
          { // Invalid - missing required fields
            id: 2,
            name: 'Invalid Location'
          } as any,
          { // Invalid - wrong data types
            id: '3',
            name: 123,
            country: 'Test',
            latitude: 'invalid',
            longitude: 0
          } as any,
          { // Valid
            id: 4,
            name: 'London',
            country: 'United Kingdom',
            latitude: 51.5074,
            longitude: -0.1278
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mixedResponse)
      })

      const result = await locationService.searchLocations('test')
      
      // Should only return valid locations
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('New York')
      expect(result[1].name).toBe('London')
    })
  })

  describe('Weather Service Integration', () => {
    it('should successfully fetch current weather data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWeatherResponse)
      })

      const result = await weatherService.getCurrentWeather(mockLocation.latitude, mockLocation.longitude)

      expect(result).toEqual({
        temperature: 15.5,
        weatherCode: 1,
        windSpeed: 10.2,
        windDirection: 180,
        humidity: 65,
        timestamp: new Date('2024-01-15T12:00:00Z')
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.open-meteo.com/v1/forecast')
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('latitude=40.7128&longitude=-74.006')
      )
    })

    it('should successfully fetch forecast data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWeatherResponse)
      })

      const result = await weatherService.getForecast(mockLocation.latitude, mockLocation.longitude)

      expect(result).toHaveLength(7)
      expect(result[0]).toEqual({
        date: new Date('2024-01-15'),
        temperatureMax: 20.5,
        temperatureMin: 10.1,
        weatherCode: 1,
        precipitationSum: 0.0
      })
    })

    it('should successfully fetch complete weather data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWeatherResponse)
      })

      const result = await weatherService.getCompleteWeatherData(mockLocation.latitude, mockLocation.longitude)

      expect(result.current).toBeDefined()
      expect(result.forecast).toHaveLength(7)
      expect(result.current.temperature).toBe(15.5)
      expect(result.forecast[0].temperatureMax).toBe(20.5)
    })

    it('should handle weather API errors with proper error types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      await expect(weatherService.getCurrentWeather(mockLocation.latitude, mockLocation.longitude))
        .rejects.toMatchObject({
          type: 'api',
          message: 'Weather service unavailable (500)',
          retryable: true
        })
    })

    it('should handle missing weather data in API response', async () => {
      const incompleteResponse = {
        // Missing current data
        daily: mockWeatherResponse.daily
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(incompleteResponse)
      })

      await expect(weatherService.getCurrentWeather(mockLocation.latitude, mockLocation.longitude))
        .rejects.toMatchObject({
          type: 'data',
          message: 'Invalid weather data received from service',
          retryable: true
        })
    })

    it('should handle invalid coordinates properly', async () => {
      // Test invalid latitude
      await expect(weatherService.getCurrentWeather(91, mockLocation.longitude))
        .rejects.toMatchObject({
          type: 'user',
          message: 'Latitude must be between -90 and 90 degrees',
          retryable: false
        })

      // Test invalid longitude
      await expect(weatherService.getCurrentWeather(mockLocation.latitude, 181))
        .rejects.toMatchObject({
          type: 'user',
          message: 'Longitude must be between -180 and 180 degrees',
          retryable: false
        })

      // Test non-numeric coordinates
      await expect(weatherService.getCurrentWeather('invalid' as any, mockLocation.longitude))
        .rejects.toMatchObject({
          type: 'user',
          message: 'Invalid coordinates provided',
          retryable: false
        })
    })

    it('should handle JSON parsing errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token'))
      })

      await expect(weatherService.getCurrentWeather(mockLocation.latitude, mockLocation.longitude))
        .rejects.toMatchObject({
          type: 'api',
          message: 'An unexpected error occurred while fetching weather data',
          retryable: true
        })
    })

    it('should handle invalid timestamp data gracefully', async () => {
      const responseWithInvalidTime = {
        ...mockWeatherResponse,
        current: {
          ...mockWeatherResponse.current,
          time: 'invalid-timestamp'
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseWithInvalidTime)
      })

      const result = await weatherService.getCurrentWeather(mockLocation.latitude, mockLocation.longitude)

      // Should fallback to current time for invalid timestamps
      expect(result.timestamp).toBeInstanceOf(Date)
      expect(result.temperature).toBe(15.5)
    })
  })

  describe('Service Integration with Caching', () => {
    it('should cache location search results', async () => {
      const locationResponse: GeocodingResponse = {
        results: [mockLocation]
      }

      // First call - should hit API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(locationResponse)
      })

      const firstResult = await locationService.searchLocations('New York')
      expect(firstResult).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Mock cache hit for second call
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify({
        data: [mockLocation],
        timestamp: Date.now()
      }))

      const secondResult = await locationService.searchLocations('New York')
      expect(secondResult).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Should not call API again
    })

    it('should cache weather data', async () => {
      // First call - should hit API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWeatherResponse)
      })

      const firstResult = await weatherService.getCompleteWeatherData(mockLocation.latitude, mockLocation.longitude)
      expect(firstResult.current.temperature).toBe(15.5)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Mock cache hit for second call
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify({
        current: {
          temperature: 15.5,
          weatherCode: 1,
          windSpeed: 10.2,
          windDirection: 180,
          humidity: 65,
          timestamp: '2024-01-15T12:00:00.000Z'
        },
        forecast: mockWeatherResponse.daily.time.map((date, index) => ({
          date: date,
          temperatureMax: mockWeatherResponse.daily.temperature_2m_max[index],
          temperatureMin: mockWeatherResponse.daily.temperature_2m_min[index],
          weatherCode: mockWeatherResponse.daily.weather_code[index],
          precipitationSum: mockWeatherResponse.daily.precipitation_sum[index]
        })),
        timestamp: Date.now()
      }))

      const secondResult = await weatherService.getCompleteWeatherData(mockLocation.latitude, mockLocation.longitude)
      expect(secondResult.current.temperature).toBe(15.5)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Should not call API again
    })

    it('should handle cache expiration properly', async () => {
      // Mock expired cache entry
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify({
        data: [mockLocation],
        timestamp: Date.now() - (20 * 60 * 1000) // 20 minutes ago (expired)
      }))

      const locationResponse: GeocodingResponse = {
        results: [mockLocation]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(locationResponse)
      })

      const result = await locationService.searchLocations('New York')
      expect(result).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Should call API due to expired cache
    })
  })

  describe('Error Recovery and Retry Logic', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should retry location search on transient failures', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [mockLocation] })
        })

      const promise = locationService.searchLocations('London')
      
      // Fast-forward timers to trigger retry
      await vi.runAllTimersAsync()
      
      const result = await promise
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockLocation)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should retry weather service on server errors', async () => {
      // First call fails with 503, second succeeds
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWeatherResponse)
        })

      const promise = weatherService.getCurrentWeather(mockLocation.latitude, mockLocation.longitude)
      
      // Fast-forward timers to trigger retry
      await vi.runAllTimersAsync()
      
      const result = await promise
      expect(result.temperature).toBe(15.5)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should not retry on client errors (4xx)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      })

      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'api',
        message: expect.stringContaining('forbidden'),
        retryable: false
      })

      expect(mockFetch).toHaveBeenCalledTimes(1) // No retry
    })

    it('should fail after maximum retry attempts', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent error'))

      const promise = locationService.searchLocations('London')
      
      // Fast-forward all retry attempts
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow()
      expect(mockFetch).toHaveBeenCalledTimes(2) // Initial + 1 retry (LocationService maxAttempts: 2)
    })
  })

  describe('Offline Handling', () => {
    it('should handle offline scenarios for location search', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'network',
        message: expect.stringContaining('offline'),
        retryable: true
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle offline scenarios for weather service', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      await expect(weatherService.getCurrentWeather(mockLocation.latitude, mockLocation.longitude))
        .rejects.toMatchObject({
          type: 'network',
          message: expect.stringContaining('offline'),
          retryable: true
        })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should work when coming back online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'network'
      })

      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })

      const locationResponse: GeocodingResponse = {
        results: [mockLocation]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(locationResponse)
      })

      const result = await locationService.searchLocations('London')
      expect(result).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('API Response Validation', () => {
    it('should validate location API response structure', async () => {
      const invalidResponses = [
        null,
        undefined,
        { results: null },
        { results: undefined },
        { results: 'invalid' },
        { results: [null, undefined] },
        { results: [{ id: 'invalid' }] },
        { results: [{ id: 1, name: '', country: 'Test', latitude: 0, longitude: 0 }] }
      ]

      for (const invalidResponse of invalidResponses) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(invalidResponse)
        })

        const result = await locationService.searchLocations('test')
        expect(result).toEqual([])
        mockFetch.mockClear()
      }
    })

    it('should validate weather API response structure', async () => {
      const invalidResponses = [
        null,
        undefined,
        {},
        { current: null },
        { current: undefined },
        { current: 'invalid' },
        { daily: null },
        { daily: undefined },
        { daily: 'invalid' }
      ]

      for (const invalidResponse of invalidResponses) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(invalidResponse)
        })

        await expect(weatherService.getCurrentWeather(mockLocation.latitude, mockLocation.longitude))
          .rejects.toMatchObject({
            type: 'data',
            message: 'Invalid weather data received from service'
          })
        
        mockFetch.mockClear()
      }
    })
  })
})