#!/bin/bash

# Weather Forecast App Deployment Script
# This script handles building and deploying the application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="weather-forecast-app"
BUILD_DIR="dist"
DOCKER_IMAGE="weather-forecast-app"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
check_directory() {
    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found. Please run this script from the weather-forecast-app directory."
        exit 1
    fi
    
    if [[ ! $(grep -q "weather-forecast-app" package.json) ]]; then
        log_warning "This doesn't appear to be the weather-forecast-app directory."
    fi
}

# Clean previous builds
clean_build() {
    log_info "Cleaning previous builds..."
    rm -rf $BUILD_DIR
    rm -rf node_modules/.vite
    log_success "Build directory cleaned"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    npm ci
    log_success "Dependencies installed"
}

# Run quality checks
run_quality_checks() {
    log_info "Running quality checks..."
    
    log_info "Type checking..."
    npm run type-check
    
    log_info "Linting..."
    npm run lint:check
    
    log_info "Format checking..."
    npm run format:check
    
    log_success "Quality checks passed"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    log_info "Running unit tests..."
    npm run test:unit:run
    
    log_info "Running E2E tests..."
    npm run test:e2e
    
    log_success "All tests passed"
}

# Build application
build_app() {
    log_info "Building application for production..."
    npm run build:production
    log_success "Application built successfully"
}

# Build Docker image
build_docker() {
    log_info "Building Docker image..."
    docker build -t $DOCKER_IMAGE:latest .
    log_success "Docker image built: $DOCKER_IMAGE:latest"
}

# Deploy to local preview
deploy_preview() {
    log_info "Starting preview server..."
    npm run preview:production &
    PREVIEW_PID=$!
    
    log_success "Preview server started at http://localhost:4173"
    log_info "Press Ctrl+C to stop the preview server"
    
    # Wait for Ctrl+C
    trap "kill $PREVIEW_PID; exit" INT
    wait $PREVIEW_PID
}

# Deploy with Docker
deploy_docker() {
    log_info "Starting Docker container..."
    
    # Stop existing container if running
    docker stop $APP_NAME 2>/dev/null || true
    docker rm $APP_NAME 2>/dev/null || true
    
    # Run new container
    docker run -d \
        --name $APP_NAME \
        -p 8080:80 \
        --restart unless-stopped \
        $DOCKER_IMAGE:latest
    
    log_success "Docker container started at http://localhost:8080"
    log_info "Container name: $APP_NAME"
    log_info "To stop: docker stop $APP_NAME"
    log_info "To view logs: docker logs $APP_NAME"
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build       Build the application for production"
    echo "  test        Run all tests (unit + E2E)"
    echo "  quality     Run quality checks (type-check, lint, format)"
    echo "  preview     Build and start preview server"
    echo "  docker      Build Docker image and run container"
    echo "  full        Run full deployment pipeline (quality + test + build)"
    echo "  clean       Clean build artifacts"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build                 # Build for production"
    echo "  $0 preview               # Build and preview locally"
    echo "  $0 docker                # Build and run with Docker"
    echo "  $0 full                  # Full deployment pipeline"
}

# Main script logic
main() {
    check_directory
    
    case "${1:-help}" in
        "build")
            clean_build
            install_dependencies
            build_app
            ;;
        "test")
            install_dependencies
            run_tests
            ;;
        "quality")
            install_dependencies
            run_quality_checks
            ;;
        "preview")
            clean_build
            install_dependencies
            build_app
            deploy_preview
            ;;
        "docker")
            clean_build
            install_dependencies
            build_app
            build_docker
            deploy_docker
            ;;
        "full")
            clean_build
            install_dependencies
            run_quality_checks
            run_tests
            build_app
            log_success "Full deployment pipeline completed successfully!"
            ;;
        "clean")
            clean_build
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@"