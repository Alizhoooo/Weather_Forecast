import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  NetworkChecker,
  RetryHandler,
  HttpErrorAnalyzer,
  RateLimitHandler,
  OfflineHandler,
  ErrorHandler
} from '../errorHandling'
import { createAppError } from '@/types/error'

// Mock fetch globally
global.fetch = vi.fn()

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

// Mock window events
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener
})
Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener
})

describe('NetworkChecker', () => {
  let networkChecker: NetworkChecker

  beforeEach(() => {
    vi.clearAllMocks()
      // Reset singleton
      ; (NetworkChecker as any).instance = undefined
    // Ensure we start with online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
    networkChecker = NetworkChecker.getInstance()
  })

  it('should return singleton instance', () => {
    const instance1 = NetworkChecker.getInstance()
    const instance2 = NetworkChecker.getInstance()
    expect(instance1).toBe(instance2)
  })

  it('should detect online status', () => {
    // Reset singleton to pick up new navigator.onLine value
    ; (NetworkChecker as any).instance = undefined
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
    const onlineChecker = NetworkChecker.getInstance()
    expect(onlineChecker.isNetworkOnline()).toBe(true)

      ; (NetworkChecker as any).instance = undefined
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })
    const offlineChecker = NetworkChecker.getInstance()
    expect(offlineChecker.isNetworkOnline()).toBe(false)
  })

  it('should add and remove network listeners', () => {
    const listener = vi.fn()

    networkChecker.addNetworkListener(listener)
    networkChecker.removeNetworkListener(listener)

    expect(listener).not.toHaveBeenCalled()
  })

  it('should test connectivity with fetch', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(new Response('', { status: 200 }))

    const result = await networkChecker.testConnectivity()
    expect(result).toBe(true)
  })

  it('should handle connectivity test failure', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await networkChecker.testConnectivity()
    expect(result).toBe(false)
  })
})

describe('RetryHandler', () => {
  let retryHandler: RetryHandler

  beforeEach(() => {
    retryHandler = new RetryHandler({
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 1000
    })
    vi.useFakeTimers()
    // Ensure we're online for retry tests
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
      // Reset NetworkChecker singleton
      ; (NetworkChecker as any).instance = undefined
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success')

    const result = await retryHandler.executeWithRetry(operation, 'test')

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should retry on retryable errors', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(createAppError('api', 'API error', true))
      .mockResolvedValueOnce('success')

    const promise = retryHandler.executeWithRetry(operation, 'test')

    // Fast-forward timers to trigger retry
    await vi.runAllTimersAsync()

    const result = await promise
    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('should not retry non-retryable errors', async () => {
    const error = createAppError('user', 'User error', false)
    const operation = vi.fn().mockRejectedValue(error)

    await expect(retryHandler.executeWithRetry(operation, 'test')).rejects.toThrow()
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should fail after max attempts', async () => {
    const error = createAppError('api', 'API error', true)
    const operation = vi.fn().mockRejectedValue(error)

    const promise = retryHandler.executeWithRetry(operation, 'test')

    // Fast-forward all timers
    await vi.runAllTimersAsync()

    await expect(promise).rejects.toThrow()
    expect(operation).toHaveBeenCalledTimes(3)
  })
})

describe('HttpErrorAnalyzer', () => {
  it('should analyze 429 rate limit error', () => {
    const response = new Response('', { status: 429 })
    const error = HttpErrorAnalyzer.analyzeHttpError(response, 'Test')

    expect(error.type).toBe('api')
    expect(error.message).toContain('Too many requests')
    expect(error.retryable).toBe(true)
  })

  it('should analyze 500 server error', () => {
    const response = new Response('', { status: 500 })
    const error = HttpErrorAnalyzer.analyzeHttpError(response, 'Test')

    expect(error.type).toBe('api')
    expect(error.message).toContain('temporarily unavailable')
    expect(error.retryable).toBe(true)
  })

  it('should analyze 404 not found error', () => {
    const response = new Response('', { status: 404 })
    const error = HttpErrorAnalyzer.analyzeHttpError(response, 'Test')

    expect(error.type).toBe('api')
    expect(error.message).toContain('not found')
    expect(error.retryable).toBe(true)
  })

  it('should analyze 403 forbidden error', () => {
    const response = new Response('', { status: 403 })
    const error = HttpErrorAnalyzer.analyzeHttpError(response, 'Test')

    expect(error.type).toBe('api')
    expect(error.message).toContain('forbidden')
    expect(error.retryable).toBe(false)
  })

  it('should analyze network fetch error', () => {
    const fetchError = new Error('Failed to fetch')
    const error = HttpErrorAnalyzer.analyzeFetchError(fetchError, 'Test')

    expect(error.type).toBe('network')
    expect(error.message).toContain('check your internet connection')
    expect(error.retryable).toBe(true)
  })

  it('should analyze timeout error', () => {
    const timeoutError = new Error('Request timeout')
    const error = HttpErrorAnalyzer.analyzeFetchError(timeoutError, 'Test')

    expect(error.type).toBe('network')
    expect(error.message).toContain('timed out')
    expect(error.retryable).toBe(true)
  })

  it('should analyze CORS error', () => {
    const corsError = new Error('CORS policy error')
    const error = HttpErrorAnalyzer.analyzeFetchError(corsError, 'Test')

    expect(error.type).toBe('api')
    expect(error.message).toContain('security restrictions')
    expect(error.retryable).toBe(false)
  })
})

describe('RateLimitHandler', () => {
  beforeEach(() => {
    // Clear static state
    ; (RateLimitHandler as any).requestCounts.clear()
  })

  it('should allow requests within rate limit', () => {
    const result = RateLimitHandler.checkRateLimit('test-service')
    expect(result).toBe(true)
  })

  it('should block requests exceeding rate limit', () => {
    // Simulate exceeding rate limit
    for (let i = 0; i < 61; i++) {
      RateLimitHandler.checkRateLimit('test-service')
    }

    const result = RateLimitHandler.checkRateLimit('test-service')
    expect(result).toBe(false)
  })

  it('should reset rate limit after window', () => {
    vi.useFakeTimers()

    // Exceed rate limit
    for (let i = 0; i < 61; i++) {
      RateLimitHandler.checkRateLimit('test-service')
    }

    expect(RateLimitHandler.checkRateLimit('test-service')).toBe(false)

    // Fast-forward past rate limit window
    vi.advanceTimersByTime(61000)

    expect(RateLimitHandler.checkRateLimit('test-service')).toBe(true)

    vi.useRealTimers()
  })

  it('should handle rate limit exceeded error', () => {
    const error = RateLimitHandler.handleRateLimitExceeded('test-service')

    expect(error.type).toBe('api')
    expect(error.message).toContain('Rate limit exceeded')
    expect(error.retryable).toBe(true)
  })
})

describe('OfflineHandler', () => {
  it('should create offline error', () => {
    const error = OfflineHandler.createOfflineError('Test operation')

    expect(error.type).toBe('network')
    expect(error.message).toContain('offline')
    expect(error.retryable).toBe(true)
  })

  it('should queue operations for when online', async () => {
    const operation = vi.fn().mockResolvedValue('success')

    // This would normally wait for network to come back online
    // For testing, we'll just verify the queue mechanism
    const promise = OfflineHandler.queueForOnline(operation, 'test')

      // Simulate network coming back online by processing queue
      ; (OfflineHandler as any).processOfflineQueue()

    // The operation should be queued but not executed yet in this test
    expect(operation).not.toHaveBeenCalled()
  })
})

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler

  beforeEach(() => {
    errorHandler = new ErrorHandler()
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should handle successful API request', async () => {
    const operation = vi.fn().mockResolvedValue('success')

    const result = await errorHandler.handleApiRequest(operation, 'test', 'test-service')

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should handle offline scenario', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })
    const operation = vi.fn().mockResolvedValue('success')

    await expect(
      errorHandler.handleApiRequest(operation, 'test', 'test-service')
    ).rejects.toThrow('offline')
  })

  it('should handle successful fetch request', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(new Response('{"data": "test"}', { status: 200 }))

    const response = await errorHandler.handleFetch('https://api.test.com', {}, 'Test')

    expect(response.status).toBe(200)
  })

  it('should handle fetch error with retry', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(new Response('{"data": "test"}', { status: 200 }))

    const promise = errorHandler.handleFetch('https://api.test.com', {}, 'Test')

    // Fast-forward timers to trigger retry
    await vi.runAllTimersAsync()

    const response = await promise
    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should handle HTTP error responses', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(new Response('', { status: 500 }))

    await expect(
      errorHandler.handleFetch('https://api.test.com', {}, 'Test')
    ).rejects.toThrow('temporarily unavailable')
  })

  it('should add timeout to fetch requests', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockImplementation(() => new Promise(() => { })) // Never resolves

    const promise = errorHandler.handleFetch('https://api.test.com', {}, 'Test')

    // Fast-forward past timeout
    vi.advanceTimersByTime(31000)

    await expect(promise).rejects.toThrow()
  })
})