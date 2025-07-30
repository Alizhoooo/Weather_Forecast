import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getUserTimezone,
  convertToUserTimezone,
  formatDate,
  formatTime,
  formatDateTime,
  formatForecastDate,
  isTimezoneSupported,
  getTimezoneLabel
} from '../timezone'

describe('Timezone Utilities', () => {
  // Mock console.warn to avoid noise in tests
  const originalConsoleWarn = console.warn
  beforeEach(() => {
    console.warn = vi.fn()
  })
  
  afterEach(() => {
    console.warn = originalConsoleWarn
    vi.restoreAllMocks()
  })

  describe('getUserTimezone', () => {
    it('should return user timezone when available', () => {
      const mockTimezone = 'America/New_York'
      vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
        timeZone: mockTimezone,
        locale: 'en-US',
        calendar: 'gregory',
        numberingSystem: 'latn'
      })

      const result = getUserTimezone()
      expect(result).toBe(mockTimezone)
    })

    it('should fallback to UTC when timezone is not available', () => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
        timeZone: '',
        locale: 'en-US',
        calendar: 'gregory',
        numberingSystem: 'latn'
      })

      const result = getUserTimezone()
      expect(result).toBe('UTC')
    })

    it('should fallback to UTC when Intl throws an error', () => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(() => {
        throw new Error('Intl not supported')
      })

      const result = getUserTimezone()
      expect(result).toBe('UTC')
      expect(console.warn).toHaveBeenCalled()
    })
  })

  describe('convertToUserTimezone', () => {
    it('should convert date to user timezone', () => {
      const testDate = new Date('2024-01-15T12:00:00Z')
      
      // Mock getUserTimezone to return a known timezone
      vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
        timeZone: 'America/New_York',
        locale: 'en-US',
        calendar: 'gregory',
        numberingSystem: 'latn'
      })

      const result = convertToUserTimezone(testDate)
      expect(result).toBeInstanceOf(Date)
      // The exact time will depend on DST, but it should be different from UTC
      expect(result.getTime()).not.toBe(testDate.getTime())
    })

    it('should use provided timezone override', () => {
      const testDate = new Date('2024-01-15T12:00:00Z')
      const result = convertToUserTimezone(testDate, 'UTC')
      
      // When converting to UTC, the time should remain the same
      expect(result.getTime()).toBe(testDate.getTime())
    })

    it('should return original date on conversion error', () => {
      const testDate = new Date('2024-01-15T12:00:00Z')
      
      // Mock getUserTimezone to throw an error
      vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(() => {
        throw new Error('Conversion error')
      })

      const result = convertToUserTimezone(testDate)
      expect(result.getTime()).toBe(testDate.getTime())
      expect(console.warn).toHaveBeenCalled()
    })
  })

  describe('formatDate', () => {
    it('should format date with default options', () => {
      const testDate = new Date('2024-01-15T12:00:00Z')
      const result = formatDate(testDate)
      
      expect(typeof result).toBe('string')
      expect(result).toMatch(/Jan|January/)
      expect(result).toMatch(/15/)
      expect(result).toMatch(/2024/)
    })

    it('should format date with custom options', () => {
      const testDate = new Date('2024-01-15T12:00:00Z')
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
      
      const result = formatDate(testDate, options)
      expect(typeof result).toBe('string')
      expect(result).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/)
      expect(result).toMatch(/January/)
    })

    it('should use provided timezone', () => {
      const testDate = new Date('2024-01-15T12:00:00Z')
      const result = formatDate(testDate, {}, 'UTC')
      
      expect(typeof result).toBe('string')
      expect(result).toMatch(/Jan|January/)
    })

    it('should fallback on formatting error', () => {
      const testDate = new Date('2024-01-15T12:00:00Z')
      
      // Mock Intl.DateTimeFormat constructor to throw an error
      const originalDateTimeFormat = Intl.DateTimeFormat
      vi.stubGlobal('Intl', {
        ...Intl,
        DateTimeFormat: vi.fn().mockImplementation(() => {
          throw new Error('Format error')
        })
      })

      const result = formatDate(testDate)
      expect(typeof result).toBe('string')
      expect(console.warn).toHaveBeenCalled()
      
      // Restore original
      vi.stubGlobal('Intl', { ...Intl, DateTimeFormat: originalDateTimeFormat })
    })
  })

  describe('formatTime', () => {
    it('should format time with default options', () => {
      const testDate = new Date('2024-01-15T14:30:00Z')
      const result = formatTime(testDate)
      
      expect(typeof result).toBe('string')
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it('should format time with custom options', () => {
      const testDate = new Date('2024-01-15T14:30:00Z')
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }
      
      const result = formatTime(testDate, options)
      expect(typeof result).toBe('string')
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/)
    })

    it('should fallback on formatting error', () => {
      const testDate = new Date('2024-01-15T14:30:00Z')
      
      // Mock Intl.DateTimeFormat constructor to throw an error
      const originalDateTimeFormat = Intl.DateTimeFormat
      vi.stubGlobal('Intl', {
        ...Intl,
        DateTimeFormat: vi.fn().mockImplementation(() => {
          throw new Error('Format error')
        })
      })

      const result = formatTime(testDate)
      expect(typeof result).toBe('string')
      expect(console.warn).toHaveBeenCalled()
      
      // Restore original
      vi.stubGlobal('Intl', { ...Intl, DateTimeFormat: originalDateTimeFormat })
    })
  })

  describe('formatDateTime', () => {
    it('should format date and time together', () => {
      const testDate = new Date('2024-01-15T14:30:00Z')
      const result = formatDateTime(testDate)
      
      expect(typeof result).toBe('string')
      expect(result).toMatch(/Jan|January/)
      expect(result).toMatch(/15/)
      expect(result).toMatch(/2024/)
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it('should format with custom options', () => {
      const testDate = new Date('2024-01-15T14:30:00Z')
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        hour12: false
      }
      
      const result = formatDateTime(testDate, options)
      expect(typeof result).toBe('string')
      expect(result).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/)
    })

    it('should fallback on formatting error', () => {
      const testDate = new Date('2024-01-15T14:30:00Z')
      
      // Mock Intl.DateTimeFormat constructor to throw an error
      const originalDateTimeFormat = Intl.DateTimeFormat
      vi.stubGlobal('Intl', {
        ...Intl,
        DateTimeFormat: vi.fn().mockImplementation(() => {
          throw new Error('Format error')
        })
      })

      const result = formatDateTime(testDate)
      expect(typeof result).toBe('string')
      expect(console.warn).toHaveBeenCalled()
      
      // Restore original
      vi.stubGlobal('Intl', { ...Intl, DateTimeFormat: originalDateTimeFormat })
    })
  })

  describe('formatForecastDate', () => {
    it('should format date for forecast display', () => {
      const testDate = new Date('2024-01-15T12:00:00Z')
      const result = formatForecastDate(testDate)
      
      expect(typeof result).toBe('string')
      expect(result).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/)
      expect(result).toMatch(/Jan|January/)
      expect(result).toMatch(/15/)
    })

    it('should use provided timezone', () => {
      const testDate = new Date('2024-01-15T12:00:00Z')
      const result = formatForecastDate(testDate, 'UTC')
      
      expect(typeof result).toBe('string')
      expect(result).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/)
    })

    it('should fallback on formatting error', () => {
      const testDate = new Date('2024-01-15T12:00:00Z')
      
      // Mock Intl.DateTimeFormat constructor to throw an error
      const originalDateTimeFormat = Intl.DateTimeFormat
      vi.stubGlobal('Intl', {
        ...Intl,
        DateTimeFormat: vi.fn().mockImplementation(() => {
          throw new Error('Format error')
        })
      })

      const result = formatForecastDate(testDate)
      expect(typeof result).toBe('string')
      expect(console.warn).toHaveBeenCalled()
      
      // Restore original
      vi.stubGlobal('Intl', { ...Intl, DateTimeFormat: originalDateTimeFormat })
    })
  })

  describe('isTimezoneSupported', () => {
    it('should return true when timezone is supported and not UTC', () => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
        timeZone: 'America/New_York',
        locale: 'en-US',
        calendar: 'gregory',
        numberingSystem: 'latn'
      })

      const result = isTimezoneSupported()
      expect(result).toBe(true)
    })

    it('should return false when timezone is UTC', () => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
        timeZone: 'UTC',
        locale: 'en-US',
        calendar: 'gregory',
        numberingSystem: 'latn'
      })

      const result = isTimezoneSupported()
      expect(result).toBe(false)
    })

    it('should return false when timezone is empty', () => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
        timeZone: '',
        locale: 'en-US',
        calendar: 'gregory',
        numberingSystem: 'latn'
      })

      const result = isTimezoneSupported()
      expect(result).toBe(false)
    })

    it('should return false when Intl throws an error', () => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(() => {
        throw new Error('Intl not supported')
      })

      const result = isTimezoneSupported()
      expect(result).toBe(false)
    })
  })

  describe('getTimezoneLabel', () => {
    it('should return UTC for UTC timezone', () => {
      const result = getTimezoneLabel('UTC')
      expect(result).toBe('UTC')
    })

    it('should return timezone abbreviation when available', () => {
      // Mock formatToParts to return timezone name
      vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts').mockReturnValue([
        { type: 'month', value: '1' },
        { type: 'literal', value: '/' },
        { type: 'day', value: '15' },
        { type: 'literal', value: '/' },
        { type: 'year', value: '2024' },
        { type: 'literal', value: ', ' },
        { type: 'hour', value: '12' },
        { type: 'literal', value: ':' },
        { type: 'minute', value: '00' },
        { type: 'literal', value: ' ' },
        { type: 'dayPeriod', value: 'PM' },
        { type: 'literal', value: ' ' },
        { type: 'timeZoneName', value: 'EST' }
      ])

      const result = getTimezoneLabel('America/New_York')
      expect(result).toBe('EST')
    })

    it('should return timezone identifier when abbreviation not available', () => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts').mockReturnValue([
        { type: 'month', value: '1' },
        { type: 'day', value: '15' },
        { type: 'year', value: '2024' }
      ])

      const result = getTimezoneLabel('America/New_York')
      expect(result).toBe('America/New_York')
    })

    it('should fallback to timezone identifier on error', () => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts').mockImplementation(() => {
        throw new Error('Format error')
      })

      const result = getTimezoneLabel('America/New_York')
      expect(result).toBe('America/New_York')
      expect(console.warn).toHaveBeenCalled()
    })

    it('should use user timezone when no timezone provided', () => {
      vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
        timeZone: 'America/Los_Angeles',
        locale: 'en-US',
        calendar: 'gregory',
        numberingSystem: 'latn'
      })

      vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts').mockReturnValue([
        { type: 'timeZoneName', value: 'PST' }
      ])

      const result = getTimezoneLabel()
      expect(result).toBe('PST')
    })
  })
})