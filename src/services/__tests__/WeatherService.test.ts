import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WeatherService } from '../WeatherService'
import type { WeatherResponse } from '@/types/weather'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock navigator.onLine with a configurable mock
const mockNavigatorOnLine = vi.fn(() => true)
Object.defineProperty(navigator, 'onLine', {
  get: mockNavigatorOnLine,
  configurable: true
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

describe('WeatherService', () => {
  let weatherService: WeatherService

  beforeEach(() => {
    weatherService = new WeatherService()
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCurrentWeather', () => {
    const validLat = 40.7128
    const validLon = -74.0060

    it('should return current weather data for valid coordinates', async () => {
      const mockResponse: WeatherResponse = {
        current: {
          time: '2024-01-15T12:00:00Z',
          temperature_2m: 15.5,
          weather_code: 1,
          wind_speed_10m: 10.2,
          wind_direction_10m: 180,
          relative_humidity_2m: 65
        },
        daily: {
          time: [],
          temperature_2m_max: [],
          temperature_2m_min: [],
          weather_code: [],
          precipitation_sum: []
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await weatherService.getCurrentWeather(validLat, validLon)

      expect(result).toEqual({
        temperature: 15.5,
        weatherCode: 1,
        windSpeed: 10.2,
        windDirection: 180,
        humidity: 65,
        timestamp: new Date('2024-01-15T12:00:00Z')
      })
    })

    it('should validate coordinates properly', async () => {
      // Test invalid latitude (too high)
      await expect(weatherService.getCurrentWeather(91, validLon)).rejects.toMatchObject({
        type: 'user',
        message: 'Latitude must be between -90 and 90 degrees',
        retryable: false
      })

      // Test invalid latitude (too low)
      await expect(weatherService.getCurrentWeather(-91, validLon)).rejects.toMatchObject({
        type: 'user',
        message: 'Latitude must be between -90 and 90 degrees',
        retryable: false
      })

      // Test invalid longitude (too high)
      await expect(weatherService.getCurrentWeather(validLat, 181)).rejects.toMatchObject({
        type: 'user',
        message: 'Longitude must be between -180 and 180 degrees',
        retryable: false
      })

      // Test invalid longitude (too low)
      await expect(weatherService.getCurrentWeather(validLat, -181)).rejects.toMatchObject({
        type: 'user',
        message: 'Longitude must be between -180 and 180 degrees',
        retryable: false
      })

      // Test non-number coordinates
      await expect(weatherService.getCurrentWeather('invalid' as any, validLon)).rejects.toMatchObject({
        type: 'user',
        message: 'Invalid coordinates provided',
        retryable: false
      })
    })

    it('should handle API errors properly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      await expect(weatherService.getCurrentWeather(validLat, validLon)).rejects.toMatchObject({
        type: 'api',
        message: 'Weather service unavailable (500)',
        retryable: true
      })
    })

    it('should handle network errors properly', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(weatherService.getCurrentWeather(validLat, validLon)).rejects.toMatchObject({
        type: 'network',
        message: 'Unable to connect to weather service. Please check your internet connection.',
        retryable: true
      })
    })

    it('should handle missing current data in response', async () => {
      const mockResponse = {
        daily: {
          time: [],
          temperature_2m_max: [],
          temperature_2m_min: [],
          weather_code: [],
          precipitation_sum: []
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await expect(weatherService.getCurrentWeather(validLat, validLon)).rejects.toMatchObject({
        type: 'data',
        message: 'Invalid weather data received from service',
        retryable: true
      })
    })

    it('should build correct API URL for current weather', async () => {
      const mockResponse: WeatherResponse = {
        current: {
          time: '2024-01-15T12:00:00Z',
          temperature_2m: 15.5,
          weather_code: 1,
          wind_speed_10m: 10.2,
          wind_direction_10m: 180,
          relative_humidity_2m: 65
        },
        daily: {
          time: [],
          temperature_2m_max: [],
          temperature_2m_min: [],
          weather_code: [],
          precipitation_sum: []
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await weatherService.getCurrentWeather(validLat, validLon)

      const expectedUrl = 'https://api.open-meteo.com/v1/forecast?' +
        'latitude=40.7128&longitude=-74.006&' +
        'current=temperature_2m%2Cweather_code%2Cwind_speed_10m%2Cwind_direction_10m%2Crelative_humidity_2m&' +
        'timezone=auto'

      expect(mockFetch).toHaveBeenCalledWith(expectedUrl)
    })

    it('should handle invalid timestamp gracefully', async () => {
      const mockResponse: WeatherResponse = {
        current: {
          time: 'invalid-timestamp',
          temperature_2m: 15.5,
          weather_code: 1,
          wind_speed_10m: 10.2,
          wind_direction_10m: 180,
          relative_humidity_2m: 65
        },
        daily: {
          time: [],
          temperature_2m_max: [],
          temperature_2m_min: [],
          weather_code: [],
          precipitation_sum: []
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await weatherService.getCurrentWeather(validLat, validLon)

      // Should fallback to current time when timestamp is invalid
      expect(result.timestamp).toBeInstanceOf(Date)
      expect(result.temperature).toBe(15.5)
    })
  })

  describe('getForecast', () => {
    const validLat = 40.7128
    const validLon = -74.0060

    it('should return forecast data for valid coordinates', async () => {
      const mockResponse: WeatherResponse = {
        current: {
          time: '2024-01-15T12:00:00Z',
          temperature_2m: 15.5,
          weather_code: 1,
          wind_speed_10m: 10.2,
          wind_direction_10m: 180,
          relative_humidity_2m: 65
        },
        daily: {
          time: ['2024-01-15', '2024-01-16', '2024-01-17'],
          temperature_2m_max: [20.5, 18.2, 22.1],
          temperature_2m_min: [10.1, 8.5, 12.3],
          weather_code: [1, 2, 3],
          precipitation_sum: [0.0, 2.5, 1.2]
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await weatherService.getForecast(validLat, validLon)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        date: new Date('2024-01-15'),
        temperatureMax: 20.5,
        temperatureMin: 10.1,
        weatherCode: 1,
        precipitationSum: 0.0
      })
      expect(result[1]).toEqual({
        date: new Date('2024-01-16'),
        temperatureMax: 18.2,
        temperatureMin: 8.5,
        weatherCode: 2,
        precipitationSum: 2.5
      })
      expect(result[2]).toEqual({
        date: new Date('2024-01-17'),
        temperatureMax: 22.1,
        temperatureMin: 12.3,
        weatherCode: 3,
        precipitationSum: 1.2
      })
    })

    it('should validate coordinates properly', async () => {
      // Test invalid latitude
      await expect(weatherService.getForecast(91, validLon)).rejects.toMatchObject({
        type: 'user',
        message: 'Latitude must be between -90 and 90 degrees',
        retryable: false
      })

      // Test invalid longitude
      await expect(weatherService.getForecast(validLat, 181)).rejects.toMatchObject({
        type: 'user',
        message: 'Longitude must be between -180 and 180 degrees',
        retryable: false
      })
    })

    it('should handle API errors properly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503
      })

      await expect(weatherService.getForecast(validLat, validLon)).rejects.toMatchObject({
        type: 'api',
        message: 'Weather service unavailable (503)',
        retryable: true
      })
    })

    it('should handle network errors properly', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'))

      await expect(weatherService.getForecast(validLat, validLon)).rejects.toMatchObject({
        type: 'network',
        message: 'Unable to connect to weather service. Please check your internet connection.',
        retryable: true
      })
    })

    it('should handle missing daily data in response', async () => {
      const mockResponse = {
        current: {
          time: '2024-01-15T12:00:00Z',
          temperature_2m: 15.5,
          weather_code: 1,
          wind_speed_10m: 10.2,
          wind_direction_10m: 180,
          relative_humidity_2m: 65
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await expect(weatherService.getForecast(validLat, validLon)).rejects.toMatchObject({
        type: 'data',
        message: 'Invalid forecast data received from service',
        retryable: true
      })
    })

    it('should build correct API URL for forecast', async () => {
      const mockResponse: WeatherResponse = {
        current: {
          time: '2024-01-15T12:00:00Z',
          temperature_2m: 15.5,
          weather_code: 1,
          wind_speed_10m: 10.2,
          wind_direction_10m: 180,
          relative_humidity_2m: 65
        },
        daily: {
          time: ['2024-01-15'],
          temperature_2m_max: [20.5],
          temperature_2m_min: [10.1],
          weather_code: [1],
          precipitation_sum: [0.0]
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await weatherService.getForecast(validLat, validLon)

      const expectedUrl = 'https://api.open-meteo.com/v1/forecast?' +
        'latitude=40.7128&longitude=-74.006&' +
        'daily=temperature_2m_max%2Ctemperature_2m_min%2Cweather_code%2Cprecipitation_sum&' +
        'forecast_days=7&timezone=auto'

      expect(mockFetch).toHaveBeenCalledWith(expectedUrl)
    })

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      await expect(weatherService.getForecast(validLat, validLon)).rejects.toMatchObject({
        type: 'api',
        message: 'An unexpected error occurred while fetching forecast data',
        retryable: true
      })
    })

    it('should handle invalid date strings in forecast', async () => {
      const mockResponse: WeatherResponse = {
        current: {
          time: '2024-01-15T12:00:00Z',
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

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await weatherService.getForecast(validLat, validLon)

      expect(result).toHaveLength(2)
      // First entry should have fallback date (current time)
      expect(result[0].date).toBeInstanceOf(Date)
      expect(result[0].temperatureMax).toBe(20.5)

      // Second entry should have correct date
      expect(result[1].date).toEqual(new Date('2024-01-16'))
      expect(result[1].temperatureMax).toBe(18.2)
    })

    it('should handle unknown errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error')

      await expect(weatherService.getForecast(validLat, validLon)).rejects.toMatchObject({
        type: 'api',
        message: 'An unexpected error occurred while fetching forecast data',
        retryable: true
      })
    })
  })

  describe('coordinate validation edge cases', () => {
    it('should accept boundary coordinate values', async () => {
      const mockResponse: WeatherResponse = {
        current: {
          time: '2024-01-15T12:00:00Z',
          temperature_2m: 15.5,
          weather_code: 1,
          wind_speed_10m: 10.2,
          wind_direction_10m: 180,
          relative_humidity_2m: 65
        },
        daily: {
          time: [],
          temperature_2m_max: [],
          temperature_2m_min: [],
          weather_code: [],
          precipitation_sum: []
        }
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      // Test boundary values
      await expect(weatherService.getCurrentWeather(90, 180)).resolves.toBeDefined()
      await expect(weatherService.getCurrentWeather(-90, -180)).resolves.toBeDefined()
      await expect(weatherService.getCurrentWeather(0, 0)).resolves.toBeDefined()
    })
  })

  describe('enhanced error handling scenarios', () => {
    const validLat = 40.7128
    const validLon = -74.0060

    beforeEach(() => {
      vi.useFakeTimers()
      mockNavigatorOnLine.mockReturnValue(true)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should handle rate limiting (429) errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429
      })

      await expect(weatherService.getCurrentWeather(validLat, validLon)).rejects.toMatchObject({
        type: 'api',
        message: expect.stringContaining('Too many requests'),
        retryable: true
      })
    })

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() => new Promise(() => { })) // Never resolves

      const promise = weatherService.getCurrentWeather(validLat, validLon)

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
            current: {
              time: '2024-01-15T12:00:00Z',
              temperature_2m: 15.5,
              weather_code: 1,
              wind_speed_10m: 10.2,
              wind_direction_10m: 180,
              relative_humidity_2m: 65
            }
          })
        })

      const promise = weatherService.getCurrentWeather(validLat, validLon)

      // Fast-forward timers to trigger retry
      await vi.runAllTimersAsync()

      const result = await promise
      expect(result.temperature).toBe(15.5)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle offline scenarios', async () => {
      mockNavigatorOnLine.mockReturnValue(false)

      await expect(weatherService.getCurrentWeather(validLat, validLon)).rejects.toMatchObject({
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
            current: {
              time: '2024-01-15T12:00:00Z',
              temperature_2m: 15.5,
              weather_code: 1,
              wind_speed_10m: 10.2,
              wind_direction_10m: 180,
              relative_humidity_2m: 65
            }
          })
        })

      const promise = weatherService.getCurrentWeather(validLat, validLon)

      // Fast-forward timers to trigger retry
      await vi.runAllTimersAsync()

      const result = await promise
      expect(result.temperature).toBe(15.5)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should not retry on client errors (4xx)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403
      })

      await expect(weatherService.getCurrentWeather(validLat, validLon)).rejects.toMatchObject({
        type: 'api',
        message: expect.stringContaining('forbidden'),
        retryable: false
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should handle CORS errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('CORS policy error'))

      await expect(weatherService.getCurrentWeather(validLat, validLon)).rejects.toMatchObject({
        type: 'api',
        message: expect.stringContaining('security restrictions'),
        retryable: false
      })
    })

    it('should handle DNS resolution errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('DNS resolution failed'))

      await expect(weatherService.getCurrentWeather(validLat, validLon)).rejects.toMatchObject({
        type: 'network',
        message: expect.stringContaining('Cannot reach'),
        retryable: true
      })
    })

    it('should fail after maximum retry attempts', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent network error'))

      const promise = weatherService.getCurrentWeather(validLat, validLon)

      // Fast-forward all retry attempts
      await vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow()
      expect(mockFetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })

  describe('getCompleteWeatherData', () => {
    const validLat = 40.7128
    const validLon = -74.0060

    it('should return both current and forecast data', async () => {
      const mockResponse: WeatherResponse = {
        current: {
          time: '2024-01-15T12:00:00Z',
          temperature_2m: 15.5,
          weather_code: 1,
          wind_speed_10m: 10.2,
          wind_direction_10m: 180,
          relative_humidity_2m: 65
        },
        daily: {
          time: ['2024-01-15', '2024-01-16'],
          temperature_2m_max: [20.5, 18.2],
          temperature_2m_min: [10.1, 8.5],
          weather_code: [1, 2],
          precipitation_sum: [0.0, 2.5]
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await weatherService.getCompleteWeatherData(validLat, validLon)

      expect(result.current).toEqual({
        temperature: 15.5,
        weatherCode: 1,
        windSpeed: 10.2,
        windDirection: 180,
        humidity: 65,
        timestamp: new Date('2024-01-15T12:00:00Z')
      })

      expect(result.forecast).toHaveLength(2)
      expect(result.forecast[0]).toEqual({
        date: new Date('2024-01-15'),
        temperatureMax: 20.5,
        temperatureMin: 10.1,
        weatherCode: 1,
        precipitationSum: 0.0
      })
    })

    it('should handle missing data in complete weather response', async () => {
      const mockResponse = {
        current: {
          time: '2024-01-15T12:00:00Z',
          temperature_2m: 15.5,
          weather_code: 1,
          wind_speed_10m: 10.2,
          wind_direction_10m: 180,
          relative_humidity_2m: 65
        }
        // Missing daily data
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await expect(weatherService.getCompleteWeatherData(validLat, validLon)).rejects.toMatchObject({
        type: 'data',
        message: 'Invalid weather data received from service',
        retryable: true
      })
    })
  })
})