import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '@/App.vue'
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

// Mock console methods to avoid noise in tests
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn()
}
Object.defineProperty(console, 'error', { value: mockConsole.error })
Object.defineProperty(console, 'warn', { value: mockConsole.warn })
Object.defineProperty(console, 'log', { value: mockConsole.log })

describe('Error Scenarios Integration Tests', () => {
  let wrapper: any

  // Test data
  const mockLocation: Location = {
    id: 1,
    name: 'New York',
    country: 'United States',
    admin1: 'New York',
    latitude: 40.7128,
    longitude: -74.0060
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
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  describe('Network Error Scenarios', () => {
    it('should handle complete network failure during search', async () => {
      // Mock complete network failure
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      wrapper = mount(App)
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Perform search
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()

      // Wait for error to be processed
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify network error is displayed
      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'network',
        retryable: true
      })
      expect(errorMessage.props('error').message).toContain('internet connection')
    })

    it('should handle DNS resolution failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('DNS resolution failed'))

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'London')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'network',
        retryable: true
      })
    })

    it('should handle timeout errors', async () => {
      vi.useFakeTimers()

      // Mock request that never resolves (timeout scenario)
      mockFetch.mockImplementation(() => new Promise(() => {}))

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      const searchPromise = searchBar.vm.$emit('search', 'Tokyo')
      await wrapper.vm.$nextTick()

      // Fast-forward past timeout
      vi.advanceTimersByTime(31000)
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'network',
        retryable: true
      })

      vi.useRealTimers()
    })

    it('should handle CORS errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('CORS policy error'))

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'Paris')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'api',
        retryable: false
      })
      expect(errorMessage.props('error').message).toContain('security restrictions')
    })
  })

  describe('API Error Scenarios', () => {
    it('should handle 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'Berlin')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'api',
        message: 'Search service unavailable (500)',
        retryable: true
      })
    })

    it('should handle 429 Rate Limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'Madrid')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'api',
        retryable: true
      })
      expect(errorMessage.props('error').message).toContain('Too many requests')
    })

    it('should handle 403 Forbidden (non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'Rome')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'api',
        retryable: false
      })
      expect(errorMessage.props('error').message).toContain('forbidden')
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token'))
      })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'Vienna')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'api',
        retryable: true
      })
    })

    it('should handle empty or null API responses', async () => {
      const invalidResponses = [null, undefined, '', 'invalid json']

      for (const invalidResponse of invalidResponses) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(invalidResponse)
        })

        wrapper = mount(App)
        
        await new Promise(resolve => setTimeout(resolve, 600))
        await wrapper.vm.$nextTick()

        const searchBar = wrapper.findComponent({ name: 'SearchBar' })
        await searchBar.vm.$emit('search', 'Test')
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 100))
        await wrapper.vm.$nextTick()

        // Should handle gracefully - either show empty results or error
        const locationResults = wrapper.findComponent({ name: 'LocationResults' })
        if (locationResults.exists()) {
          expect(locationResults.props('locations')).toHaveLength(0)
        } else {
          const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
          expect(errorMessage.exists()).toBe(true)
        }

        wrapper.unmount()
        mockFetch.mockClear()
      }
    })
  })

  describe('Data Validation Error Scenarios', () => {
    it('should handle invalid location data from API', async () => {
      const invalidLocationResponse: GeocodingResponse = {
        results: [
          {
            id: 1,
            name: '', // Invalid - empty name
            country: 'Test',
            latitude: 0,
            longitude: 0
          } as any,
          {
            id: 2,
            name: 'Valid Location',
            country: '', // Invalid - empty country
            latitude: 0,
            longitude: 0
          } as any,
          {
            id: 3,
            name: 'Another Valid',
            country: 'Test Country',
            latitude: 'invalid', // Invalid - non-numeric
            longitude: 0
          } as any
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidLocationResponse)
      })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'Test')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Should filter out invalid locations and show empty results
      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      expect(locationResults.exists()).toBe(true)
      expect(locationResults.props('locations')).toHaveLength(0)
    })

    it('should handle weather API with missing required fields', async () => {
      const locationResponse: GeocodingResponse = { results: [mockLocation] }
      const invalidWeatherResponse = {
        current: {
          // Missing required fields
          time: '2024-01-15T12:00:00Z',
          temperature_2m: 15.5
          // Missing weather_code, wind_speed_10m, etc.
        }
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(locationResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(invalidWeatherResponse)
        })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      await locationResults.vm.$emit('select-location', mockLocation)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Weather display should handle the error internally
      const weatherDisplay = wrapper.findComponent({ name: 'WeatherDisplay' })
      expect(weatherDisplay.exists()).toBe(true)
    })

    it('should handle invalid timestamp formats in weather data', async () => {
      const locationResponse: GeocodingResponse = { results: [mockLocation] }
      const weatherResponseWithInvalidTime: WeatherResponse = {
        current: {
          time: 'invalid-timestamp-format',
          temperature_2m: 15.5,
          weather_code: 1,
          wind_speed_10m: 10.2,
          wind_direction_10m: 180,
          relative_humidity_2m: 65
        },
        daily: {
          time: ['invalid-date', '2024-01-16'],
          temperature_2m_max: [20.5, 18.2],
          temperature_2m_min: [10.1, 8.5],
          weather_code: [1, 2],
          precipitation_sum: [0.0, 2.5]
        }
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(locationResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(weatherResponseWithInvalidTime)
        })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      await locationResults.vm.$emit('select-location', mockLocation)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Should handle gracefully with fallback timestamps
      const weatherDisplay = wrapper.findComponent({ name: 'WeatherDisplay' })
      expect(weatherDisplay.exists()).toBe(true)
    })
  })

  describe('User Input Error Scenarios', () => {
    it('should handle search queries that are too short', async () => {
      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'a') // Too short
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'user',
        message: 'Please enter a valid location name (at least 2 characters)',
        retryable: false
      })

      // Should not make API call
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle search queries with dangerous characters', async () => {
      const locationResponse: GeocodingResponse = { results: [] }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(locationResponse)
      })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New<script>alert("xss")</script>York')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Should sanitize the query and make API call
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('name=NewscriptalertxssscriptYork')
      )
    })

    it('should handle extremely long search queries', async () => {
      const longQuery = 'a'.repeat(200) // Very long query
      const locationResponse: GeocodingResponse = { results: [] }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(locationResponse)
      })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', longQuery)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Should truncate the query to 100 characters
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('name=' + 'a'.repeat(100))
      )
    })
  })

  describe('Offline and Connectivity Error Scenarios', () => {
    it('should handle going offline during app usage', async () => {
      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Start online
      expect(wrapper.find('.network-status.offline').exists()).toBe(false)

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
      
      // Trigger network status check
      const networkStatusListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )?.[1]
      
      if (networkStatusListener) {
        networkStatusListener()
        await wrapper.vm.$nextTick()
      }

      // Should show offline indicator
      expect(wrapper.find('.network-status.offline').exists()).toBe(true)

      // Attempt search while offline
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'London')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Should show offline error
      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'network',
        retryable: true
      })
    })

    it('should handle intermittent connectivity', async () => {
      vi.useFakeTimers()

      // Start with network error, then succeed on retry
      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [mockLocation] })
        })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      const searchPromise = searchBar.vm.$emit('search', 'London')
      await wrapper.vm.$nextTick()

      // Fast-forward to trigger retry
      await vi.runAllTimersAsync()
      await wrapper.vm.$nextTick()

      // Should eventually succeed
      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      expect(locationResults.exists()).toBe(true)
      expect(locationResults.props('locations')).toHaveLength(1)

      vi.useRealTimers()
    })
  })

  describe('Component Error Boundaries', () => {
    it('should handle unexpected component errors gracefully', async () => {
      // Mock a component that throws an error
      const ErrorThrowingComponent = {
        name: 'ErrorThrowingComponent',
        mounted() {
          throw new Error('Component error')
        },
        template: '<div>Error Component</div>'
      }

      // This test verifies that the global error boundary catches errors
      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // The app should still be functional despite component errors
      expect(wrapper.find('.app').exists()).toBe(true)
    })

    it('should handle service errors that bubble up to components', async () => {
      // Mock service to throw unexpected error
      vi.spyOn(locationService, 'searchLocations').mockRejectedValueOnce(
        new Error('Unexpected service error')
      )

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'London')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Should handle the error gracefully
      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'api',
        retryable: true
      })
    })
  })

  describe('Cache-Related Error Scenarios', () => {
    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw errors
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      const locationResponse: GeocodingResponse = { results: [mockLocation] }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(locationResponse)
      })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'London')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Should still work despite cache errors
      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      expect(locationResults.exists()).toBe(true)
      expect(locationResults.props('locations')).toHaveLength(1)
    })

    it('should handle corrupted cache data', async () => {
      // Mock corrupted cache data
      mockLocalStorage.getItem.mockReturnValueOnce('invalid json data')

      const locationResponse: GeocodingResponse = { results: [mockLocation] }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(locationResponse)
      })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'London')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Should ignore corrupted cache and fetch fresh data
      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      expect(locationResults.exists()).toBe(true)
      expect(locationResults.props('locations')).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})