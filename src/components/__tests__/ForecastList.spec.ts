import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ForecastList from '../ForecastList.vue'
import type { ForecastData } from '@/types/weather'

describe('ForecastList', () => {
  const mockForecastData: ForecastData[] = [
    {
      date: new Date('2024-01-15T00:00:00Z'),
      temperatureMax: 25.5,
      temperatureMin: 15.2,
      weatherCode: 1,
      precipitationSum: 0
    },
    {
      date: new Date('2024-01-16T00:00:00Z'),
      temperatureMax: 22.8,
      temperatureMin: 12.4,
      weatherCode: 61,
      precipitationSum: 2.5
    },
    {
      date: new Date('2024-01-17T00:00:00Z'),
      temperatureMax: 18.3,
      temperatureMin: 8.7,
      weatherCode: 71,
      precipitationSum: 0
    },
    {
      date: new Date('2024-01-18T00:00:00Z'),
      temperatureMax: 20.1,
      temperatureMin: 10.5,
      weatherCode: 2,
      precipitationSum: 1.2
    },
    {
      date: new Date('2024-01-19T00:00:00Z'),
      temperatureMax: 24.7,
      temperatureMin: 14.8,
      weatherCode: 0,
      precipitationSum: 0
    },
    {
      date: new Date('2024-01-20T00:00:00Z'),
      temperatureMax: 27.2,
      temperatureMin: 16.9,
      weatherCode: 3,
      precipitationSum: 0
    },
    {
      date: new Date('2024-01-21T00:00:00Z'),
      temperatureMax: 23.4,
      temperatureMin: 13.1,
      weatherCode: 95,
      precipitationSum: 15.8
    }
  ]

  it('renders forecast list correctly', () => {
    const wrapper = mount(ForecastList, {
      props: {
        forecast: mockForecastData
      }
    })

    expect(wrapper.find('.forecast-list').exists()).toBe(true)
    expect(wrapper.find('.forecast-title').text()).toBe('7-Day Forecast')
  })

  it('displays all forecast items', () => {
    const wrapper = mount(ForecastList, {
      props: {
        forecast: mockForecastData
      }
    })

    const forecastItems = wrapper.findAll('.forecast-item')
    expect(forecastItems).toHaveLength(7)
  })

  it('marks first day as today', () => {
    const wrapper = mount(ForecastList, {
      props: {
        forecast: mockForecastData
      }
    })

    const firstItem = wrapper.find('.forecast-item')
    expect(firstItem.classes()).toContain('forecast-item--today')
    
    const dayName = firstItem.find('.day-name')
    expect(dayName.text()).toBe('Today')
  })

  it('displays correct day names for subsequent days', () => {
    const wrapper = mount(ForecastList, {
      props: {
        forecast: mockForecastData
      }
    })

    const forecastItems = wrapper.findAll('.forecast-item')
    
    // Check that subsequent days show weekday names (not "Today")
    for (let i = 1; i < forecastItems.length; i++) {
      const dayName = forecastItems[i].find('.day-name')
      expect(dayName.text()).not.toBe('Today')
      expect(dayName.text()).toBeTruthy()
    }
  })

  it('displays formatted temperatures correctly', () => {
    const wrapper = mount(ForecastList, {
      props: {
        forecast: mockForecastData
      }
    })

    const firstItem = wrapper.find('.forecast-item')
    const tempHigh = firstItem.find('.temp-high')
    const tempLow = firstItem.find('.temp-low')
    
    expect(tempHigh.text()).toBe('26°') // Rounded from 25.5
    expect(tempLow.text()).toBe('15°') // Rounded from 15.2
  })

  it('displays weather icons and descriptions', () => {
    const wrapper = mount(ForecastList, {
      props: {
        forecast: mockForecastData
      }
    })

    const firstItem = wrapper.find('.forecast-item')
    const icon = firstItem.find('.weather-icon')
    const description = firstItem.find('.weather-description')
    
    expect(icon.text()).toBe('🌤️') // Weather code 1 = Mainly clear
    expect(description.text()).toBe('Mostly clear')
  })

  it('displays precipitation when present', () => {
    const wrapper = mount(ForecastList, {
      props: {
        forecast: mockForecastData
      }
    })

    // Second item has precipitation
    const secondItem = wrapper.findAll('.forecast-item')[1]
    const precipitation = secondItem.find('.forecast-precipitation')
    
    expect(precipitation.exists()).toBe(true)
    expect(precipitation.text()).toContain('2.5mm')
  })

  it('hides precipitation when zero', () => {
    const wrapper = mount(ForecastList, {
      props: {
        forecast: mockForecastData
      }
    })

    // First item has no precipitation
    const firstItem = wrapper.find('.forecast-item')
    const precipitation = firstItem.find('.forecast-precipitation')
    
    expect(precipitation.exists()).toBe(false)
  })

  it('displays formatted dates', () => {
    const wrapper = mount(ForecastList, {
      props: {
        forecast: mockForecastData
      }
    })

    const forecastItems = wrapper.findAll('.forecast-item')
    
    forecastItems.forEach(item => {
      const dateText = item.find('.date-text')
      expect(dateText.text()).toBeTruthy()
      // Date format should be like "Jan 15" or similar
      expect(dateText.text()).toMatch(/\w{3}\s+\d{1,2}/)
    })
  })

  it('does not render when forecast is null', () => {
    const wrapper = mount(ForecastList, {
      props: {
        forecast: null
      }
    })

    expect(wrapper.find('.forecast-list').exists()).toBe(false)
  })

  it('does not render when forecast is empty', () => {
    const wrapper = mount(ForecastList, {
      props: {
        forecast: []
      }
    })

    expect(wrapper.find('.forecast-list').exists()).toBe(false)
  })

  describe('weather icon mapping', () => {
    const testCases = [
      { code: 0, icon: '☀️', description: 'Clear' },
      { code: 2, icon: '⛅', description: 'Partly cloudy' },
      { code: 3, icon: '☁️', description: 'Overcast' },
      { code: 45, icon: '🌫️', description: 'Fog' },
      { code: 61, icon: '🌧️', description: 'Light rain' },
      { code: 71, icon: '🌨️', description: 'Light snow' },
      { code: 95, icon: '⛈️', description: 'Thunderstorm' },
      { code: 999, icon: '🌤️', description: 'Unknown' } // Unknown code
    ]

    testCases.forEach(({ code, icon, description }) => {
      it(`displays correct icon and description for weather code ${code}`, () => {
        const forecastData = [{
          ...mockForecastData[0],
          weatherCode: code
        }]
        
        const wrapper = mount(ForecastList, {
          props: {
            forecast: forecastData
          }
        })

        expect(wrapper.find('.weather-icon').text()).toBe(icon)
        expect(wrapper.find('.weather-description').text()).toBe(description)
      })
    })
  })

  describe('temperature formatting', () => {
    const testCases = [
      { max: 22.4, min: 15.6, expectedMax: '22°', expectedMin: '16°' },
      { max: 22.5, min: 15.4, expectedMax: '23°', expectedMin: '15°' },
      { max: -5.3, min: -10.7, expectedMax: '-5°', expectedMin: '-11°' },
      { max: 0, min: -2, expectedMax: '0°', expectedMin: '-2°' }
    ]

    testCases.forEach(({ max, min, expectedMax, expectedMin }) => {
      it(`formats temperatures ${max}/${min} as ${expectedMax}/${expectedMin}`, () => {
        const forecastData = [{
          ...mockForecastData[0],
          temperatureMax: max,
          temperatureMin: min
        }]
        
        const wrapper = mount(ForecastList, {
          props: {
            forecast: forecastData
          }
        })

        expect(wrapper.find('.temp-high').text()).toBe(expectedMax)
        expect(wrapper.find('.temp-low').text()).toBe(expectedMin)
      })
    })
  })

  describe('precipitation formatting', () => {
    const testCases = [
      { precipitation: 0, shouldShow: false },
      { precipitation: 0.1, shouldShow: true, expected: '0.1mm' },
      { precipitation: 2.5, shouldShow: true, expected: '2.5mm' },
      { precipitation: 15.8, shouldShow: true, expected: '15.8mm' }
    ]

    testCases.forEach(({ precipitation, shouldShow, expected }) => {
      it(`handles precipitation ${precipitation}mm correctly`, () => {
        const forecastData = [{
          ...mockForecastData[0],
          precipitationSum: precipitation
        }]
        
        const wrapper = mount(ForecastList, {
          props: {
            forecast: forecastData
          }
        })

        const precipitationElement = wrapper.find('.forecast-precipitation')
        
        if (shouldShow) {
          expect(precipitationElement.exists()).toBe(true)
          expect(precipitationElement.text()).toContain(expected)
        } else {
          expect(precipitationElement.exists()).toBe(false)
        }
      })
    })
  })

  describe('date formatting with timezone consideration', () => {
    it('formats dates in user locale', () => {
      const wrapper = mount(ForecastList, {
        props: {
          forecast: mockForecastData
        }
      })

      const forecastItems = wrapper.findAll('.forecast-item')
      
      // Check that dates are formatted (exact format depends on locale)
      forecastItems.forEach(item => {
        const dateText = item.find('.date-text')
        expect(dateText.text()).toBeTruthy()
      })
    })

    it('handles different date objects correctly', () => {
      const testDates = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-06-15T12:00:00Z'),
        new Date('2024-12-31T23:59:59Z')
      ]

      testDates.forEach(date => {
        const forecastData = [{
          ...mockForecastData[0],
          date
        }]
        
        const wrapper = mount(ForecastList, {
          props: {
            forecast: forecastData
          }
        })

        const dateText = wrapper.find('.date-text')
        expect(dateText.text()).toBeTruthy()
      })
    })
  })

  describe('accessibility', () => {
    it('has proper semantic structure', () => {
      const wrapper = mount(ForecastList, {
        props: {
          forecast: mockForecastData
        }
      })

      expect(wrapper.find('h2.forecast-title').exists()).toBe(true)
      expect(wrapper.findAll('.forecast-item').length).toBe(7)
    })

    it('provides meaningful content for screen readers', () => {
      const wrapper = mount(ForecastList, {
        props: {
          forecast: mockForecastData
        }
      })

      const forecastItems = wrapper.findAll('.forecast-item')
      
      forecastItems.forEach(item => {
        expect(item.find('.day-name').text()).toBeTruthy()
        expect(item.find('.weather-description').text()).toBeTruthy()
        expect(item.find('.temp-high').text()).toBeTruthy()
        expect(item.find('.temp-low').text()).toBeTruthy()
      })
    })
  })

  describe('responsive behavior', () => {
    it('applies responsive classes correctly', () => {
      const wrapper = mount(ForecastList, {
        props: {
          forecast: mockForecastData
        }
      })

      // Check that the component has the expected structure for responsive design
      expect(wrapper.find('.forecast-items').exists()).toBe(true)
      expect(wrapper.findAll('.forecast-item').length).toBe(7)
    })

    it('maintains grid structure for responsive layout', () => {
      const wrapper = mount(ForecastList, {
        props: {
          forecast: mockForecastData
        }
      })

      const forecastItems = wrapper.findAll('.forecast-item')
      
      forecastItems.forEach(item => {
        expect(item.find('.forecast-date').exists()).toBe(true)
        expect(item.find('.forecast-weather').exists()).toBe(true)
        expect(item.find('.forecast-temperature').exists()).toBe(true)
      })
    })
  })

  describe('hover interactions', () => {
    it('applies hover classes correctly', () => {
      const wrapper = mount(ForecastList, {
        props: {
          forecast: mockForecastData
        }
      })

      const forecastItems = wrapper.findAll('.forecast-item')
      expect(forecastItems.length).toBeGreaterThan(0)
      
      // Check that items have the correct base classes for hover effects
      forecastItems.forEach(item => {
        expect(item.classes()).toContain('forecast-item')
      })
    })
  })

  describe('edge cases', () => {
    it('handles single day forecast', () => {
      const singleDayForecast = [mockForecastData[0]]
      
      const wrapper = mount(ForecastList, {
        props: {
          forecast: singleDayForecast
        }
      })

      expect(wrapper.find('.forecast-list').exists()).toBe(true)
      expect(wrapper.findAll('.forecast-item')).toHaveLength(1)
      expect(wrapper.find('.day-name').text()).toBe('Today')
    })

    it('handles extreme temperature values', () => {
      const extremeForecast = [{
        ...mockForecastData[0],
        temperatureMax: 50.7,
        temperatureMin: -40.3
      }]
      
      const wrapper = mount(ForecastList, {
        props: {
          forecast: extremeForecast
        }
      })

      expect(wrapper.find('.temp-high').text()).toBe('51°')
      expect(wrapper.find('.temp-low').text()).toBe('-40°')
    })

    it('handles high precipitation values', () => {
      const heavyRainForecast = [{
        ...mockForecastData[0],
        precipitationSum: 100.5
      }]
      
      const wrapper = mount(ForecastList, {
        props: {
          forecast: heavyRainForecast
        }
      })

      const precipitation = wrapper.find('.forecast-precipitation')
      expect(precipitation.exists()).toBe(true)
      expect(precipitation.text()).toContain('100.5mm')
    })
  })
})