import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      vue(),
      // Only include dev tools in development
      ...(command === 'serve' ? [vueDevTools()] : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    build: {
      // Generate sourcemaps based on environment variable
      sourcemap: env.VITE_BUILD_SOURCEMAP !== 'false',
      // Optimize bundle size
      minify: mode === 'production' ? 'terser' : false,
      ...(mode === 'production' && {
        terserOptions: {
          compress: {
            // Remove console logs in production
            drop_console: true,
            drop_debugger: true,
          },
        },
      }),
      // Chunk splitting strategy
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor chunk for third-party libraries
            vendor: ['vue', 'pinia'],
            // Services chunk for application services
            services: [
              './src/services/WeatherService.ts',
              './src/services/LocationService.ts',
              './src/services/CacheService.ts'
            ],
            // Utils chunk for utility functions
            utils: [
              './src/utils/errorHandling.ts',
              './src/utils/timezone.ts'
            ]
          },
          // Naming pattern for chunks
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
            if (facadeModuleId) {
              const name = facadeModuleId.split('/').pop()?.replace('.ts', '').replace('.vue', '')
              return `assets/${name}-[hash].js`
            }
            return 'assets/[name]-[hash].js'
          },
          // Naming pattern for entry files
          entryFileNames: 'assets/[name]-[hash].js',
          // Naming pattern for assets
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      // Target modern browsers for better optimization
      target: 'es2020',
      // Chunk size warning limit
      chunkSizeWarningLimit: 1000,
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['vue', 'pinia'],
      // Force pre-bundling of these dependencies
      force: mode === 'development'
    },
    // Server configuration for development
    server: {
      port: 3000,
      open: true,
      cors: true,
    },
    // Preview server configuration
    preview: {
      port: 4173,
      open: true,
    },
    // Environment variables prefix
    envPrefix: 'VITE_',
  }
})
