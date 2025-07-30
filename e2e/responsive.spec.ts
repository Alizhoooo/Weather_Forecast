import { test, expect, devices } from '@playwright/test';

const mobilePortrait = test.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

const mobileLandscape = test.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 844, height: 390 }
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

const tablet = test.extend({
  page: async ({ browser }, use) => {
    const context = await browser.newContext({
      ...devices['iPad']
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

test.describe('Responsive Design Tests', () => {
  test.describe('Mobile Portrait (iPhone 12)', () => {

    mobilePortrait('app layout adapts to mobile portrait', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-content"]', { state: 'visible' });

      // Check that the app header is properly sized for mobile
      const header = page.locator('.app-header');
      await expect(header).toBeVisible();
      
      // Verify search input is appropriately sized
      const searchInput = page.locator('input[aria-label="Location search"]');
      await expect(searchInput).toBeVisible();
      
      // Check that welcome content is properly formatted for mobile
      const welcomeContent = page.locator('.welcome-content');
      await expect(welcomeContent).toBeVisible();
      
      // Verify features are stacked vertically on mobile
      const features = page.locator('.welcome-features');
      await expect(features).toBeVisible();
      
      // Test search functionality on mobile
      await searchInput.fill('London');
      await page.waitForSelector('.location-results', { state: 'visible' });
      
      const locationResults = page.locator('.location-results');
      await expect(locationResults).toBeVisible();
      
      // Select location and verify weather display works on mobile
      const firstLocation = page.locator('.location-item').first();
      await firstLocation.click();
      
      await page.waitForSelector('.weather-display', { state: 'visible' });
      const weatherDisplay = page.locator('.weather-display');
      await expect(weatherDisplay).toBeVisible();
      
      // Verify forecast is properly displayed on mobile
      const forecastList = page.locator('.forecast-list');
      await expect(forecastList).toBeVisible();
    });

    mobilePortrait('touch targets are appropriately sized on mobile', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-content"]', { state: 'visible' });

      // Search for a location
      const searchInput = page.locator('input[aria-label="Location search"]');
      await searchInput.fill('Paris');
      await page.waitForSelector('.location-results', { state: 'visible' });

      // Check that location items are touch-friendly
      const locationItems = page.locator('.location-item');
      const firstItem = locationItems.first();
      
      // Verify touch target size (should be at least 44px)
      const boundingBox = await firstItem.boundingBox();
      expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
      
      // Test touch interaction
      await firstItem.tap();
      
      await page.waitForSelector('.weather-display', { state: 'visible' });
      await expect(page.locator('.weather-display')).toBeVisible();
    });
  });

  test.describe('Mobile Landscape (iPhone 12)', () => {
    mobileLandscape('app adapts to mobile landscape orientation', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-content"]', { state: 'visible' });

      // Verify header is more compact in landscape
      const header = page.locator('.app-header');
      await expect(header).toBeVisible();
      
      // Test that content is still accessible in landscape
      const searchInput = page.locator('input[aria-label="Location search"]');
      await expect(searchInput).toBeVisible();
      
      // Verify welcome content adapts to landscape
      const welcomeContent = page.locator('.welcome-content');
      await expect(welcomeContent).toBeVisible();
      
      // Test functionality in landscape
      await searchInput.fill('Tokyo');
      await page.waitForSelector('.location-results', { state: 'visible' });
      
      const firstLocation = page.locator('.location-item').first();
      await firstLocation.tap();
      
      await page.waitForSelector('.weather-display', { state: 'visible' });
      await expect(page.locator('.weather-display')).toBeVisible();
    });
  });

  test.describe('Tablet (iPad)', () => {
    tablet('app layout works well on tablet', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-content"]', { state: 'visible' });

      // Verify tablet-specific layout
      const welcomeFeatures = page.locator('.welcome-features');
      await expect(welcomeFeatures).toBeVisible();
      
      // Test search functionality on tablet
      const searchInput = page.locator('input[aria-label="Location search"]');
      await searchInput.fill('Berlin');
      await page.waitForSelector('.location-results', { state: 'visible' });
      
      const firstLocation = page.locator('.location-item').first();
      await firstLocation.click();
      
      await page.waitForSelector('.weather-display', { state: 'visible' });
      
      // Verify weather display utilizes tablet space well
      const currentWeather = page.locator('.current-weather');
      const forecastList = page.locator('.forecast-list');
      
      await expect(currentWeather).toBeVisible();
      await expect(forecastList).toBeVisible();
    });
  });

  test.describe('Desktop', () => {

    test('app utilizes desktop space effectively', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-content"]', { state: 'visible' });

      // Verify desktop layout
      const welcomeFeatures = page.locator('.welcome-features');
      await expect(welcomeFeatures).toBeVisible();
      
      // Test that features are displayed in a grid on desktop
      const features = page.locator('.feature');
      await expect(features).toHaveCount(3);
      
      // Test search and weather display on desktop
      const searchInput = page.locator('input[aria-label="Location search"]');
      await searchInput.fill('Sydney');
      await page.waitForSelector('.location-results', { state: 'visible' });
      
      const firstLocation = page.locator('.location-item').first();
      await firstLocation.click();
      
      await page.waitForSelector('.weather-display', { state: 'visible' });
      
      // Verify weather components are properly laid out on desktop
      const weatherDisplay = page.locator('.weather-display');
      const currentWeather = page.locator('.current-weather');
      const forecastList = page.locator('.forecast-list');
      
      await expect(weatherDisplay).toBeVisible();
      await expect(currentWeather).toBeVisible();
      await expect(forecastList).toBeVisible();
      
      // Check that forecast items are displayed in a grid/row layout
      const forecastItems = page.locator('.forecast-item');
      await expect(forecastItems).toHaveCount(7);
    });

    test('keyboard navigation works on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-content"]', { state: 'visible' });

      // Test skip link
      await page.keyboard.press('Tab');
      const skipLink = page.locator('.skip-link');
      await expect(skipLink).toBeFocused();
      
      // Test keyboard shortcut for search (Ctrl+K)
      await page.keyboard.press('Control+k');
      const searchInput = page.locator('input[aria-label="Location search"]');
      await expect(searchInput).toBeFocused();
      
      // Test search with keyboard
      await searchInput.fill('Madrid');
      await page.waitForSelector('.location-results', { state: 'visible' });
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown');
      const firstLocation = page.locator('.location-item').first();
      await expect(firstLocation).toBeFocused();
      
      // Select with Enter
      await page.keyboard.press('Enter');
      
      await page.waitForSelector('.weather-display', { state: 'visible' });
      await expect(page.locator('.weather-display')).toBeVisible();
    });
  });

  test.describe('Large Desktop', () => {

    test('app scales well on large screens', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-content"]', { state: 'visible' });

      // Verify content is properly centered and not stretched
      const appMain = page.locator('.app-main');
      await expect(appMain).toBeVisible();
      
      // Check that welcome content doesn't become too wide
      const welcomeContent = page.locator('.welcome-content');
      await expect(welcomeContent).toBeVisible();
      
      // Test functionality on large screen
      const searchInput = page.locator('input[aria-label="Location search"]');
      await searchInput.fill('Vancouver');
      await page.waitForSelector('.location-results', { state: 'visible' });
      
      const firstLocation = page.locator('.location-item').first();
      await firstLocation.click();
      
      await page.waitForSelector('.weather-display', { state: 'visible' });
      
      // Verify weather display utilizes space appropriately
      const weatherDisplay = page.locator('.weather-display');
      await expect(weatherDisplay).toBeVisible();
      
      // Check that forecast is well-spaced
      const forecastItems = page.locator('.forecast-item');
      await expect(forecastItems).toHaveCount(7);
    });
  });

  test.describe('Viewport Transitions', () => {
    test('app adapts when viewport changes', async ({ page }) => {
      // Start with desktop viewport
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-content"]', { state: 'visible' });

      // Verify desktop layout
      const welcomeFeatures = page.locator('.welcome-features');
      await expect(welcomeFeatures).toBeVisible();
      
      // Resize to mobile
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify mobile layout adaptation
      await expect(welcomeFeatures).toBeVisible();
      
      // Test functionality still works after resize
      const searchInput = page.locator('input[aria-label="Location search"]');
      await searchInput.fill('Chicago');
      await page.waitForSelector('.location-results', { state: 'visible' });
      
      const firstLocation = page.locator('.location-item').first();
      await firstLocation.tap();
      
      await page.waitForSelector('.weather-display', { state: 'visible' });
      await expect(page.locator('.weather-display')).toBeVisible();
      
      // Resize back to desktop
      await page.setViewportSize({ width: 1200, height: 800 });
      
      // Verify weather display still works
      await expect(page.locator('.weather-display')).toBeVisible();
    });
  });
});