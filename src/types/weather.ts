import type { Location } from './location'

/**
 * Current weather conditions data
 */
export interface CurrentWeatherData {
  temperature: number
  weatherCode: number
  windSpeed: number
  windDirection: number
  humidity: number
  timestamp: Date
}

/**
 * Daily forecast data for a single day
 */
export interface ForecastData {
  date: Date
  temperatureMax: number
  temperatureMin: number
  weatherCode: number
  precipitationSum: number
}

/**
 * Complete weather data including current conditions and forecast
 */
export interface WeatherData {
  current: CurrentWeatherData
  forecast: ForecastData[]
  location: Location
}

/**
 * Raw API response from the weather service
 */
export interface WeatherResponse {
  current: {
    time: string
    temperature_2m: number
    weather_code: number
    wind_speed_10m: number
    wind_direction_10m: number
    relative_humidity_2m: number
  }
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    weather_code: number[]
    precipitation_sum: number[]
  }
}