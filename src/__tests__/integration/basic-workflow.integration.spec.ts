import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '@/App.vue'
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

describe('Basic Integration Tests - Core Workflows', () => {
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

  describe('Basic App Functionality', () => {
    it('should render the main application structure', async () => {
      wrapper = mount(App)
      
      // Check that app container is present
      expect(wrapper.find('.app').exists()).toBe(true)
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()
      
      // Check that main elements are present after initialization
      expect(wrapper.find('.app-header').exists()).toBe(true)
      expect(wrapper.find('.app-main').exists()).toBe(true)
      expect(wrapper.find('.app-footer').exists()).toBe(true)
      expect(wrapper.find('.welcome-section').exists()).toBe(true)
    })

    it('should show loading spinner during initialization', () => {
      wrapper = mount(App)
      
      expect(wrapper.find('.app-initializing').exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(true)
    })

    it('should have proper accessibility structure', async () => {
      wrapper = mount(App)
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()
      
      // Check for proper ARIA structure
      expect(wrapper.find('[role="main"]').exists()).toBe(true)
      expect(wrapper.find('[role="banner"]').exists()).toBe(true)
      expect(wrapper.find('[role="contentinfo"]').exists()).toBe(true)
      expect(wrapper.find('#main-content').exists()).toBe(true)
      expect(wrapper.find('.skip-link').exists()).toBe(true)
    })
  })

  describe('Search Functionality', () => {
    it('should handle successful location search', async () => {
      const locationResponse: GeocodingResponse = { 
        results: [mockLocation] 
      }
      
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
      expect(searchBar.exists()).toBe(true)

      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()

      // Wait for search results
      await new Promise(resolve => setTimeout(resolve, 200))
      await wrapper.vm.$nextTick()

      // Verify search results are displayed
      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      expect(locationResults.exists()).toBe(true)
      expect(locationResults.props('locations')).toHaveLength(1)
      expect(locationResults.props('locations')[0].name).toBe('New York')

      // Verify API was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('geocoding-api.open-meteo.com/v1/search'),
        expect.any(Object)
      )
    })

    it('should handle empty search results', async () => {
      const emptyResponse: GeocodingResponse = { results: [] }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(emptyResponse)
      })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'NonexistentPlace')
      await wrapper.vm.$nextTick()

      await new Promise(resolve => setTimeout(resolve, 200))
      await wrapper.vm.$nextTick()

      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      expect(locationResults.exists()).toBe(true)
      expect(locationResults.props('locations')).toHaveLength(0)
      expect(locationResults.props('hasSearched')).toBe(true)
    })

    it('should clear search results when requested', async () => {
      const locationResponse: GeocodingResponse = { 
        results: [mockLocation] 
      }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(locationResponse)
      })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Perform search
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      await wrapper.vm.$nextTick()

      // Verify results are shown
      expect(wrapper.findComponent({ name: 'LocationResults' }).exists()).toBe(true)

      // Clear results
      await searchBar.vm.$emit('clear')
      await wrapper.vm.$nextTick()

      // Verify results are cleared
      expect(wrapper.findComponent({ name: 'LocationResults' }).exists()).toBe(false)
    })
  })

  describe('Weather Display Functionality', () => {
    it('should display weather data after location selection', async () => {
      const locationResponse: GeocodingResponse = { 
        results: [mockLocation] 
      }
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(locationResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWeatherResponse)
        })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Perform search
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      await wrapper.vm.$nextTick()

      // Select location
      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      await locationResults.vm.$emit('select-location', mockLocation)
      await wrapper.vm.$nextTick()

      // Wait for weather data
      await new Promise(resolve => setTimeout(resolve, 200))
      await wrapper.vm.$nextTick()

      // Verify weather display
      expect(wrapper.find('.weather-section').exists()).toBe(true)
      expect(wrapper.find('.welcome-section').exists()).toBe(false)

      const weatherDisplay = wrapper.findComponent({ name: 'WeatherDisplay' })
      expect(weatherDisplay.exists()).toBe(true)
      expect(weatherDisplay.props('location')).toEqual(mockLocation)

      // Verify search results are cleared
      expect(wrapper.findComponent({ name: 'LocationResults' }).exists()).toBe(false)
    })

    it('should show current weather and forecast components', async () => {
      const locationResponse: GeocodingResponse = { 
        results: [mockLocation] 
      }
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(locationResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWeatherResponse)
        })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      await wrapper.vm.$nextTick()

      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      await locationResults.vm.$emit('select-location', mockLocation)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      await wrapper.vm.$nextTick()

      // Verify weather components are present
      expect(wrapper.findComponent({ name: 'CurrentWeather' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'ForecastList' }).exists()).toBe(true)
    })
  })

  describe('Loading States', () => {
    it('should show loading state during search', async () => {
      let resolveSearch: (value: any) => void
      const searchPromise = new Promise(resolve => {
        resolveSearch = resolve
      })

      mockFetch.mockReturnValueOnce(searchPromise)

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Start search
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()

      // Verify loading state
      const locationResults = wrapper.findComponent({ name: 'LocationResults' })
      expect(locationResults.exists()).toBe(true)
      expect(locationResults.props('loading')).toBe(true)

      // Resolve search
      resolveSearch!({
        ok: true,
        json: () => Promise.resolve({ results: [mockLocation] })
      })

      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      // Verify loading state is cleared
      expect(locationResults.props('loading')).toBe(false)
      expect(locationResults.props('locations')).toHaveLength(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle search validation errors', async () => {
      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Perform search with invalid query (too short)
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'a')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      await wrapper.vm.$nextTick()

      // Should show error message
      const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.props('error')).toMatchObject({
        type: 'user',
        retryable: false
      })
    })

    it('should handle empty search queries gracefully', async () => {
      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Perform search with empty query
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', '')
      await wrapper.vm.$nextTick()

      // Should not show error or make API call
      expect(wrapper.findComponent({ name: 'ErrorMessage' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'LocationResults' }).exists()).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('User Experience Features', () => {
    it('should have live region for screen reader announcements', async () => {
      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const liveRegion = wrapper.findComponent({ name: 'LiveRegion' })
      expect(liveRegion.exists()).toBe(true)
    })

    it('should show welcome message initially', async () => {
      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      const welcomeSection = wrapper.find('.welcome-section')
      expect(welcomeSection.exists()).toBe(true)
      expect(welcomeSection.text()).toContain('Welcome to Weather Forecast')
    })

    it('should show network status when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Trigger network status update
      const networkStatusListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )?.[1]
      
      if (networkStatusListener) {
        networkStatusListener()
        await wrapper.vm.$nextTick()
      }

      // Should show offline indicator
      expect(wrapper.find('.network-status.offline').exists()).toBe(true)
    })
  })

  describe('Component Integration', () => {
    it('should properly integrate all main components', async () => {
      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Verify all main components are present
      expect(wrapper.findComponent({ name: 'SearchBar' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'LiveRegion' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(false) // Should be hidden after init
      
      // Welcome section should be visible initially
      expect(wrapper.find('.welcome-section').exists()).toBe(true)
      expect(wrapper.find('.weather-section').exists()).toBe(false)
    })

    it('should handle component state transitions correctly', async () => {
      const locationResponse: GeocodingResponse = { 
        results: [mockLocation] 
      }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(locationResponse)
      })

      wrapper = mount(App)
      
      await new Promise(resolve => setTimeout(resolve, 600))
      await wrapper.vm.$nextTick()

      // Initial state: welcome visible, weather hidden
      expect(wrapper.find('.welcome-section').exists()).toBe(true)
      expect(wrapper.find('.weather-section').exists()).toBe(false)

      // After search: location results visible
      const searchBar = wrapper.findComponent({ name: 'SearchBar' })
      await searchBar.vm.$emit('search', 'New York')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent({ name: 'LocationResults' }).exists()).toBe(true)
      expect(wrapper.find('.welcome-section').exists()).toBe(true) // Still visible
      expect(wrapper.find('.weather-section').exists()).toBe(false)
    })
  })
})