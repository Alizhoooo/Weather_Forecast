import { test, expect } from '@playwright/test';

test.describe('Network Failure Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-content"]', { state: 'visible' });
  });

  test('handles offline state gracefully', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Try to search for a location
    const searchInput = page.locator('input[aria-label="Location search"]');
    await searchInput.fill('London');
    
    // Wait for error message to appear
    await page.waitForSelector('.global-error', { state: 'visible' });
    
    // Verify offline error message is displayed
    const errorMessage = page.locator('.global-error');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('offline');
    
    // Verify network status indicator appears
    const networkStatus = page.locator('.network-status.offline');
    await expect(networkStatus).toBeVisible();
    await expect(networkStatus).toContainText('offline');
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for network status to update
    await page.waitForTimeout(1000);
    
    // Verify offline indicator disappears
    await expect(networkStatus).not.toBeVisible();
    
    // Try search again - should work now
    await searchInput.fill('Paris');
    await page.waitForSelector('.location-results', { state: 'visible' });
    
    const locationResults = page.locator('.location-results');
    await expect(locationResults).toBeVisible();
  });

  test('handles API failures with retry functionality', async ({ page }) => {
    // Mock API to return error responses
    await page.route('**/search**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    // Try to search
    const searchInput = page.locator('input[aria-label="Location search"]');
    await searchInput.fill('London');
    
    // Wait for error message
    await page.waitForSelector('.global-error', { state: 'visible' });
    
    // Verify error message is displayed
    const errorMessage = page.locator('.global-error');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Failed to search');
    
    // Check for retry button
    const retryButton = page.locator('button:has-text("Try Again")');
    await expect(retryButton).toBeVisible();
    
    // Remove the mock to simulate API recovery
    await page.unroute('**/search**');
    
    // Click retry button
    await retryButton.click();
    
    // Verify error is cleared and search works
    await expect(errorMessage).not.toBeVisible();
  });

  test('handles weather API failures', async ({ page }) => {
    // Allow location search to work but mock weather API to fail
    await page.route('**/forecast**', (route) => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service Unavailable' })
      });
    });

    // Search and select a location
    const searchInput = page.locator('input[aria-label="Location search"]');
    await searchInput.fill('London');
    
    await page.waitForSelector('.location-results', { state: 'visible' });
    const firstLocation = page.locator('.location-item').first();
    await firstLocation.click();
    
    // Wait for weather error to appear
    await page.waitForSelector('.weather-display .error-message', { state: 'visible' });
    
    // Verify weather error is displayed
    const weatherError = page.locator('.weather-display .error-message');
    await expect(weatherError).toBeVisible();
    await expect(weatherError).toContainText('weather');
    
    // Check for retry button in weather section
    const weatherRetryButton = page.locator('.weather-display button:has-text("Try Again")');
    await expect(weatherRetryButton).toBeVisible();
    
    // Remove the mock
    await page.unroute('**/forecast**');
    
    // Click retry
    await weatherRetryButton.click();
    
    // Verify weather data loads successfully
    await page.waitForSelector('.current-weather', { state: 'visible' });
    await expect(page.locator('.current-weather')).toBeVisible();
  });

  test('handles rate limiting gracefully', async ({ page }) => {
    // Mock API to return rate limit error
    await page.route('**/search**', (route) => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Too Many Requests' })
      });
    });

    // Try to search
    const searchInput = page.locator('input[aria-label="Location search"]');
    await searchInput.fill('London');
    
    // Wait for rate limit error message
    await page.waitForSelector('.global-error', { state: 'visible' });
    
    // Verify appropriate rate limit message
    const errorMessage = page.locator('.global-error');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('try again later');
  });

  test('handles partial network failures', async ({ page }) => {
    let requestCount = 0;
    
    // Mock API to fail intermittently
    await page.route('**/search**', (route) => {
      requestCount++;
      if (requestCount <= 2) {
        // Fail first two requests
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server Error' })
        });
      } else {
        // Let subsequent requests through
        route.continue();
      }
    });

    // Try to search
    const searchInput = page.locator('input[aria-label="Location search"]');
    await searchInput.fill('London');
    
    // Wait for error
    await page.waitForSelector('.global-error', { state: 'visible' });
    
    // Retry
    const retryButton = page.locator('button:has-text("Try Again")');
    await retryButton.click();
    
    // Should still fail on second attempt
    await page.waitForSelector('.global-error', { state: 'visible' });
    
    // Retry again - should succeed on third attempt
    await retryButton.click();
    
    // Verify success
    await page.waitForSelector('.location-results', { state: 'visible' });
    await expect(page.locator('.location-results')).toBeVisible();
  });

  test('handles slow network connections', async ({ page }) => {
    // Simulate slow network by delaying responses
    await page.route('**/search**', async (route) => {
      // Delay response by 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
      route.continue();
    });

    // Start search
    const searchInput = page.locator('input[aria-label="Location search"]');
    await searchInput.fill('London');
    
    // Verify loading state is shown
    const searchSpinner = page.locator('.search-loading .spinner');
    await expect(searchSpinner).toBeVisible();
    
    // Wait for results to eventually load
    await page.waitForSelector('.location-results', { state: 'visible', timeout: 10000 });
    
    // Verify loading state is hidden
    await expect(searchSpinner).not.toBeVisible();
    
    // Verify results are displayed
    await expect(page.locator('.location-results')).toBeVisible();
  });

  test('handles malformed API responses', async ({ page }) => {
    // Mock API to return malformed JSON
    await page.route('**/search**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      });
    });

    // Try to search
    const searchInput = page.locator('input[aria-label="Location search"]');
    await searchInput.fill('London');
    
    // Wait for error message
    await page.waitForSelector('.global-error', { state: 'visible' });
    
    // Verify error handling for malformed response
    const errorMessage = page.locator('.global-error');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Failed to search');
  });

  test('handles CORS errors', async ({ page }) => {
    // Mock API to return CORS error
    await page.route('**/search**', (route) => {
      route.abort('failed');
    });

    // Try to search
    const searchInput = page.locator('input[aria-label="Location search"]');
    await searchInput.fill('London');
    
    // Wait for error message
    await page.waitForSelector('.global-error', { state: 'visible' });
    
    // Verify network error handling
    const errorMessage = page.locator('.global-error');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Failed to search');
  });

  test('maintains app state during network issues', async ({ page }) => {
    // First, successfully load weather data
    const searchInput = page.locator('input[aria-label="Location search"]');
    await searchInput.fill('London');
    
    await page.waitForSelector('.location-results', { state: 'visible' });
    const firstLocation = page.locator('.location-item').first();
    await firstLocation.click();
    
    await page.waitForSelector('.weather-display', { state: 'visible' });
    
    // Verify weather data is displayed
    await expect(page.locator('.current-weather')).toBeVisible();
    await expect(page.locator('.forecast-list')).toBeVisible();
    
    // Now simulate network failure for new searches
    await page.route('**/search**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server Error' })
      });
    });
    
    // Try to search for a new location
    await searchInput.fill('Paris');
    
    // Verify error appears but existing weather data remains
    await page.waitForSelector('.global-error', { state: 'visible' });
    await expect(page.locator('.global-error')).toBeVisible();
    
    // Verify existing weather data is still displayed
    await expect(page.locator('.weather-display')).toBeVisible();
    await expect(page.locator('.current-weather')).toBeVisible();
  });

  test('provides helpful error messages for different failure types', async ({ page }) => {
    const testCases = [
      {
        status: 400,
        expectedMessage: 'search',
        description: 'Bad Request'
      },
      {
        status: 404,
        expectedMessage: 'search',
        description: 'Not Found'
      },
      {
        status: 500,
        expectedMessage: 'search',
        description: 'Internal Server Error'
      },
      {
        status: 503,
        expectedMessage: 'temporarily unavailable',
        description: 'Service Unavailable'
      }
    ];

    for (const testCase of testCases) {
      // Mock API with specific error status
      await page.route('**/search**', (route) => {
        route.fulfill({
          status: testCase.status,
          contentType: 'application/json',
          body: JSON.stringify({ error: testCase.description })
        });
      });

      // Clear any existing errors
      const existingError = page.locator('.global-error');
      if (await existingError.isVisible()) {
        const closeButton = page.locator('.global-error button:has-text("×")');
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }

      // Try to search
      const searchInput = page.locator('input[aria-label="Location search"]');
      await searchInput.fill(`Test${testCase.status}`);
      
      // Wait for error message
      await page.waitForSelector('.global-error', { state: 'visible' });
      
      // Verify appropriate error message
      const errorMessage = page.locator('.global-error');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(testCase.expectedMessage);
      
      // Clean up route
      await page.unroute('**/search**');
    }
  });
});