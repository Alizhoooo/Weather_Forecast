/**
 * Location interface representing a geographic location
 * Used for location search results and selected locations
 */
export interface Location {
  id: number
  name: string
  country: string
  admin1?: string // State/province/region
  latitude: number
  longitude: number
}

/**
 * API response from the geocoding service
 */
export interface GeocodingResponse {
  results?: Location[]
}