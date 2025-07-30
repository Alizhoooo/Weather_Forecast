/**
 * Performance monitoring utilities for the Weather Forecast App
 */

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  url?: string
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private isEnabled: boolean

  constructor() {
    this.isEnabled = !import.meta.env.PROD || import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true'
  }

  /**
   * Mark the start of a performance measurement
   */
  mark(name: string): void {
    if (!this.isEnabled) return
    
    try {
      performance.mark(`${name}-start`)
    } catch (error) {
      console.warn('Performance marking not supported:', error)
    }
  }

  /**
   * Measure the time between start and end marks
   */
  measure(name: string): number | null {
    if (!this.isEnabled) return null

    try {
      performance.mark(`${name}-end`)
      const measure = performance.measure(name, `${name}-start`, `${name}-end`)
      
      const metric: PerformanceMetric = {
        name,
        value: measure.duration,
        timestamp: Date.now(),
        url: window.location.href
      }
      
      this.metrics.push(metric)
      
      // Log in development
      if (import.meta.env.DEV) {
        console.log(`⚡ Performance: ${name} took ${measure.duration.toFixed(2)}ms`)
      }
      
      return measure.duration
    } catch (error) {
      console.warn('Performance measurement failed:', error)
      return null
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number): void {
    if (!this.isEnabled) return

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href
    }
    
    this.metrics.push(metric)
    
    if (import.meta.env.DEV) {
      console.log(`📊 Metric: ${name} = ${value}`)
    }
  }

  /**
   * Get Core Web Vitals
   */
  getCoreWebVitals(): Promise<void> {
    if (!this.isEnabled) return Promise.resolve()

    return new Promise((resolve) => {
      // Largest Contentful Paint (LCP)
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.recordMetric('LCP', lastEntry.startTime)
      }).observe({ entryTypes: ['largest-contentful-paint'] })

      // First Input Delay (FID)
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        entries.forEach((entry: any) => {
          this.recordMetric('FID', entry.processingStart - entry.startTime)
        })
      }).observe({ entryTypes: ['first-input'] })

      // Cumulative Layout Shift (CLS)
      let clsValue = 0
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        this.recordMetric('CLS', clsValue)
      }).observe({ entryTypes: ['layout-shift'] })

      resolve()
    })
  }

  /**
   * Monitor resource loading performance
   */
  monitorResources(): void {
    if (!this.isEnabled) return

    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      entries.forEach((entry: any) => {
        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
          this.recordMetric(`API-${entry.name}`, entry.duration)
        }
      })
    }).observe({ entryTypes: ['resource'] })
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = []
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2)
  }

  /**
   * Get performance summary
   */
  getSummary(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const summary: Record<string, { avg: number; min: number; max: number; count: number }> = {}
    
    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          avg: 0,
          min: metric.value,
          max: metric.value,
          count: 0
        }
      }
      
      const s = summary[metric.name]
      s.min = Math.min(s.min, metric.value)
      s.max = Math.max(s.max, metric.value)
      s.count++
      s.avg = (s.avg * (s.count - 1) + metric.value) / s.count
    })
    
    return summary
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Auto-start monitoring
if (typeof window !== 'undefined') {
  performanceMonitor.getCoreWebVitals()
  performanceMonitor.monitorResources()
}

export default performanceMonitor