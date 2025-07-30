# Page snapshot

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- status: Found 10 locations for "London"
- banner:
  - heading "Weather Forecast" [level=1]
  - paragraph: Search for locations and view weather conditions
- main:
  - region "Location Search":
    - heading "Location Search" [level=2]
    - searchbox "Location search": London
    - button "Clear search input"
    - text: Enter at least 2 characters to search for locations
    - listbox "Location search results":
      - option "London , England United Kingdom"
      - option "London , Ontario Canada"
      - option "London , Ohio United States"
      - option "London , Kentucky United States"
      - option "London , Arkansas United States"
      - option "London , Texas United States"
      - option "London , West Virginia United States"
      - option "London , California United States"
      - option "London , Line Islands Kiribati"
      - option "London , Mpumalanga South Africa"
  - region "Welcome to Weather Forecast":
    - heading "Welcome to Weather Forecast" [level=2]
    - paragraph: Search for any city or location above to view current weather conditions and a 7-day forecast.
    - list "Application features":
      - listitem: Search worldwide locations
      - listitem: Current weather conditions
      - listitem: 7-day weather forecast
- contentinfo:
  - paragraph:
    - text: Weather data provided by
    - link "Open-Meteo weather service (opens in new tab)":
      - /url: https://open-meteo.com/
      - text: Open-Meteo
```