#!/bin/bash

# BeBrahma Docker Build Test Script
# This script tests all Docker builds locally before pushing to CodeBuild
# Usage: ./test-docker-builds.sh [service] [--clean] [--help]

set -e
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SERVICE=""
CLEAN=false
IMAGE_TAG="test-$(date +%Y%m%d-%H%M%S)"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "BeBrahma Docker Build Test Script"
    echo ""
    echo "Usage: $0 [service] [options]"
    echo ""
    echo "Services:"
    echo "  api           Test API service build only"
    echo "  crew          Test Crew service build only"
    echo "  workflow      Test Workflow service build only"
    echo "  all           Test all services (default)"
    echo ""
    echo "Options:"
    echo "  --clean       Clean up Docker images after testing"
    echo "  --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Test all services"
    echo "  $0 api               # Test API service only"
    echo "  $0 all --clean       # Test all services and clean up"
    echo "  $0 crew --clean      # Test Crew service and clean up"
}

# Function to parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            api|crew|workflow|all)
                SERVICE="$1"
                shift
                ;;
            --clean)
                CLEAN=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if required files exist
    local required_files=("Dockerfile.api" "Dockerfile.crew-service" "Dockerfile.workflow-service")
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            print_error "Required file not found: $file"
            exit 1
        fi
    done
    
    print_success "Prerequisites check passed"
}

# Function to clean up Docker images
cleanup_images() {
    if [[ "$CLEAN" == true ]]; then
        print_status "Cleaning up test images..."
        
        # Remove test images
        docker rmi -f $(docker images --filter "reference=*:$IMAGE_TAG" -q) 2>/dev/null || true
        docker rmi -f $(docker images --filter "reference=*:test-*" -q) 2>/dev/null || true
        
        # Clean up dangling images
        docker image prune -f
        
        print_success "Cleanup completed"
    fi
}

# Function to test API service build
test_api_build() {
    print_status "Testing API service build..."
    
    local start_time=$(date +%s)
    
    if docker build --progress=plain -f Dockerfile.api -t "bebrahma-api:$IMAGE_TAG" .; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "API service build completed successfully in ${duration}s"
        
        # Test if the container can start
        print_status "Testing API container startup..."
        if docker run --rm -d --name "test-api-$IMAGE_TAG" -p 4001:4000 "bebrahma-api:$IMAGE_TAG" > /dev/null; then
            sleep 5
            if docker ps --filter "name=test-api-$IMAGE_TAG" --filter "status=running" | grep -q "test-api-$IMAGE_TAG"; then
                print_success "API container started successfully"
                docker stop "test-api-$IMAGE_TAG" > /dev/null
            else
                print_error "API container failed to start"
                docker logs "test-api-$IMAGE_TAG" 2>/dev/null || true
                docker rm -f "test-api-$IMAGE_TAG" > /dev/null
                return 1
            fi
        else
            print_error "Failed to start API container"
            return 1
        fi
    else
        print_error "API service build failed"
        return 1
    fi
}

# Function to test Crew service build
test_crew_build() {
    print_status "Testing Crew service build..."
    
    local start_time=$(date +%s)
    
    if docker build --progress=plain -f Dockerfile.crew-service -t "bebrahma-crew:$IMAGE_TAG" .; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "Crew service build completed successfully in ${duration}s"
        
        # Test if the container can start
        print_status "Testing Crew container startup..."
        if docker run --rm -d --name "test-crew-$IMAGE_TAG" -p 5055:5055 "bebrahma-crew:$IMAGE_TAG" > /dev/null; then
            sleep 5
            if docker ps --filter "name=test-crew-$IMAGE_TAG" --filter "status=running" | grep -q "test-crew-$IMAGE_TAG"; then
                print_success "Crew container started successfully"
                docker stop "test-crew-$IMAGE_TAG" > /dev/null
            else
                print_error "Crew container failed to start"
                docker logs "test-crew-$IMAGE_TAG" 2>/dev/null || true
                docker rm -f "test-crew-$IMAGE_TAG" > /dev/null
                return 1
            fi
        else
            print_error "Failed to start Crew container"
            return 1
        fi
    else
        print_error "Crew service build failed"
        return 1
    fi
}

# Function to test Workflow service build
test_workflow_build() {
    print_status "Testing Workflow service build..."
    
    local start_time=$(date +%s)
    
    if docker build --progress=plain -f Dockerfile.workflow-service -t "bebrahma-workflow:$IMAGE_TAG" .; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "Workflow service build completed successfully in ${duration}s"
        
        # Test if the container can start
        print_status "Testing Workflow container startup..."
        if docker run --rm -d --name "test-workflow-$IMAGE_TAG" -p 5057:5056 "bebrahma-workflow:$IMAGE_TAG" > /dev/null; then
            sleep 5
            if docker ps --filter "name=test-workflow-$IMAGE_TAG" --filter "status=running" | grep -q "test-workflow-$IMAGE_TAG"; then
                print_success "Workflow container started successfully"
                docker stop "test-workflow-$IMAGE_TAG" > /dev/null
            else
                print_error "Workflow container failed to start"
                docker logs "test-workflow-$IMAGE_TAG" 2>/dev/null || true
                docker rm -f "test-workflow-$IMAGE_TAG" > /dev/null
                return 1
            fi
        else
            print_error "Failed to start Workflow container"
            return 1
        fi
    else
        print_error "Workflow service build failed"
        return 1
    fi
}

# Function to run all tests
run_all_tests() {
    local failed_tests=()
    
    if ! test_api_build; then
        failed_tests+=("api")
    fi
    
    if ! test_crew_build; then
        failed_tests+=("crew")
    fi
    
    if ! test_workflow_build; then
        failed_tests+=("workflow")
    fi
    
    if [[ ${#failed_tests[@]} -eq 0 ]]; then
        print_success "All Docker builds completed successfully!"
        return 0
    else
        print_error "The following builds failed: ${failed_tests[*]}"
        return 1
    fi
}

# Main function
main() {
    print_status "BeBrahma Docker Build Test Script"
    print_status "Image tag: $IMAGE_TAG"
    
    parse_args "$@"
    
    # Set default service if not specified
    if [[ -z "$SERVICE" ]]; then
        SERVICE="all"
    fi
    
    check_prerequisites
    
    local overall_start_time=$(date +%s)
    
    # Run tests based on service selection
    case $SERVICE in
        api)
            test_api_build
            ;;
        crew)
            test_crew_build
            ;;
        workflow)
            test_workflow_build
            ;;
        all)
            run_all_tests
            ;;
    esac
    
    local test_result=$?
    local overall_end_time=$(date +%s)
    local overall_duration=$((overall_end_time - overall_start_time))
    
    if [[ $test_result -eq 0 ]]; then
        print_success "All tests completed successfully in ${overall_duration}s"
    else
        print_error "Tests failed after ${overall_duration}s"
    fi
    
    cleanup_images
    
    exit $test_result
}

# Trap to ensure cleanup on script exit
trap 'cleanup_images' EXIT

# Run main function with all arguments
main "$@"
