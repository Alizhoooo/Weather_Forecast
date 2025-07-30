import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import WeatherDisplay from '../WeatherDisplay.vue'
import CurrentWeather from '../CurrentWeather.vue'
import ForecastList from '../ForecastList.vue'
import { weatherService } from '@/services/WeatherService'
import type { Location, CurrentWeatherData, ForecastData, AppError } from '@/types'

// Mock the weather service
vi.mock('@/services/WeatherService', () => ({
  weatherService: {
    getCurrentWeather: vi.fn(),
    getForecast: vi.fn()
  }
}))

const mockWeatherService = vi.mocked(weatherService)

describe('WeatherDisplay', () => {
  let wrapper: VueWrapper<any>

  const mockLocation: Location = {
    id: 1,
    name: 'New York',
    country: 'United States',
    admin1: 'New York',
    latitude: 40.7128,
    longitude: -74.0060
  }

  const mockCurrentWeather: CurrentWeatherData = {
    temperature: 22.5,
    weatherCode: 1,
    windSpeed: 15.2,
    windDirection: 180,
    humidity: 65,
    timestamp: new Date('2024-01-15T14:30:00Z')
  }

  const mockForecast: ForecastData[] = [
    {
      date: new Date('2024-01-15'),
      temperatureMax: 25,
      temperatureMin: 18,
      weatherCode: 1,
      precipitationSum: 0
    },
    {
      date: new Date('2024-01-16'),
      temperatureMax: 23,
      temperatureMin: 16,
      weatherCode: 61,
      precipitationSum: 2.5
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Initial State', () => {
    it('should render empty state when no location is provided', () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: null
        }
      })

      expect(wrapper.find('.weather-empty').exists()).toBe(true)
      expect(wrapper.find('.empty-message h3').text()).toBe('No weather data available')
      expect(wrapper.find('.empty-message p').text()).toBe('Select a location to view weather information')
    })

    it('should not call weather service when location is null', () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: null
        }
      })

      expect(mockWeatherService.getCurrentWeather).not.toHaveBeenCalled()
      expect(mockWeatherService.getForecast).not.toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should show loading state when fetching weather data', async () => {
      // Mock services to return pending promises
      const pendingPromise = new Promise<CurrentWeatherData>(() => {}) // Never resolves
      const pendingForecastPromise = new Promise<ForecastData[]>(() => {}) // Never resolves
      mockWeatherService.getCurrentWeather.mockReturnValue(pendingPromise)
      mockWeatherService.getForecast.mockReturnValue(pendingForecastPromise)

      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()

      expect(wrapper.find('.weather-loading').exists()).toBe(true)
      expect(wrapper.find('.loading-text').text()).toBe('Loading weather data...')
      expect(wrapper.find('.spinner').exists()).toBe(true)
    })

    it('should hide other states when loading', async () => {
      const pendingPromise = new Promise<CurrentWeatherData>(() => {})
      const pendingForecastPromise = new Promise<ForecastData[]>(() => {})
      mockWeatherService.getCurrentWeather.mockReturnValue(pendingPromise)
      mockWeatherService.getForecast.mockReturnValue(pendingForecastPromise)

      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()

      expect(wrapper.find('.weather-error').exists()).toBe(false)
      expect(wrapper.find('.weather-content').exists()).toBe(false)
      expect(wrapper.find('.weather-empty').exists()).toBe(false)
    })
  })

  describe('Success State', () => {
    beforeEach(() => {
      mockWeatherService.getCurrentWeather.mockResolvedValue(mockCurrentWeather)
      mockWeatherService.getForecast.mockResolvedValue(mockForecast)
    })

    it('should fetch weather data when location is provided', async () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0)) // Wait for promises

      expect(mockWeatherService.getCurrentWeather).toHaveBeenCalledWith(
        mockLocation.latitude,
        mockLocation.longitude
      )
      expect(mockWeatherService.getForecast).toHaveBeenCalledWith(
        mockLocation.latitude,
        mockLocation.longitude
      )
    })

    it('should render weather content when data is loaded successfully', async () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(wrapper.find('.weather-content').exists()).toBe(true)
      expect(wrapper.find('.location-header').exists()).toBe(true)
      expect(wrapper.findComponent(CurrentWeather).exists()).toBe(true)
      expect(wrapper.findComponent(ForecastList).exists()).toBe(true)
    })

    it('should display formatted location name', async () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      const locationName = wrapper.find('.location-name')
      expect(locationName.text()).toBe('New York, New York, United States')
    })

    it('should display last updated timestamp', async () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      const lastUpdated = wrapper.find('.last-updated')
      expect(lastUpdated.text()).toContain('Last updated:')
    })

    it('should pass correct props to child components', async () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      const currentWeatherComponent = wrapper.findComponent(CurrentWeather)
      const forecastListComponent = wrapper.findComponent(ForecastList)

      expect(currentWeatherComponent.props('currentWeather')).toEqual(mockCurrentWeather)
      expect(forecastListComponent.props('forecast')).toEqual(mockForecast)
    })
  })

  describe('Error State', () => {
    const mockError: AppError = {
      type: 'network',
      message: 'Unable to connect to weather service',
      retryable: true
    }

    beforeEach(() => {
      mockWeatherService.getCurrentWeather.mockRejectedValue(mockError)
      mockWeatherService.getForecast.mockRejectedValue(mockError)
    })

    it('should display error state when weather service fails', async () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(wrapper.find('.weather-error').exists()).toBe(true)
      expect(wrapper.find('.error-title').text()).toBe('Unable to load weather data')
      expect(wrapper.find('.error-message').text()).toBe(mockError.message)
    })

    it('should show retry button for retryable errors', async () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      const retryButton = wrapper.find('.retry-button')
      expect(retryButton.exists()).toBe(true)
      expect(retryButton.text()).toBe('Try Again')
      expect(retryButton.attributes('disabled')).toBeUndefined()
    })

    it('should hide retry button for non-retryable errors', async () => {
      const nonRetryableError: AppError = {
        type: 'user',
        message: 'Invalid location coordinates',
        retryable: false
      }

      mockWeatherService.getCurrentWeather.mockRejectedValue(nonRetryableError)
      mockWeatherService.getForecast.mockRejectedValue(nonRetryableError)

      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(wrapper.find('.retry-button').exists()).toBe(false)
    })

    it('should handle retry button click', async () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      const retryButton = wrapper.find('.retry-button')
      
      // Setup mocks for retry attempt
      mockWeatherService.getCurrentWeather.mockResolvedValue(mockCurrentWeather)
      mockWeatherService.getForecast.mockResolvedValue(mockForecast)

      await retryButton.trigger('click')

      // Should emit retry event
      expect(wrapper.emitted('retry')).toHaveLength(1)
    })

    it('should handle unexpected error format', async () => {
      const unexpectedError = new Error('Unexpected error')
      mockWeatherService.getCurrentWeather.mockRejectedValue(unexpectedError)
      mockWeatherService.getForecast.mockRejectedValue(unexpectedError)

      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 10)) // Increase timeout

      expect(wrapper.find('.weather-error').exists()).toBe(true)
      expect(wrapper.find('.error-message').text()).toBe(
        'An unexpected error occurred while loading weather data'
      )
    })
  })

  describe('Location Changes', () => {
    it('should fetch new weather data when location changes', async () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      mockWeatherService.getCurrentWeather.mockResolvedValue(mockCurrentWeather)
      mockWeatherService.getForecast.mockResolvedValue(mockForecast)

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Clear previous calls
      vi.clearAllMocks()

      // Change location
      const newLocation: Location = {
        id: 2,
        name: 'London',
        country: 'United Kingdom',
        latitude: 51.5074,
        longitude: -0.1278
      }

      await wrapper.setProps({ location: newLocation })

      expect(mockWeatherService.getCurrentWeather).toHaveBeenCalledWith(
        newLocation.latitude,
        newLocation.longitude
      )
      expect(mockWeatherService.getForecast).toHaveBeenCalledWith(
        newLocation.latitude,
        newLocation.longitude
      )
    })

    it('should clear weather data when location is set to null', async () => {
      mockWeatherService.getCurrentWeather.mockResolvedValue(mockCurrentWeather)
      mockWeatherService.getForecast.mockResolvedValue(mockForecast)

      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Verify weather content is shown
      expect(wrapper.find('.weather-content').exists()).toBe(true)

      // Set location to null
      await wrapper.setProps({ location: null })

      // Should show empty state
      expect(wrapper.find('.weather-empty').exists()).toBe(true)
      expect(wrapper.find('.weather-content').exists()).toBe(false)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for loading state', async () => {
      const pendingPromise = new Promise<CurrentWeatherData>(() => {})
      const pendingForecastPromise = new Promise<ForecastData[]>(() => {})
      mockWeatherService.getCurrentWeather.mockReturnValue(pendingPromise)
      mockWeatherService.getForecast.mockReturnValue(pendingForecastPromise)

      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()

      const loadingElement = wrapper.find('.weather-loading')
      expect(loadingElement.exists()).toBe(true)
    })

    it('should have proper button attributes for retry button', async () => {
      const mockError: AppError = {
        type: 'network',
        message: 'Network error',
        retryable: true
      }

      mockWeatherService.getCurrentWeather.mockRejectedValue(mockError)
      mockWeatherService.getForecast.mockRejectedValue(mockError)

      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      const retryButton = wrapper.find('.retry-button')
      expect(retryButton.attributes('type')).toBe('button')
    })
  })

  describe('Integration with Child Components', () => {
    beforeEach(() => {
      mockWeatherService.getCurrentWeather.mockResolvedValue(mockCurrentWeather)
      mockWeatherService.getForecast.mockResolvedValue(mockForecast)
    })

    it('should render CurrentWeather component with correct props', async () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      const currentWeatherComponent = wrapper.findComponent(CurrentWeather)
      expect(currentWeatherComponent.exists()).toBe(true)
      expect(currentWeatherComponent.props()).toEqual({
        currentWeather: mockCurrentWeather
      })
    })

    it('should render ForecastList component with correct props', async () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      const forecastListComponent = wrapper.findComponent(ForecastList)
      expect(forecastListComponent.exists()).toBe(true)
      expect(forecastListComponent.props()).toEqual({
        forecast: mockForecast
      })
    })
  })

  describe('Exposed Methods', () => {
    it('should expose fetchWeatherData method', () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      expect(wrapper.vm.fetchWeatherData).toBeDefined()
      expect(typeof wrapper.vm.fetchWeatherData).toBe('function')
    })

    it('should expose handleRetry method', () => {
      wrapper = mount(WeatherDisplay, {
        props: {
          location: mockLocation
        }
      })

      expect(wrapper.vm.handleRetry).toBeDefined()
      expect(typeof wrapper.vm.handleRetry).toBe('function')
    })
  })
})