import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CurrentWeather from '../CurrentWeather.vue'
import type { CurrentWeatherData } from '@/types/weather'

describe('CurrentWeather', () => {
  const mockCurrentWeather: CurrentWeatherData = {
    temperature: 22.5,
    weatherCode: 1,
    windSpeed: 15.3,
    windDirection: 225,
    humidity: 65,
    timestamp: new Date('2024-01-15T14:30:00Z')
  }

  it('renders current weather data correctly', () => {
    const wrapper = mount(CurrentWeather, {
      props: {
        currentWeather: mockCurrentWeather
      }
    })

    expect(wrapper.find('.current-weather').exists()).toBe(true)
    expect(wrapper.find('.weather-title').text()).toBe('Current Weather')
  })

  it('displays formatted temperature', () => {
    const wrapper = mount(CurrentWeather, {
      props: {
        currentWeather: mockCurrentWeather
      }
    })

    const temperature = wrapper.find('.temperature')
    expect(temperature.text()).toBe('23°C') // Rounded from 22.5
  })

  it('displays weather icon and description', () => {
    const wrapper = mount(CurrentWeather, {
      props: {
        currentWeather: mockCurrentWeather
      }
    })

    const icon = wrapper.find('.weather-icon')
    const description = wrapper.find('.weather-description')
    
    expect(icon.text()).toBe('🌤️') // Weather code 1 = Mainly clear
    expect(description.text()).toBe('Mainly clear')
  })

  it('displays formatted humidity', () => {
    const wrapper = mount(CurrentWeather, {
      props: {
        currentWeather: mockCurrentWeather
      }
    })

    const humidityValue = wrapper.find('.detail-item:first-child .detail-value')
    expect(humidityValue.text()).toContain('65%')
  })

  it('displays formatted wind speed and direction', () => {
    const wrapper = mount(CurrentWeather, {
      props: {
        currentWeather: mockCurrentWeather
      }
    })

    const windValue = wrapper.find('.detail-item:last-child .detail-value')
    expect(windValue.text()).toContain('15 km/h SW') // 225° = SW
  })

  it('displays formatted timestamp', () => {
    const wrapper = mount(CurrentWeather, {
      props: {
        currentWeather: mockCurrentWeather
      }
    })

    const timestamp = wrapper.find('.weather-timestamp')
    expect(timestamp.text()).toBeTruthy()
    // Note: Exact format depends on locale, so we just check it exists
  })

  it('does not render when currentWeather is null', () => {
    const wrapper = mount(CurrentWeather, {
      props: {
        currentWeather: null
      }
    })

    expect(wrapper.find('.current-weather').exists()).toBe(false)
  })

  describe('weather icon mapping', () => {
    const testCases = [
      { code: 0, icon: '☀️', description: 'Clear sky' },
      { code: 2, icon: '⛅', description: 'Partly cloudy' },
      { code: 3, icon: '☁️', description: 'Overcast' },
      { code: 45, icon: '🌫️', description: 'Fog' },
      { code: 61, icon: '🌧️', description: 'Slight rain' },
      { code: 71, icon: '🌨️', description: 'Slight snow fall' },
      { code: 95, icon: '⛈️', description: 'Thunderstorm' },
      { code: 999, icon: '🌤️', description: 'Unknown conditions' } // Unknown code
    ]

    testCases.forEach(({ code, icon, description }) => {
      it(`displays correct icon and description for weather code ${code}`, () => {
        const weatherData = { ...mockCurrentWeather, weatherCode: code }
        const wrapper = mount(CurrentWeather, {
          props: {
            currentWeather: weatherData
          }
        })

        expect(wrapper.find('.weather-icon').text()).toBe(icon)
        expect(wrapper.find('.weather-description').text()).toBe(description)
      })
    })
  })

  describe('wind direction mapping', () => {
    const testCases = [
      { degrees: 0, direction: 'N' },
      { degrees: 45, direction: 'NE' },
      { degrees: 90, direction: 'E' },
      { degrees: 135, direction: 'SE' },
      { degrees: 180, direction: 'S' },
      { degrees: 225, direction: 'SW' },
      { degrees: 270, direction: 'W' },
      { degrees: 315, direction: 'NW' },
      { degrees: 360, direction: 'N' } // Full circle
    ]

    testCases.forEach(({ degrees, direction }) => {
      it(`displays correct wind direction for ${degrees} degrees`, () => {
        const weatherData = { ...mockCurrentWeather, windDirection: degrees }
        const wrapper = mount(CurrentWeather, {
          props: {
            currentWeather: weatherData
          }
        })

        const windValue = wrapper.find('.detail-item:last-child .detail-value')
        expect(windValue.text()).toContain(direction)
      })
    })
  })

  describe('temperature formatting', () => {
    const testCases = [
      { temp: 22.4, expected: '22°C' },
      { temp: 22.5, expected: '23°C' },
      { temp: -5.3, expected: '-5°C' },
      { temp: 0, expected: '0°C' }
    ]

    testCases.forEach(({ temp, expected }) => {
      it(`formats temperature ${temp} as ${expected}`, () => {
        const weatherData = { ...mockCurrentWeather, temperature: temp }
        const wrapper = mount(CurrentWeather, {
          props: {
            currentWeather: weatherData
          }
        })

        expect(wrapper.find('.temperature').text()).toBe(expected)
      })
    })
  })

  describe('humidity formatting', () => {
    const testCases = [
      { humidity: 65.4, expected: '65%' },
      { humidity: 65.6, expected: '66%' },
      { humidity: 0, expected: '0%' },
      { humidity: 100, expected: '100%' }
    ]

    testCases.forEach(({ humidity, expected }) => {
      it(`formats humidity ${humidity} as ${expected}`, () => {
        const weatherData = { ...mockCurrentWeather, humidity }
        const wrapper = mount(CurrentWeather, {
          props: {
            currentWeather: weatherData
          }
        })

        const humidityValue = wrapper.find('.detail-item:first-child .detail-value')
        expect(humidityValue.text()).toContain(expected)
      })
    })
  })

  describe('wind speed formatting', () => {
    const testCases = [
      { speed: 15.3, expected: '15 km/h' },
      { speed: 15.6, expected: '16 km/h' },
      { speed: 0, expected: '0 km/h' }
    ]

    testCases.forEach(({ speed, expected }) => {
      it(`formats wind speed ${speed} as ${expected}`, () => {
        const weatherData = { ...mockCurrentWeather, windSpeed: speed }
        const wrapper = mount(CurrentWeather, {
          props: {
            currentWeather: weatherData
          }
        })

        const windValue = wrapper.find('.detail-item:last-child .detail-value')
        expect(windValue.text()).toContain(expected)
      })
    })
  })

  describe('accessibility', () => {
    it('has proper semantic structure', () => {
      const wrapper = mount(CurrentWeather, {
        props: {
          currentWeather: mockCurrentWeather
        }
      })

      expect(wrapper.find('h2.weather-title').exists()).toBe(true)
      expect(wrapper.findAll('.detail-item').length).toBe(2)
    })

    it('includes descriptive labels for weather details', () => {
      const wrapper = mount(CurrentWeather, {
        props: {
          currentWeather: mockCurrentWeather
        }
      })

      const labels = wrapper.findAll('.detail-label')
      expect(labels[0].text()).toBe('Humidity')
      expect(labels[1].text()).toBe('Wind')
    })
  })

  describe('responsive behavior', () => {
    it('applies responsive classes correctly', () => {
      const wrapper = mount(CurrentWeather, {
        props: {
          currentWeather: mockCurrentWeather
        }
      })

      // Check that the component has the expected structure for responsive design
      expect(wrapper.find('.weather-main').exists()).toBe(true)
      expect(wrapper.find('.temperature-section').exists()).toBe(true)
      expect(wrapper.find('.weather-details').exists()).toBe(true)
    })
  })
})