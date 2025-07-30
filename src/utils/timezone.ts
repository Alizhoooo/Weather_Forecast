/**
 * Timezone handling utilities for weather application
 * Provides functions for timezone conversion and locale-aware formatting
 */

/**
 * Get the user's timezone, with fallback to UTC
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch (error) {
    console.warn('Unable to determine user timezone, falling back to UTC:', error)
    return 'UTC'
  }
}

/**
 * Convert a date to the user's local timezone
 * @param date - The date to convert
 * @param timezone - Optional timezone override (defaults to user's timezone)
 * @returns Date object in the specified timezone
 */
export function convertToUserTimezone(date: Date, timezone?: string): Date {
  const targetTimezone = timezone || getUserTimezone()
  
  try {
    // For UTC timezone, return the original date
    if (targetTimezone === 'UTC') {
      return new Date(date.getTime())
    }
    
    // Create a new date in the target timezone
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000)
    const targetTime = new Date(utcTime + (getTimezoneOffset(targetTimezone) * 60000))
    return targetTime
  } catch (error) {
    console.warn('Error converting timezone, returning original date:', error)
    return date
  }
}

/**
 * Get timezone offset in minutes for a given timezone
 * @param timezone - The timezone identifier (e.g., 'America/New_York')
 * @returns Offset in minutes from UTC
 */
function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date()
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000))
    const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }))
    return (targetTime.getTime() - utc.getTime()) / 60000
  } catch (error) {
    console.warn('Error getting timezone offset, returning 0:', error)
    return 0
  }
}

/**
 * Format a date for display with locale-aware formatting
 * @param date - The date to format
 * @param options - Intl.DateTimeFormatOptions for customization
 * @param timezone - Optional timezone override
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {},
  timezone?: string
): string {
  const targetTimezone = timezone || getUserTimezone()
  
  try {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: targetTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    }
    
    return new Intl.DateTimeFormat(undefined, defaultOptions).format(date)
  } catch (error) {
    console.warn('Error formatting date, using fallback:', error)
    return date.toLocaleDateString()
  }
}

/**
 * Format a time for display with locale-aware formatting
 * @param date - The date/time to format
 * @param options - Intl.DateTimeFormatOptions for customization
 * @param timezone - Optional timezone override
 * @returns Formatted time string
 */
export function formatTime(
  date: Date,
  options: Intl.DateTimeFormatOptions = {},
  timezone?: string
): string {
  const targetTimezone = timezone || getUserTimezone()
  
  try {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: targetTimezone,
      hour: 'numeric',
      minute: '2-digit',
      ...options
    }
    
    return new Intl.DateTimeFormat(undefined, defaultOptions).format(date)
  } catch (error) {
    console.warn('Error formatting time, using fallback:', error)
    return date.toLocaleTimeString()
  }
}

/**
 * Format a date and time together with locale-aware formatting
 * @param date - The date/time to format
 * @param options - Intl.DateTimeFormatOptions for customization
 * @param timezone - Optional timezone override
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: Date,
  options: Intl.DateTimeFormatOptions = {},
  timezone?: string
): string {
  const targetTimezone = timezone || getUserTimezone()
  
  try {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: targetTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      ...options
    }
    
    return new Intl.DateTimeFormat(undefined, defaultOptions).format(date)
  } catch (error) {
    console.warn('Error formatting date/time, using fallback:', error)
    return date.toLocaleString()
  }
}

/**
 * Format a date for forecast display (typically just the day)
 * @param date - The date to format
 * @param timezone - Optional timezone override
 * @returns Formatted forecast date string
 */
export function formatForecastDate(date: Date, timezone?: string): string {
  const targetTimezone = timezone || getUserTimezone()
  
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: targetTimezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }
    
    return new Intl.DateTimeFormat(undefined, options).format(date)
  } catch (error) {
    console.warn('Error formatting forecast date, using fallback:', error)
    return date.toLocaleDateString()
  }
}

/**
 * Check if the user's timezone is available and supported
 * @returns boolean indicating if timezone detection is working
 */
export function isTimezoneSupported(): boolean {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return Boolean(timezone && timezone !== 'UTC')
  } catch (error) {
    return false
  }
}

/**
 * Get a human-readable timezone label for display
 * @param timezone - Optional timezone override
 * @returns Human-readable timezone string
 */
export function getTimezoneLabel(timezone?: string): string {
  const targetTimezone = timezone || getUserTimezone()
  
  if (targetTimezone === 'UTC') {
    return 'UTC'
  }
  
  try {
    // Get the timezone abbreviation
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: targetTimezone,
      timeZoneName: 'short'
    })
    
    const parts = formatter.formatToParts(new Date())
    const timeZonePart = parts.find(part => part.type === 'timeZoneName')
    
    return timeZonePart?.value || targetTimezone
  } catch (error) {
    console.warn('Error getting timezone label:', error)
    return targetTimezone
  }
}