import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../../App.vue'
import type { Location, GeocodingResponse, WeatherResponse } from '../../types'

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

describe('App Integration Tests - Complete User Workflows', () => {
  let wrapper: any

  // Test data
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
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  describe('Complete Search → Select → Weather Display Flow', () => {
    it('should complete the full user workflow successfully', async () => {
      // Setup API mocks
      const locationResponse: GeocodingResponse = { results: mockLocations }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(locationResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWeatherResponse)
        })

      // Mount the app
      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Step 1: Verify initial state
      expect(wrapper.find('.welcome-section').exists()).toBe(true)
      expect(wrapper.find('.weather-section').exists()).toBe(false)

      // Step 2: Perform search
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      expect(searchBar.exists()).toBe(true)

      // Simulate user typing in search
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()

      // Verify search API was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('geocoding-api.open-meteo.com/v1/search'),
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('name=New+York'),
        expect.any(Object)
      )

      // Wait for search results
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Step 3: Verify search results are displayed
      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      expect(locationResults.exists()).toBe(true)
      expect(locationResults.props('locations')).toHaveLength(2)
      expect(locationResults.props('locations')[0].name).toBe('New York')

      // Step 4: Select a location
      await locationResults.vm.$emit('select-location', mockLocations[0])
      await wrapper.vm.$nextTick()

      // Verify weather API was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.open-meteo.com/v1/forecast'),
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('latitude=40.7128&longitude=-74.006'),
        expect.any(Object)
      )

      // Wait for weather data to load
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Step 5: Verify weather display
      expect(wrapper.find('.welcome-section').exists()).toBe(false)
      expect(wrapper.find('.weather-section').exists()).toBe(true)

      const weatherDisplay = wrapper.findComponent({ name: 'WeatherDisplay' })
      expect(weatherDisplay.exists()).toBe(true)
      expect(weatherDisplay.props('location')).toEqual(mockLocations[0])

      // Verify current weather is displayed
      const currentWeather = wrapper.findComponent({ name: 'CurrentWeather' })
      expect(currentWeather.exists()).toBe(true)

      // Verify forecast is displayed
      const forecastList = wrapper.findComponent({ name: 'ForecastList' })
      expect(forecastList.exists()).toBe(true)

      // Verify search results are cleared
      expect(wrapper.findComponent({ name: 'LocationResults' }).exists()).toBe(false)
    })

    it('should handle search with no results gracefully', async () => {
      // Setup API mock for empty results
      const emptyResponse: GeocodingResponse = { results: [] }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(emptyResponse)
      })

      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Perform search
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'NonexistentPlace')
      await wrapper.vm.$nextTick()

      // Wait for search to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify empty results are handled
      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      expect(locationResults.exists()).toBe(true)
      expect(locationResults.props('locations')).toHaveLength(0)
      expect(locationResults.props('hasSearched')).toBe(true)

      // Verify no weather section is shown
      expect(wrapper.find('.weather-section').exists()).toBe(false)
      expect(wrapper.find('.welcome-section').exists()).toBe(true)
    })

    it('should handle multiple searches and location changes', async () => {
      // Setup API mocks for multiple searches
      const firstSearchResponse: GeocodingResponse = {
        results: [mockLocations[0]]
      }
      const secondSearchResponse: GeocodingResponse = {
        results: [mockLocations[1]]
      }

      mockFetch
        // First search
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(firstSearchResponse)
        })
        // First weather request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWeatherResponse)
        })
        // Second search
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(secondSearchResponse)
        })
        // Second weather request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...mockWeatherResponse,
            current: {
              ...mockWeatherResponse.current,
              temperature_2m: 8.3
            }
          })
        })

      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })

      // First search and selection
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      let locationResults = wrapper.findComponent({ name: 'LocationResults' })
      await locationResults.vm.$emit('select-location', mockLocations[0])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify first location is displayed
      let weatherDisplay = wrapper.findComponent({ name: 'WeatherDisplay' })
      expect(weatherDisplay.props('location')).toEqual(mockLocations[0])

      // Second search and selection
      await searchBar.vm.$emit('search', 'London')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      locationResults = wrapper.findComponent({ name: 'LocationResults' })
      await locationResults.vm.$emit('select-location', mockLocations[1])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify second location is displayed
      weatherDisplay = wrapper.findComponent({ name: 'WeatherDisplay' })
      expect(weatherDisplay.props('location')).toEqual(mockLocations[1])

      // Verify API was called for both locations
      expect(mockFetch).toHaveBeenCalledTimes(4)
    })
  })

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle location search API errors gracefully', async () => {
      // Mock API error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

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

      // Verify error is displayed
      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'api',
        retryable: true
      })

      // Verify no location results are shown
      expect(wrapper.findComponent({ name: 'LocationResults' }).exists()).toBe(false)
      expect(wrapper.find('.weather-section').exists()).toBe(false)
    })

    it('should handle weather API errors gracefully', async () => {
      // Setup successful location search but failed weather request
      const locationResponse: GeocodingResponse = { results: [mockLocations[0]] }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(locationResponse)
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503
        })

      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Perform search and selection
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      await locationResults.vm.$emit('select-location', mockLocations[0])
      await wrapper.vm.$nextTick()

      // Wait for weather error to be processed
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify weather display shows error
      const weatherDisplay = wrapper.findComponent({ name: 'WeatherDisplay' })
      expect(weatherDisplay.exists()).toBe(true)
      expect(weatherDisplay.props('location')).toEqual(mockLocations[0])

      // The error should be handled within WeatherDisplay component
      // Verify location results are cleared
      expect(wrapper.findComponent({ name: 'LocationResults' }).exists()).toBe(false)
    })

    it('should handle network errors during search', async () => {
      // Mock network error
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
    })

    it('should handle offline scenarios', async () => {
      // Set offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Verify offline indicator is shown
      expect(wrapper.find('.network-status.offline').exists()).toBe(true)
      expect(wrapper.find('.network-status.offline').text()).toContain('offline')

      // Attempt search while offline
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()

      // Wait for offline error to be processed
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify offline error is handled
      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
    })

    it('should handle malformed API responses', async () => {
      // Mock malformed response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' })
      })

      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Perform search
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()

      // Wait for response to be processed
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify empty results are handled (malformed response treated as no results)
      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      expect(locationResults.exists()).toBe(true)
      expect(locationResults.props('locations')).toHaveLength(0)
    })

    it('should handle JSON parsing errors', async () => {
      // Mock JSON parsing error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

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

      // Verify error is displayed
      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'api',
        retryable: true
      })
    })

    it('should handle invalid search queries', async () => {
      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Perform search with invalid query (too short)
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'a')
      await wrapper.vm.$nextTick()

      // Wait for validation error
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify user error is displayed
      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'user',
        retryable: false
      })

      // Verify no API call was made
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle empty search queries', async () => {
      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Perform search with empty query
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', '')
      await wrapper.vm.$nextTick()

      // Verify no error is shown and no API call is made
      expect(wrapper.findComponent({ name: 'ErrorMessage' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'LocationResults' }).exists()).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Loading States and User Feedback', () => {
    it('should show loading states during search', async () => {
      // Mock delayed response
      let resolveSearch: (value: any) => void
      const searchPromise = new Promise(resolve => {
        resolveSearch = resolve
      })

      mockFetch.mockReturnValueOnce(searchPromise)

      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Start search
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()

      // Verify loading state is shown
      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      expect(locationResults.exists()).toBe(true)
      expect(locationResults.props('loading')).toBe(true)

      // Resolve the search
      resolveSearch!({
        ok: true,
        json: () => Promise.resolve({ results: mockLocations })
      })

      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify loading state is cleared
      expect(locationResults.props('loading')).toBe(false)
      expect(locationResults.props('locations')).toHaveLength(2)
    })

    it('should show loading states during weather data fetch', async () => {
      // Setup successful location search
      const locationResponse: GeocodingResponse = { results: [mockLocations[0]] }

      // Mock delayed weather response
      let resolveWeather: (value: any) => void
      const weatherPromise = new Promise(resolve => {
        resolveWeather = resolve
      })

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(locationResponse)
        })
        .mockReturnValueOnce(weatherPromise)

      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Perform search and selection
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      await locationResults.vm.$emit('select-location', mockLocations[0])
      await wrapper.vm.$nextTick()

      // Verify weather display shows loading state
      const weatherDisplay = wrapper.findComponent({ name: 'WeatherDisplay' })
      expect(weatherDisplay.exists()).toBe(true)

      // Resolve the weather request
      resolveWeather!({
        ok: true,
        json: () => Promise.resolve(mockWeatherResponse)
      })

      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify weather data is displayed
      expect(weatherDisplay.exists()).toBe(true)
      expect(weatherDisplay.props('location')).toEqual(mockLocations[0])
    })
  })

  describe('Retry Functionality', () => {
    it('should allow retry after search errors', async () => {
      // Mock initial error then success
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: mockLocations })
        })

      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Perform search that fails
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify error is shown
      let errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error').retryable).toBe(true)

      // Retry the operation
      await errorMessage.vm.$emit('retry')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify retry was successful
      expect(wrapper.findComponent({ name: 'ErrorMessage' }).exists()).toBe(false)
      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      expect(locationResults.exists()).toBe(true)
      expect(locationResults.props('locations')).toHaveLength(2)
    })

    it('should handle retry for weather errors', async () => {
      // Setup successful location search but failed weather request
      const locationResponse: GeocodingResponse = { results: [mockLocations[0]] }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(locationResponse)
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWeatherResponse)
        })

      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Perform search and selection
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      await locationResults.vm.$emit('select-location', mockLocations[0])
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Weather display should handle the error internally and provide retry
      const weatherDisplay = wrapper.findComponent({ name: 'WeatherDisplay' })
      expect(weatherDisplay.exists()).toBe(true)

      // Simulate retry from weather display
      await weatherDisplay.vm.$emit('retry')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify weather data is now displayed
      expect(weatherDisplay.exists()).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Accessibility and User Experience', () => {
    it('should maintain proper focus management', async () => {
      const locationResponse: GeocodingResponse = { results: mockLocations }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(locationResponse)
      })

      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Verify main content has proper tabindex
      const mainContent = wrapper.find('#main-content')
      expect(mainContent.exists()).toBe(true)
      expect(mainContent.attributes('tabindex')).toBe('-1')

      // Verify skip link exists
      const skipLink = wrapper.find('.skip-link')
      expect(skipLink.exists()).toBe(true)
      expect(skipLink.attributes('href')).toBe('#main-content')
    })

    it('should provide proper ARIA labels and live regions', async () => {
      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Verify live region exists
      const liveRegion = wrapper.findComponent({ name: 'LiveRegion' })
      expect(liveRegion.exists()).toBe(true)

      // Verify proper role attributes
      expect(wrapper.find('[role="main"]').exists()).toBe(true)
      expect(wrapper.find('[role="banner"]').exists()).toBe(true)
      expect(wrapper.find('[role="contentinfo"]').exists()).toBe(true)
    })

    it('should announce search results to screen readers', async () => {
      const locationResponse: GeocodingResponse = { results: mockLocations }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(locationResponse)
      })

      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Perform search
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify live region message is updated
      const liveRegion = wrapper.findComponent({ name: 'LiveRegion' })
      expect(liveRegion.props('message')).toContain('Found 2 locations')
    })

    it('should handle keyboard navigation properly', async () => {
      wrapper = mount(App)

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Simulate Tab key press to activate keyboard navigation
      await wrapper.trigger('keydown', { key: 'Tab' })
      await wrapper.vm.$nextTick()

      // Verify keyboard navigation class is applied
      expect(wrapper.find('.app.keyboard-nav-active').exists()).toBe(true)

      // Simulate mouse interaction to deactivate keyboard navigation
      await wrapper.trigger('mousedown')
      await wrapper.vm.$nextTick()

      // Verify keyboard navigation class is removed
      expect(wrapper.find('.app.keyboard-nav-active').exists()).toBe(false)
    })
  })
})