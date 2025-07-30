import type { Location, GeocodingResponse } from '@/types/location'
import { createAppError } from '@/types/error'
import { cacheService } from './CacheService'
import { ErrorHandler } from '@/utils/errorHandling'
import config from '@/config'

/**
 * Service for handling location search functionality
 * Integrates with Open-Meteo geocoding API
 */
export class LocationService {
  private readonly baseUrl = config.geocodingApiBaseUrl
  private readonly maxResults = config.maxLocationResults
  private readonly errorHandler = new ErrorHandler({
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 3000
  })

  /**
   * Search for locations by name using the geocoding API
   * @param query - The location search query
   * @returns Promise resolving to array of matching locations
   * @throws AppError for various error conditions
   */
  async searchLocations(query: string): Promise<Location[]> {
    // Input validation and sanitization
    const sanitizedQuery = this.sanitizeQuery(query)
    if (!this.isValidQuery(sanitizedQuery)) {
      throw createAppError(
        'user',
        'Please enter a valid location name (at least 2 characters)',
        false
      )
    }

    // Check cache first
    const cachedResults = cacheService.getCachedLocationSearch(sanitizedQuery)
    if (cachedResults !== null) {
      return cachedResults
    }

    try {
      const url = this.buildSearchUrl(sanitizedQuery)
      const response = await this.errorHandler.handleFetch(url, {}, 'Location search')

      const data: GeocodingResponse = await response.json()
      
      if (!data.results) {
        const emptyResults: Location[] = []
        // Cache empty results to avoid repeated API calls
        cacheService.cacheLocationSearch(sanitizedQuery, emptyResults)
        return emptyResults
      }

      // Validate and transform the response data
      const results = this.validateAndTransformResults(data.results)
      
      // Cache the results
      cacheService.cacheLocationSearch(sanitizedQuery, results)
      
      return results
    } catch (error) {
      // Always re-throw errors - don't swallow them
      throw error
    }
  }

  /**
   * Sanitize the search query to prevent injection attacks
   * @param query - Raw search query
   * @returns Sanitized query string
   */
  private sanitizeQuery(query: string): string {
    return query
      .trim()
      .replace(/[<>\"'&()\/]/g, '') // Remove potentially dangerous characters
      .substring(0, 100) // Limit length
  }

  /**
   * Validate that the query meets minimum requirements
   * @param query - Sanitized query string
   * @returns True if query is valid
   */
  private isValidQuery(query: string): boolean {
    return query.length >= 2 && query.length <= 100
  }

  /**
   * Build the search URL with proper parameters
   * @param query - Sanitized search query
   * @returns Complete API URL
   */
  private buildSearchUrl(query: string): string {
    const params = new URLSearchParams({
      name: query,
      count: this.maxResults.toString(),
      language: 'en',
      format: 'json'
    })
    
    return `${this.baseUrl}?${params.toString()}`
  }

  /**
   * Validate and transform API response data
   * @param results - Raw results from API
   * @returns Validated and transformed location array
   */
  private validateAndTransformResults(results: unknown[]): Location[] {
    return results
      .filter(this.isValidLocationResult)
      .slice(0, this.maxResults)
      .map(this.transformLocationResult)
  }

  /**
   * Check if a location result has all required fields
   * @param result - Raw location result from API
   * @returns True if result is valid
   */
  private isValidLocationResult(result: unknown): result is Record<string, unknown> {
    return (
      result !== null &&
      typeof result === 'object' &&
      result !== undefined &&
      'id' in result &&
      'name' in result &&
      'country' in result &&
      'latitude' in result &&
      'longitude' in result &&
      typeof (result as Record<string, unknown>).id === 'number' &&
      typeof (result as Record<string, unknown>).name === 'string' &&
      typeof (result as Record<string, unknown>).country === 'string' &&
      typeof (result as Record<string, unknown>).latitude === 'number' &&
      typeof (result as Record<string, unknown>).longitude === 'number' &&
      ((result as Record<string, unknown>).name as string).length > 0 &&
      ((result as Record<string, unknown>).country as string).length > 0
    )
  }

  /**
   * Transform API result to Location interface
   * @param result - Validated API result
   * @returns Location object
   */
  private transformLocationResult(result: Record<string, unknown>): Location {
    return {
      id: result.id as number,
      name: result.name as string,
      country: result.country as string,
      admin1: (result.admin1 as string) || undefined,
      latitude: result.latitude as number,
      longitude: result.longitude as number
    }
  }
}

// Export a singleton instance for use throughout the application
export const locationService = new LocationService()