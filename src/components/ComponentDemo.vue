<template>
  <div class="demo">
    <h2>Error Message Demo</h2>
    <ErrorMessage 
      :error="networkError" 
      @retry="handleRetry"
    />
    
    <ErrorMessage 
      :error="nonRetryableError" 
    />
    
    <h2>Loading Spinner Demo</h2>
    <LoadingSpinner />
    
    <LoadingSpinner 
      size="small" 
      message="Searching locations..." 
      inline 
    />
    
    <LoadingSpinner 
      size="large" 
      message="Loading weather data..." 
    />
  </div>
</template>

<script setup lang="ts">
import ErrorMessage from './ErrorMessage.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import type { AppError } from '../types/error'

const networkError: AppError = {
  type: 'network',
  message: 'Unable to connect to weather service. Please check your internet connection.',
  retryable: true
}

const nonRetryableError: AppError = {
  type: 'data',
  message: 'Invalid location data received from server.',
  retryable: false
}

const handleRetry = () => {
  console.log('Retry clicked')
}
</script>

<style scoped>
.demo {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

h2 {
  margin: 20px 0 10px 0;
  color: #333;
}
</style>