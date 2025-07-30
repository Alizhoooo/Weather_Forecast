# Weather Forecast App

A modern, responsive, and accessible weather forecast application built with Vue.js and TypeScript. It provides real-time weather data, location-based forecasts, and a clean, user-friendly interface.

## ✨ Features

- **Real-time Weather Data**: Get up-to-the-minute weather conditions for any location.
- **Location Search**: Easily search for cities worldwide to get their weather forecasts.
- **5-Day Forecast**: View a detailed 5-day weather forecast.
- **Responsive Design**: A seamless experience across all devices, from mobile to desktop.
- **Accessible**: Built with accessibility in mind (WAI-ARIA standards).
- **Error Handling**: Graceful error handling for API failures or network issues.
- **Loading States**: Clear loading indicators for a better user experience.

## 🛠️ Tech Stack

- **Frontend**: [Vue.js](https://vuejs.org/) 3 (Composition API)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Routing**: [Vue Router](https://router.vuejs.org/)
- **Styling**: CSS
- **Unit & Integration Testing**: [Vitest](https://vitest.dev/)
- **E2E Testing**: [Playwright](https://playwright.dev/)
- **Linting**: [ESLint](https://eslint.org/)
- **Formatting**: [Prettier](https://prettier.io/)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18.x or higher)
- [pnpm](https://pnpm.io/) (or npm/yarn)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/weather-forecast-app.git
    cd weather-forecast-app
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

3.  Set up environment variables. Create a `.env` file in the root directory and add your OpenWeatherMap API key:
    ```
    VITE_OPENWEATHER_API_KEY=your_api_key_here
    ```

### Running the Development Server

To start the local development server, run:

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`.

## 🧪 Testing

This project uses Vitest for unit and integration tests, and Playwright for end-to-end tests.

- **Run all tests**:
  ```bash
  pnpm test
  ```

- **Run unit tests**:
  ```bash
  pnpm test:unit
  ```

- **Run E2E tests**:
  ```bash
  pnpm test:e2e
  ```

## 📦 Build for Production

To build the application for production, run:

```bash
pnpm build
```

This will create a `dist/` directory with the optimized production build.

## ☁️ Deployment

https://weather-forecast-9l18.vercel.app

The application is configured for easy deployment on several platforms:

- **Netlify**: The `netlify.toml` file contains the necessary configuration. Connect your repository to Netlify for automatic builds and deploys.
- **Vercel**: The `vercel.json` file provides the configuration for deploying to Vercel.
- **Docker**: A `Dockerfile` is included to build a containerized version of the app.
  ```bash
  # Build the Docker image
  docker build -t weather-forecast-app .

  # Run the container
  docker run -p 8080:80 weather-forecast-app
  ```

## 🔄 CI/CD

A GitHub Actions workflow is set up in `.github/workflows/ci-cd.yml`. It automatically runs tests and linting on every push and pull request to the `main` branch.
