# Page snapshot

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- status
- banner:
  - heading "Weather Forecast" [level=1]
  - paragraph: Search for locations and view weather conditions
- main:
  - region "Location Search":
    - heading "Location Search" [level=2]
    - searchbox "Location search": London
    - button "Clear search input"
    - text: Enter at least 2 characters to search for locations
  - region "Weather Information":
    - heading "Weather Information" [level=2]
    - alert:
      - heading "Unable to load weather data" [level=3]
      - paragraph: Weather service is temporarily unavailable. Please try again later.
      - button "Retry loading weather data": Try Again
- contentinfo:
  - paragraph:
    - text: Weather data provided by
    - link "Open-Meteo weather service (opens in new tab)":
      - /url: https://open-meteo.com/
      - text: Open-Meteo
```