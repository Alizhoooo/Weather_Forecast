import { defineAsyncComponent, type AsyncComponentLoader } from 'vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ErrorMessage from '@/components/ErrorMessage.vue'

/**
 * Composable for creating lazy-loaded components with loading and error states
 */
export function useLazyComponents() {
  /**
   * Create a lazy-loaded component with loading and error handling
   * @param loader - Component loader function
   * @param options - Additional options for the async component
   */
  const createLazyComponent = (
    loader: AsyncComponentLoader,
    options: {
      loadingComponent?: any
      errorComponent?: any
      delay?: number
      timeout?: number
    } = {}
  ) => {
    return defineAsyncComponent({
      loader,
      loadingComponent: options.loadingComponent || LoadingSpinner,
      errorComponent: options.errorComponent || ErrorMessage,
      delay: options.delay || 200,
      timeout: options.timeout || 3000,
    })
  }

  // Lazy-loaded components for better performance
  const LazyWeatherDisplay = createLazyComponent(
    () => import('@/components/WeatherDisplay.vue')
  )

  const LazyLocationResults = createLazyComponent(
    () => import('@/components/LocationResults.vue')
  )

  const LazyCurrentWeather = createLazyComponent(
    () => import('@/components/CurrentWeather.vue')
  )

  const LazyForecastList = createLazyComponent(
    () => import('@/components/ForecastList.vue')
  )

  return {
    createLazyComponent,
    LazyWeatherDisplay,
    LazyLocationResults,
    LazyCurrentWeather,
    LazyForecastList,
  }
}

export default useLazyComponents