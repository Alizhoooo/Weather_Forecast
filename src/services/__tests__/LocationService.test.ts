import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { LocationService } from '../LocationService'
import type { GeocodingResponse } from '@/types/location'

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

describe('LocationService', () => {
  let locationService: LocationService

  beforeEach(() => {
    locationService = new LocationService()
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('searchLocations', () => {
    it('should return locations for valid search query', async () => {
      const mockResponse: GeocodingResponse = {
        results: [
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
            name: 'New York',
            country: 'United Kingdom',
            latitude: 53.0792,
            longitude: -0.1355
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await locationService.searchLocations('New York')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 1,
        name: 'New York',
        country: 'United States',
        admin1: 'New York',
        latitude: 40.7128,
        longitude: -74.0060
      })
      expect(result[1]).toEqual({
        id: 2,
        name: 'New York',
        country: 'United Kingdom',
        admin1: undefined,
        latitude: 53.0792,
        longitude: -0.1355
      })
    })

    it('should return empty array when no results found', async () => {
      const mockResponse: GeocodingResponse = {
        results: []
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await locationService.searchLocations('NonexistentPlace')
      expect(result).toEqual([])
    })

    it('should return empty array when results property is missing', async () => {
      const mockResponse = {}

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await locationService.searchLocations('SomePlace')
      expect(result).toEqual([])
    })

    it('should sanitize and validate search query', async () => {
      // Test query too short
      await expect(locationService.searchLocations('a')).rejects.toMatchObject({
        type: 'user',
        message: 'Please enter a valid location name (at least 2 characters)',
        retryable: false
      })

      // Test empty query
      await expect(locationService.searchLocations('')).rejects.toMatchObject({
        type: 'user',
        message: 'Please enter a valid location name (at least 2 characters)',
        retryable: false
      })

      // Test query with dangerous characters
      const mockResponse: GeocodingResponse = { results: [] }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await locationService.searchLocations('New<script>alert("xss")</script>York')
      
      // Verify the fetch was called with sanitized query
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('name=NewscriptalertxssscriptYork')
      )
    })

    it('should limit query length', async () => {
      const longQuery = 'a'.repeat(150)
      const mockResponse: GeocodingResponse = { results: [] }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await locationService.searchLocations(longQuery)
      
      // Verify the fetch was called with truncated query (100 chars max)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('name=' + 'a'.repeat(100))
      )
    })

    it('should handle API errors properly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'api',
        message: 'Search service unavailable (500)',
        retryable: true
      })
    })

    it('should handle network errors properly', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'network',
        message: 'Unable to connect to location search service. Please check your internet connection.',
        retryable: true
      })
    })

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'api',
        message: 'An unexpected error occurred while searching for locations',
        retryable: true
      })
    })

    it('should filter out invalid location results', async () => {
      const mockResponse = {
        results: [
          // Valid location
          {
            id: 1,
            name: 'London',
            country: 'United Kingdom',
            latitude: 51.5074,
            longitude: -0.1278
          },
          // Invalid - missing required fields
          {
            id: 2,
            name: 'Invalid Location'
            // missing country, latitude, longitude
          },
          // Invalid - wrong data types
          {
            id: '3',
            name: 123,
            country: 'Test',
            latitude: 'invalid',
            longitude: 0
          },
          // Valid location
          {
            id: 4,
            name: 'Paris',
            country: 'France',
            latitude: 48.8566,
            longitude: 2.3522
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await locationService.searchLocations('test')
      
      // Should only return the 2 valid locations
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('London')
      expect(result[1].name).toBe('Paris')
    })

    it('should limit results to maximum count', async () => {
      const mockResponse = {
        results: Array.from({ length: 15 }, (_, i) => ({
          id: i + 1,
          name: `Location ${i + 1}`,
          country: 'Test Country',
          latitude: 0,
          longitude: 0
        }))
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await locationService.searchLocations('test')
      
      // Should limit to 10 results
      expect(result).toHaveLength(10)
    })

    it('should build correct API URL with parameters', async () => {
      const mockResponse: GeocodingResponse = { results: [] }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await locationService.searchLocations('London')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://geocoding-api.open-meteo.com/v1/search?name=London&count=10&language=en&format=json'
      )
    })

    it('should handle admin1 field correctly', async () => {
      const mockResponse: GeocodingResponse = {
        results: [
          {
            id: 1,
            name: 'Springfield',
            country: 'United States',
            admin1: 'Illinois',
            latitude: 39.7817,
            longitude: -89.6501
          },
          {
            id: 2,
            name: 'London',
            country: 'United Kingdom',
            // No admin1 field
            latitude: 51.5074,
            longitude: -0.1278
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await locationService.searchLocations('test')
      
      expect(result[0].admin1).toBe('Illinois')
      expect(result[1].admin1).toBeUndefined()
    })
  })

  describe('enhanced error handling scenarios', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should handle rate limiting (429) errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429
      })

      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'api',
        message: expect.stringContaining('Too many requests'),
        retryable: true
      })
    })

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      const promise = locationService.searchLocations('London')
      
      // Fast-forward past timeout
      vi.advanceTimersByTime(31000)
      
      await expect(promise).rejects.toMatchObject({
        type: 'network',
        retryable: true
      })
    })

    it('should retry on transient network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            results: [{
              id: 1,
              name: 'London',
              country: 'United Kingdom',
              latitude: 51.5074,
              longitude: -0.1278
            }]
          })
        })

      const promise = locationService.searchLocations('London')
      
      // Fast-forward timers to trigger retry
      await vi.runAllTimersAsync()
      
      const result = await promise
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('London')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle offline scenarios', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
      
      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'network',
        message: expect.stringContaining('offline'),
        retryable: true
      })
    })

    it('should handle server errors (5xx) with retry', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            results: [{
              id: 1,
              name: 'London',
              country: 'United Kingdom',
              latitude: 51.5074,
              longitude: -0.1278
            }]
          })
        })

      const promise = locationService.searchLocations('London')
      
      // Fast-forward timers to trigger retry
      await vi.runAllTimersAsync()
      
      const result = await promise
      expect(result).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should not retry on client errors (4xx)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403
      })

      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'api',
        message: expect.stringContaining('forbidden'),
        retryable: false
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should handle CORS errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('CORS policy error'))

      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'api',
        message: expect.stringContaining('security restrictions'),
        retryable: false
      })
    })

    it('should handle DNS resolution errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('DNS resolution failed'))

      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'network',
        message: expect.stringContaining('Cannot reach'),
        retryable: true
      })
    })

    it('should fail after maximum retry attempts', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent network error'))

      const promise = locationService.searchLocations('London')
      
      // Fast-forward all retry attempts
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow()
      expect(mockFetch).toHaveBeenCalledTimes(2) // Initial + 1 retry (LocationService has maxAttempts: 2)
    })

    it('should handle AbortError from timeout', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'network',
        message: expect.stringContaining('timed out'),
        retryable: true
      })
    })

    it('should handle unknown error types gracefully', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error string')

      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'api',
        message: 'An unexpected error occurred while searching for locations',
        retryable: true
      })
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token'))
      })

      await expect(locationService.searchLocations('London')).rejects.toMatchObject({
        type: 'api',
        message: 'An unexpected error occurred while searching for locations',
        retryable: true
      })
    })

    it('should handle null/undefined results gracefully', async () => {
      const mockResponse = {
        results: null
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await locationService.searchLocations('London')
      expect(result).toEqual([])
    })

    it('should handle results with null/undefined entries', async () => {
      const mockResponse = {
        results: [
          null,
          undefined,
          {
            id: 1,
            name: 'London',
            country: 'United Kingdom',
            latitude: 51.5074,
            longitude: -0.1278
          },
          null
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await locationService.searchLocations('London')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('London')
    })

    it('should handle empty string names and countries', async () => {
      const mockResponse = {
        results: [
          {
            id: 1,
            name: '',
            country: 'United Kingdom',
            latitude: 51.5074,
            longitude: -0.1278
          },
          {
            id: 2,
            name: 'London',
            country: '',
            latitude: 51.5074,
            longitude: -0.1278
          },
          {
            id: 3,
            name: 'Valid',
            country: 'Valid Country',
            latitude: 51.5074,
            longitude: -0.1278
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await locationService.searchLocations('test')
      
      // Should only return the valid location (empty strings are filtered out)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Valid')
    })
  })
})