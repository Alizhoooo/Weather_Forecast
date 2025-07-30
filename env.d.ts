/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEATHER_API_BASE_URL: string
  readonly VITE_GEOCODING_API_BASE_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_MAX_LOCATION_RESULTS: string
  readonly VITE_FORECAST_DAYS: string
  readonly VITE_CACHE_DURATION_MINUTES: string
  readonly VITE_BUILD_SOURCEMAP: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}