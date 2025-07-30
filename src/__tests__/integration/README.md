# Integration Tests

This directory contains comprehensive integration tests for the Weather Forecast Application. The tests verify complete user workflows and component interactions.

## Test Files

### 1. `basic-workflow.integration.spec.ts`
**Status: ✅ Working (13/16 tests passing)**

Tests core application functionality:
- App initialization and structure
- Search functionality with API integration
- Weather display after location selection
- Loading states and user feedback
- Error handling for validation
- Accessibility features
- Component integration

**Key Features Tested:**
- Complete search → select → weather display flow
- API mocking for reliable test execution
- Loading state management
- Error scenarios (validation errors)
- Accessibility structure (ARIA roles, skip links)
- Component state transitions

### 2. `app-workflow.integration.spec.ts`
**Status: ⚠️ Comprehensive but needs refinement**

More detailed workflow tests including:
- Multiple search scenarios
- Complex error handling
- Retry functionality
- Accessibility announcements
- Keyboard navigation

### 3. `api-integration.spec.ts`
**Status: ⚠️ Service-level integration tests**

Tests direct service integration:
- LocationService API integration
- WeatherService API integration
- Caching behavior
- Error recovery and retry logic
- Offline handling
- API response validation

### 4. `error-scenarios.integration.spec.ts`
**Status: ⚠️ Comprehensive error testing**

Extensive error scenario testing:
- Network failures
- API errors (4xx, 5xx)
- Data validation errors
- User input errors
- Offline scenarios
- Component error boundaries
- Cache-related errors

## Test Coverage

The integration tests cover the following requirements from the spec:

### Requirement 1.1 - Location Search
✅ **Covered**: Tests verify location search functionality, API integration, and result display

### Requirement 1.2 - Location Selection
✅ **Covered**: Tests verify location selection from search results and state management

### Requirement 2.1 - Current Weather Display
✅ **Covered**: Tests verify weather data fetching and display after location selection

### Requirement 3.1 - Forecast Display
✅ **Covered**: Tests verify forecast data integration and component rendering

## Key Testing Patterns

### 1. API Mocking
```typescript
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock successful response
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: () => Promise.resolve(mockData)
})
```

### 2. Component Integration Testing
```typescript
// Test complete workflow
const searchBar = wrapper.findComponent({ name: 'SearchBar' })
await searchBar.vm.$emit('search', 'New York')

const locationResults = wrapper.findComponent({ name: 'LocationResults' })
await locationResults.vm.$emit('select-location', mockLocation)

const weatherDisplay = wrapper.findComponent({ name: 'WeatherDisplay' })
expect(weatherDisplay.exists()).toBe(true)
```

### 3. Async State Management
```typescript
// Wait for initialization
await new Promise(resolve => setTimeout(resolve, 600))
await wrapper.vm.$nextTick()

// Wait for API responses
await new Promise(resolve => setTimeout(resolve, 200))
await wrapper.vm.$nextTick()
```

### 4. Error Scenario Testing
```typescript
// Mock API error
mockFetch.mockResolvedValueOnce({
  ok: false,
  status: 500
})

// Verify error handling
const errorMessage = wrapper.findComponent({ name: 'ErrorMessage' })
expect(errorMessage.exists()).toBe(true)
```

## Running the Tests

```bash
# Run all integration tests
npm run test:unit -- --run src/__tests__/integration

# Run specific test file
npm run test:unit -- --run src/__tests__/integration/basic-workflow.integration.spec.ts

# Run with watch mode
npm run test:unit src/__tests__/integration
```

## Test Environment Setup

The tests include comprehensive mocking:
- **fetch API**: For HTTP requests
- **localStorage**: For caching functionality
- **navigator.onLine**: For offline scenarios
- **window events**: For network status monitoring
- **console methods**: To avoid test noise

## Known Issues and Limitations

1. **Timing Sensitivity**: Some tests are sensitive to async timing and may need adjustment
2. **Component Name Matching**: Tests rely on component names which must match exactly
3. **Mock Complexity**: Complex error scenarios require detailed mock setup
4. **Browser API Mocking**: Some browser APIs have limited mock capabilities

## Future Improvements

1. **E2E Tests**: Add Cypress/Playwright tests for full browser testing
2. **Visual Regression**: Add screenshot testing for UI consistency
3. **Performance Testing**: Add tests for loading performance
4. **Accessibility Testing**: Expand automated accessibility testing
5. **Mobile Testing**: Add responsive design testing

## Test Data

The tests use consistent mock data:
- **Mock Location**: New York (40.7128, -74.0060)
- **Mock Weather**: Realistic weather response with 7-day forecast
- **Error Scenarios**: Various HTTP status codes and network conditions

This ensures reliable and predictable test execution across different environments.