/**
 * Application error types for different error scenarios
 */
export type ErrorType = 'network' | 'api' | 'data' | 'user'

/**
 * Structured error interface for consistent error handling
 */
export interface AppError {
  type: ErrorType
  message: string
  retryable: boolean
  originalError?: Error
}

/**
 * Helper function to create standardized error objects
 */
export function createAppError(
  type: ErrorType,
  message: string,
  retryable: boolean = false,
  originalError?: Error
): AppError {
  return {
    type,
    message,
    retryable,
    originalError
  }
}