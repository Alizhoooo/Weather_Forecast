/**
 * Enhanced error handling utilities for comprehensive error management
 */
import type { AppError } from '@/types/error'
import { createAppError } from '@/types/error'

/**
 * Network connectivity checker
 */
export class NetworkChecker {
  private static instance: NetworkChecker
  private isOnline = navigator.onLine
  private listeners: Array<(online: boolean) => void> = []

  private constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true
      this.notifyListeners(true)
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.notifyListeners(false)
    })
  }

  static getInstance(): NetworkChecker {
    if (!NetworkChecker.instance) {
      NetworkChecker.instance = new NetworkChecker()
    }
    return NetworkChecker.instance
  }

  /**
   * Check if the browser is currently online
   */
  isNetworkOnline(): boolean {
    return this.isOnline
  }

  /**
   * Add listener for network status changes
   */
  addNetworkListener(callback: (online: boolean) => void): void {
    this.listeners.push(callback)
  }

  /**
   * Remove network status listener
   */
  removeNetworkListener(callback: (online: boolean) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback)
  }

  private notifyListeners(online: boolean): void {
    this.listeners.forEach(listener => listener(online))
  }

  /**
   * Test actual network connectivity by making a lightweight request
   */
  async testConnectivity(): Promise<boolean> {
    if (!this.isOnline) {
      return false
    }

    try {
      // Use a lightweight request to test actual connectivity
      const response = await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      })
      return true
    } catch {
      return false
    }
  }
}

/**
 * Retry configuration interface
 */
interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: string[]
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['network', 'api']
}

/**
 * Enhanced retry mechanism with exponential backoff
 */
export class RetryHandler {
  private config: RetryConfig

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config }
  }

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: AppError | Error | null = null
    const networkChecker = NetworkChecker.getInstance()

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        // Check network connectivity before attempting
        if (!networkChecker.isNetworkOnline()) {
          throw createAppError(
            'network',
            'No internet connection. Please check your network and try again.',
            true
          )
        }

        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Check if this is an AppError and if it's retryable
        if (error && typeof error === 'object' && 'type' in error) {
          const appError = error as AppError
          
          // Don't retry non-retryable errors
          if (!appError.retryable || !this.config.retryableErrors.includes(appError.type)) {
            throw appError
          }
          
          // Don't retry user errors
          if (appError.type === 'user') {
            throw appError
          }
        }

        // If this is the last attempt, throw the error
        if (attempt === this.config.maxAttempts) {
          if (error && typeof error === 'object' && 'type' in error) {
            throw error
          }
          
          throw createAppError(
            'api',
            `${operationName} failed after ${this.config.maxAttempts} attempts`,
            false,
            lastError
          )
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1),
          this.config.maxDelay
        )

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000

        console.warn(`${operationName} attempt ${attempt} failed, retrying in ${jitteredDelay}ms:`, error)
        
        await this.sleep(jitteredDelay)
      }
    }

    // This should never be reached, but TypeScript requires it
    throw createAppError(
      'api',
      `${operationName} failed unexpectedly`,
      false,
      lastError || undefined
    )
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * HTTP error analyzer to determine error types and appropriate responses
 */
export class HttpErrorAnalyzer {
  /**
   * Analyze HTTP response and create appropriate AppError
   */
  static analyzeHttpError(response: Response, context: string): AppError {
    const status = response.status

    switch (true) {
      case status === 429:
        return createAppError(
          'api',
          'Too many requests. Please wait a moment and try again.',
          true
        )

      case status >= 500 && status < 600:
        return createAppError(
          'api',
          `${context} service unavailable (${status})`,
          true
        )

      case status === 404:
        return createAppError(
          'api',
          `${context} service endpoint not found. This may be a temporary issue.`,
          true
        )

      case status === 403:
        return createAppError(
          'api',
          `Access to ${context.toLowerCase()} service is forbidden`,
          false
        )

      case status === 401:
        return createAppError(
          'api',
          `Authentication required for ${context} service.`,
          false
        )

      case status >= 400 && status < 500:
        return createAppError(
          'user',
          `Invalid request to ${context} service. Please check your input and try again.`,
          false
        )

      default:
        return createAppError(
          'api',
          `${context} service returned an unexpected error (${status}).`,
          true
        )
    }
  }

  /**
   * Analyze fetch error and create appropriate AppError
   */
  static analyzeFetchError(error: Error, context: string): AppError {
    const message = error.message.toLowerCase()

    // Network connectivity issues
    if (message.includes('failed to fetch') || 
        message.includes('network error') ||
        message.includes('networkerror')) {
      return createAppError(
        'network',
        `Unable to connect to ${context.toLowerCase()} service. Please check your internet connection.`,
        true,
        error
      )
    }

    // Timeout errors
    if (message.includes('timeout') || 
        message.includes('aborted') ||
        error.name === 'AbortError') {
      return createAppError(
        'network',
        `${context} service request timed out. Please try again.`,
        true,
        error
      )
    }

    // CORS errors
    if (message.includes('cors') || 
        message.includes('cross-origin')) {
      return createAppError(
        'api',
        `${context} service is not accessible due to security restrictions.`,
        false,
        error
      )
    }

    // DNS resolution errors
    if (message.includes('dns') || 
        message.includes('name resolution')) {
      return createAppError(
        'network',
        `Cannot reach ${context} service. Please check your internet connection.`,
        true,
        error
      )
    }

    // Generic network error
    return createAppError(
      'network',
      `Network error occurred while accessing ${context} service.`,
      true,
      error
    )
  }
}

/**
 * Rate limiting detector and handler
 */
export class RateLimitHandler {
  private static requestCounts = new Map<string, { count: number; resetTime: number }>()
  private static readonly RATE_LIMIT_WINDOW = 60000 // 1 minute
  private static readonly MAX_REQUESTS_PER_WINDOW = 60

  /**
   * Check if we're approaching rate limits for a service
   */
  static checkRateLimit(serviceKey: string): boolean {
    const now = Date.now()
    const current = this.requestCounts.get(serviceKey)

    if (!current || now > current.resetTime) {
      // Reset or initialize counter
      this.requestCounts.set(serviceKey, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW
      })
      return true
    }

    if (current.count >= this.MAX_REQUESTS_PER_WINDOW) {
      return false
    }

    current.count++
    return true
  }

  /**
   * Get time until rate limit resets
   */
  static getResetTime(serviceKey: string): number {
    const current = this.requestCounts.get(serviceKey)
    if (!current) return 0
    
    return Math.max(0, current.resetTime - Date.now())
  }

  /**
   * Handle rate limit exceeded scenario
   */
  static handleRateLimitExceeded(serviceKey: string): AppError {
    const resetTime = this.getResetTime(serviceKey)
    const resetMinutes = Math.ceil(resetTime / 60000)

    return createAppError(
      'api',
      `Rate limit exceeded. Please wait ${resetMinutes} minute${resetMinutes !== 1 ? 's' : ''} before trying again.`,
      true
    )
  }
}

/**
 * Offline scenario handler
 */
export class OfflineHandler {
  private static offlineQueue: Array<{
    operation: () => Promise<any>
    resolve: (value: any) => void
    reject: (error: any) => void
    context: string
  }> = []

  /**
   * Queue operation for when network comes back online
   */
  static queueForOnline<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.offlineQueue.push({
        operation,
        resolve,
        reject,
        context
      })

      // Set up listener for when network comes back
      const networkChecker = NetworkChecker.getInstance()
      const onlineHandler = (online: boolean) => {
        if (online) {
          this.processOfflineQueue()
          networkChecker.removeNetworkListener(onlineHandler)
        }
      }
      
      networkChecker.addNetworkListener(onlineHandler)
    })
  }

  /**
   * Process queued operations when network comes back online
   */
  private static async processOfflineQueue(): Promise<void> {
    const queue = [...this.offlineQueue]
    this.offlineQueue = []

    for (const item of queue) {
      try {
        const result = await item.operation()
        item.resolve(result)
      } catch (error) {
        item.reject(error)
      }
    }
  }

  /**
   * Create offline error with queue option
   */
  static createOfflineError(context: string): AppError {
    return createAppError(
      'network',
      `You are currently offline. ${context} will be attempted when your connection is restored.`,
      true
    )
  }
}

/**
 * Main error handler that coordinates all error handling strategies
 */
export class ErrorHandler {
  private retryHandler: RetryHandler
  private networkChecker: NetworkChecker

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryHandler = new RetryHandler(retryConfig)
    this.networkChecker = NetworkChecker.getInstance()
  }

  /**
   * Handle API request with comprehensive error handling
   */
  async handleApiRequest<T>(
    operation: () => Promise<T>,
    context: string,
    serviceKey: string
  ): Promise<T> {
    // Check if we're offline
    if (!this.networkChecker.isNetworkOnline()) {
      throw OfflineHandler.createOfflineError(context)
    }

    // Check rate limits
    if (!RateLimitHandler.checkRateLimit(serviceKey)) {
      throw RateLimitHandler.handleRateLimitExceeded(serviceKey)
    }

    // Execute with retry logic
    return this.retryHandler.executeWithRetry(operation, context)
  }

  /**
   * Handle fetch request with comprehensive error analysis
   */
  async handleFetch(
    url: string,
    options: RequestInit = {},
    context: string
  ): Promise<Response> {
    const operation = async (): Promise<Response> => {
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw HttpErrorAnalyzer.analyzeHttpError(response, context)
        }

        return response
      } catch (error) {
        if (error && typeof error === 'object' && 'type' in error) {
          throw error // Re-throw AppError instances
        }

        throw HttpErrorAnalyzer.analyzeFetchError(
          error instanceof Error ? error : new Error(String(error)),
          context
        )
      }
    }

    return this.handleApiRequest(operation, context, context.toLowerCase())
  }
}