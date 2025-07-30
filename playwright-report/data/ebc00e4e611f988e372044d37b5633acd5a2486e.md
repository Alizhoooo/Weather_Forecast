# Page snapshot

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- status
- banner:
  - heading "Weather Forecast" [level=1]
  - paragraph: Search for locations and view weather conditions
- main:
  - alert:
    - alert:
      - paragraph: Unable to connect to Location search service. Please check your internet connection.
      - button "Try Again"
      - text: Retry the failed operation
  - region "Location Search":
    - heading "Location Search" [level=2]
    - searchbox "Location search": London
    - button "Clear search input"
    - text: Enter at least 2 characters to search for locations
    - status:
      - text: 📍
      - paragraph: No locations found
      - paragraph: Try searching with a different location name
  - region "Weather Information":
    - heading "Weather Information" [level=2]
    - status:
      - heading "No weather data available" [level=3]
      - paragraph: Select a location to view weather information
- contentinfo:
  - paragraph:
    - text: Weather data provided by
    - link "Open-Meteo weather service (opens in new tab)":
      - /url: https://open-meteo.com/
      - text: Open-Meteo
```