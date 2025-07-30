import type { CurrentWeatherData, ForecastData, WeatherResponse } from '@/types/weather'
import { createAppError } from '@/types/error'
import { cacheService } from './CacheService'
import { ErrorHandler } from '@/utils/errorHandling'
import config from '@/config'

/**
 * Service for handling weather data functionality
 * Integrates with Open-Meteo weather API
 */
export class WeatherService {
  private readonly baseUrl = config.weatherApiBaseUrl
  private readonly forecastDays = config.forecastDays
  private readonly errorHandler = new ErrorHandler({
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 8000
  })

  /**
   * Get current weather conditions for a location
   * @param lat - Latitude coordinate
   * @param lon - Longitude coordinate
   * @returns Promise resolving to current weather data
   * @throws AppError for various error conditions
   */
  async getCurrentWeather(lat: number, lon: number): Promise<CurrentWeatherData> {
    this.validateCoordinates(lat, lon)

    // Check cache first
    const cachedData = cacheService.getCachedWeatherData(lat, lon)
    if (cachedData !== null) {
      return cachedData.current
    }

    try {
      const url = this.buildCurrentWeatherUrl(lat, lon)
      const response = await this.errorHandler.handleFetch(url, {}, 'Weather')

      const data: WeatherResponse = await response.json()
      
      if (!data.current) {
        throw createAppError(
          'data',
          'Invalid weather data received from service',
          true
        )
      }

      const currentWeather = this.transformCurrentWeatherData(data.current)
      
      // If we have daily data too, cache both together
      if (data.daily) {
        const forecast = this.transformForecastData(data.daily)
        cacheService.cacheWeatherData(lat, lon, currentWeather, forecast)
      }
      
      return currentWeather
    } catch (error) {
      // Always re-throw errors - don't swallow them
      throw error
    }
  }

  /**
   * Get daily weather forecast for a location
   * @param lat - Latitude coordinate
   * @param lon - Longitude coordinate
   * @returns Promise resolving to array of forecast data
   * @throws AppError for various error conditions
   */
  async getForecast(lat: number, lon: number): Promise<ForecastData[]> {
    this.validateCoordinates(lat, lon)

    // Check cache first
    const cachedData = cacheService.getCachedWeatherData(lat, lon)
    if (cachedData !== null) {
      return cachedData.forecast
    }

    try {
      const url = this.buildForecastUrl(lat, lon)
      const response = await this.errorHandler.handleFetch(url, {}, 'Weather forecast')

      const data: WeatherResponse = await response.json()
      
      if (!data.daily) {
        throw createAppError(
          'data',
          'Invalid forecast data received from service',
          true
        )
      }

      const forecast = this.transformForecastData(data.daily)
      
      // If we have current data too, cache both together
      if (data.current) {
        const currentWeather = this.transformCurrentWeatherData(data.current)
        cacheService.cacheWeatherData(lat, lon, currentWeather, forecast)
      }
      
      return forecast
    } catch (error) {
      // Always re-throw errors - don't swallow them
      throw error
    }
  }

  /**
   * Get both current weather and forecast in a single API call for better performance
   * @param lat - Latitude coordinate
   * @param lon - Longitude coordinate
   * @returns Promise resolving to object with current weather and forecast data
   * @throws AppError for various error conditions
   */
  async getCompleteWeatherData(lat: number, lon: number): Promise<{ current: CurrentWeatherData; forecast: ForecastData[] }> {
    this.validateCoordinates(lat, lon)

    // Check cache first
    const cachedData = cacheService.getCachedWeatherData(lat, lon)
    if (cachedData !== null) {
      return cachedData
    }

    try {
      const url = this.buildCompleteWeatherUrl(lat, lon)
      const response = await this.errorHandler.handleFetch(url, {}, 'Complete weather')

      const data: WeatherResponse = await response.json()
      
      if (!data.current || !data.daily) {
        throw createAppError(
          'data',
          'Invalid weather data received from service',
          true
        )
      }

      const current = this.transformCurrentWeatherData(data.current)
      const forecast = this.transformForecastData(data.daily)
      
      // Cache the complete data
      cacheService.cacheWeatherData(lat, lon, current, forecast)
      
      return { current, forecast }
    } catch (error) {
      // Always re-throw errors - don't swallow them
      throw error
    }
  }

  /**
   * Validate latitude and longitude coordinates
   * @param lat - Latitude coordinate
   * @param lon - Longitude coordinate
   * @throws AppError if coordinates are invalid
   */
  private validateCoordinates(lat: number, lon: number): void {
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      throw createAppError(
        'user',
        'Invalid coordinates provided',
        false
      )
    }

    if (lat < -90 || lat > 90) {
      throw createAppError(
        'user',
        'Latitude must be between -90 and 90 degrees',
        false
      )
    }

    if (lon < -180 || lon > 180) {
      throw createAppError(
        'user',
        'Longitude must be between -180 and 180 degrees',
        false
      )
    }
  }

  /**
   * Build URL for current weather API request
   * @param lat - Latitude coordinate
   * @param lon - Longitude coordinate
   * @returns Complete API URL for current weather
   */
  private buildCurrentWeatherUrl(lat: number, lon: number): string {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: [
        'temperature_2m',
        'weather_code',
        'wind_speed_10m',
        'wind_direction_10m',
        'relative_humidity_2m'
      ].join(','),
      timezone: 'auto'
    })
    
    return `${this.baseUrl}?${params.toString()}`
  }

  /**
   * Build URL for forecast API request
   * @param lat - Latitude coordinate
   * @param lon - Longitude coordinate
   * @returns Complete API URL for forecast
   */
  private buildForecastUrl(lat: number, lon: number): string {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'weather_code',
        'precipitation_sum'
      ].join(','),
      forecast_days: this.forecastDays.toString(),
      timezone: 'auto'
    })
    
    return `${this.baseUrl}?${params.toString()}`
  }

  /**
   * Build URL for complete weather API request (current + forecast)
   * @param lat - Latitude coordinate
   * @param lon - Longitude coordinate
   * @returns Complete API URL for both current and forecast data
   */
  private buildCompleteWeatherUrl(lat: number, lon: number): string {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: [
        'temperature_2m',
        'weather_code',
        'wind_speed_10m',
        'wind_direction_10m',
        'relative_humidity_2m'
      ].join(','),
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'weather_code',
        'precipitation_sum'
      ].join(','),
      forecast_days: this.forecastDays.toString(),
      timezone: 'auto'
    })
    
    return `${this.baseUrl}?${params.toString()}`
  }

  /**
   * Transform API current weather data to application format
   * @param current - Raw current weather data from API
   * @returns Transformed current weather data
   */
  private transformCurrentWeatherData(current: WeatherResponse['current']): CurrentWeatherData {
    return {
      temperature: current.temperature_2m,
      weatherCode: current.weather_code,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      humidity: current.relative_humidity_2m,
      timestamp: this.parseTimestamp(current.time)
    }
  }

  /**
   * Transform API forecast data to application format
   * @param daily - Raw daily forecast data from API
   * @returns Array of transformed forecast data
   */
  private transformForecastData(daily: WeatherResponse['daily']): ForecastData[] {
    const { time, temperature_2m_max, temperature_2m_min, weather_code, precipitation_sum } = daily
    
    return time.map((dateStr, index) => ({
      date: this.parseTimestamp(dateStr),
      temperatureMax: temperature_2m_max[index],
      temperatureMin: temperature_2m_min[index],
      weatherCode: weather_code[index],
      precipitationSum: precipitation_sum[index]
    }))
  }

  /**
   * Parse timestamp string to Date object with timezone handling
   * @param timestamp - ISO timestamp string from API
   * @returns Date object in user's local timezone
   */
  private parseTimestamp(timestamp: string): Date {
    try {
      const date = new Date(timestamp)
      
      // Validate the parsed date
      if (isNaN(date.getTime())) {
        throw new Error('Invalid timestamp format')
      }
      
      return date
    } catch (error) {
      // Fallback to current time if timestamp parsing fails
      console.warn('Failed to parse timestamp:', timestamp, error)
      return new Date()
    }
  }
}

// Export a singleton instance for use throughout the application
export const weatherService = new WeatherService()