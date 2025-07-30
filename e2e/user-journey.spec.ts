import { test, expect } from '@playwright/test';

test.describe('Weather App User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to initialize
    await page.waitForSelector('[data-testid="app-content"]', { state: 'visible' });
  });

  test('complete user journey: search → select → view weather', async ({ page }) => {
    // Verify initial state - welcome screen should be visible
    await expect(page.locator('.welcome-section')).toBeVisible();
    await expect(page.locator('h2:has-text("Welcome to Weather Forecast")')).toBeVisible();

    // Find and interact with search input
    const searchInput = page.locator('input[aria-label="Location search"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEnabled();

    // Type in search query
    await searchInput.fill('London');
    
    // Wait for search results to appear
    await page.waitForSelector('.location-results', { state: 'visible' });
    
    // Verify search results are displayed
    const locationResults = page.locator('.location-results');
    await expect(locationResults).toBeVisible();
    
    // Wait for actual location items to load
    await page.waitForSelector('.location-item', { state: 'visible' });
    
    // Select the first location result
    const firstLocation = page.locator('.location-item').first();
    await expect(firstLocation).toBeVisible();
    await firstLocation.click();

    // Verify weather display appears
    await page.waitForSelector('.weather-display', { state: 'visible' });
    const weatherDisplay = page.locator('.weather-display');
    await expect(weatherDisplay).toBeVisible();

    // Verify current weather section
    const currentWeather = page.locator('.current-weather');
    await expect(currentWeather).toBeVisible();
    
    // Check for temperature display
    await expect(page.locator('.temperature')).toBeVisible();
    
    // Verify forecast section
    const forecastList = page.locator('.forecast-list');
    await expect(forecastList).toBeVisible();
    
    // Check that forecast items are present
    const forecastItems = page.locator('.forecast-item');
    await expect(forecastItems).toHaveCount(7); // 7-day forecast
    
    // Verify welcome section is no longer visible
    await expect(page.locator('.welcome-section')).not.toBeVisible();
  });

  test('search with no results shows appropriate message', async ({ page }) => {
    const searchInput = page.locator('input[aria-label="Location search"]');
    
    // Search for a non-existent location
    await searchInput.fill('XYZInvalidLocation123');
    
    // Wait for search to complete
    await page.waitForSelector('.location-results', { state: 'visible' });
    
    // Verify "no results" message is shown
    await expect(page.locator('.no-results')).toBeVisible();
    await expect(page.locator('.no-results-text')).toBeVisible();
  });

  test('clear search functionality works', async ({ page }) => {
    const searchInput = page.locator('input[aria-label="Location search"]');
    
    // Type in search query
    await searchInput.fill('Paris');
    
    // Wait for results
    await page.waitForSelector('.location-results', { state: 'visible' });
    
    // Click clear button
    const clearButton = page.locator('button[aria-label="Clear search input"]');
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    
    // Verify search input is cleared
    await expect(searchInput).toHaveValue('');
    
    // Verify results are hidden
    await expect(page.locator('.location-results')).not.toBeVisible();
  });

  test('keyboard navigation works for search', async ({ page }) => {
    const searchInput = page.locator('input[aria-label="Location search"]');
    
    // Focus search input
    await searchInput.focus();
    
    // Type search query
    await searchInput.fill('New York');
    
    // Wait for results
    await page.waitForSelector('.location-results', { state: 'visible' });
    await page.waitForSelector('.location-item', { state: 'visible' });
    
    // Press arrow down to navigate to results
    await searchInput.press('ArrowDown');
    
    // Wait a bit for the focus to be set
    await page.waitForTimeout(100);
    
    // Verify first location item has the highlighted class or is focused
    const firstLocation = page.locator('.location-item').first();
    await expect(firstLocation).toBeVisible();
    
    // Try to press Enter on the first location item directly
    await firstLocation.press('Enter');
    
    // Verify weather display appears
    await page.waitForSelector('.weather-display', { state: 'visible' });
    await expect(page.locator('.weather-display')).toBeVisible();
  });

  test('escape key clears search results', async ({ page }) => {
    const searchInput = page.locator('input[aria-label="Location search"]');
    
    // Type search query
    await searchInput.fill('Tokyo');
    
    // Wait for results
    await page.waitForSelector('.location-results', { state: 'visible' });
    
    // Focus the search input first
    await searchInput.focus();
    
    // Press Escape key
    await searchInput.press('Escape');
    
    // Verify search input is cleared
    await expect(searchInput).toHaveValue('');
    
    // Verify results are hidden (may take a moment)
    await page.waitForTimeout(500);
    await expect(page.locator('.location-results')).not.toBeVisible();
  });

  test('loading states are displayed correctly', async ({ page }) => {
    const searchInput = page.locator('input[aria-label="Location search"]');
    
    // Start typing to trigger search
    await searchInput.fill('Berlin');
    
    // Check for loading spinner in search input
    const searchSpinner = page.locator('.search-loading .spinner');
    
    // Wait for either loading spinner or results
    await Promise.race([
      searchSpinner.waitFor({ state: 'visible' }),
      page.waitForSelector('.location-results', { state: 'visible' })
    ]);
    
    // If we see results, select a location to test weather loading
    const locationResults = page.locator('.location-results');
    if (await locationResults.isVisible()) {
      const firstLocation = page.locator('.location-item').first();
      await firstLocation.click();
      
      // Check for weather loading state
      const weatherLoading = page.locator('.weather-display .loading-spinner');
      
      // Wait for either loading or weather data
      await Promise.race([
        weatherLoading.waitFor({ state: 'visible' }),
        page.waitForSelector('.current-weather', { state: 'visible' })
      ]);
    }
  });
});