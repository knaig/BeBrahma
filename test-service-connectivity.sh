#!/bin/bash

# Service Connectivity Testing Script
# Tests API service connectivity to crew and workflow services in different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="local"
API_BASE_URL="http://localhost:3001"
CREW_SERVICE_URL="http://localhost:5055"
WORKFLOW_SERVICE_URL="http://localhost:5056"
TIMEOUT=30
VERBOSE=false

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Environment to test (local, staging, production) [default: local]"
    echo "  -a, --api-url URL        API base URL [default: http://localhost:3001]"
    echo "  -c, --crew-url URL       Crew service URL [default: http://localhost:5055]"
    echo "  -w, --workflow-url URL   Workflow service URL [default: http://localhost:5056]"
    echo "  -t, --timeout SECONDS    Request timeout in seconds [default: 30]"
    echo "  -v, --verbose            Enable verbose output"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Test local environment"
    echo "  $0 -e staging                         # Test staging environment"
    echo "  $0 -e production -a https://api.bebrahma.com  # Test production with custom API URL"
    echo "  $0 -v -t 60                          # Test with verbose output and 60s timeout"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -a|--api-url)
            API_BASE_URL="$2"
            shift 2
            ;;
        -c|--crew-url)
            CREW_SERVICE_URL="$2"
            shift 2
            ;;
        -w|--workflow-url)
            WORKFLOW_SERVICE_URL="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Set environment-specific URLs if not explicitly provided
if [[ "$ENVIRONMENT" == "staging" ]]; then
    if [[ "$CREW_SERVICE_URL" == "http://localhost:5055" ]]; then
        CREW_SERVICE_URL="http://crew.staging.bebrahma.local:5055"
    fi
    if [[ "$WORKFLOW_SERVICE_URL" == "http://localhost:5056" ]]; then
        WORKFLOW_SERVICE_URL="http://workflow.staging.bebrahma.local:5056"
    fi
elif [[ "$ENVIRONMENT" == "production" ]]; then
    if [[ "$CREW_SERVICE_URL" == "http://localhost:5055" ]]; then
        CREW_SERVICE_URL="http://crew.production.bebrahma.local:5055"
    fi
    if [[ "$WORKFLOW_SERVICE_URL" == "http://localhost:5056" ]]; then
        WORKFLOW_SERVICE_URL="http://workflow.production.bebrahma.local:5056"
    fi
fi

# Function to test HTTP endpoint
test_endpoint() {
    local url=$1
    local service_name=$2
    local expected_status=${3:-200}
    
    if [[ "$VERBOSE" == "true" ]]; then
        echo "Testing $service_name: $url"
    fi
    
    local response
    local status_code
    
    if response=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT --max-time $TIMEOUT "$url" 2>/dev/null); then
        status_code="${response: -3}"
        response_body="${response%???}"
        
        if [[ "$status_code" == "$expected_status" ]]; then
            print_status "SUCCESS" "$service_name is responding (HTTP $status_code)"
            if [[ "$VERBOSE" == "true" ]]; then
                echo "Response: $response_body"
            fi
            return 0
        else
            print_status "ERROR" "$service_name returned HTTP $status_code (expected $expected_status)"
            if [[ "$VERBOSE" == "true" ]]; then
                echo "Response: $response_body"
            fi
            return 1
        fi
    else
        print_status "ERROR" "$service_name is not reachable (connection failed)"
        return 1
    fi
}

# Function to test DNS resolution
test_dns() {
    local hostname=$1
    local service_name=$2
    
    if [[ "$VERBOSE" == "true" ]]; then
        echo "Testing DNS resolution for $service_name: $hostname"
    fi
    
    if nslookup "$hostname" >/dev/null 2>&1; then
        print_status "SUCCESS" "$service_name DNS resolution successful"
        return 0
    else
        print_status "ERROR" "$service_name DNS resolution failed"
        return 1
    fi
}

# Function to test service discovery URLs
test_service_discovery() {
    local url=$1
    local service_name=$2
    
    # Extract hostname from URL
    local hostname=$(echo "$url" | sed -n 's|.*://\([^:/]*\).*|\1|p')
    
    if [[ "$hostname" =~ \.local$ ]]; then
        print_status "INFO" "Testing service discovery for $service_name"
        test_dns "$hostname" "$service_name"
    else
        print_status "INFO" "Skipping DNS test for non-service-discovery URL: $hostname"
    fi
}

# Main test execution
main() {
    echo "🔍 Service Connectivity Test"
    echo "=============================="
    echo "Environment: $ENVIRONMENT"
    echo "API Base URL: $API_BASE_URL"
    echo "Crew Service URL: $CREW_SERVICE_URL"
    echo "Workflow Service URL: $WORKFLOW_SERVICE_URL"
    echo "Timeout: ${TIMEOUT}s"
    echo ""
    
    local test_results=()
    local overall_success=true
    
    # Test 1: API Health Check
    print_status "INFO" "Testing API service health..."
    if test_endpoint "$API_BASE_URL/health" "API Service"; then
        test_results+=("API Service: ✅")
    else
        test_results+=("API Service: ❌")
        overall_success=false
    fi
    echo ""
    
    # Test 2: Crew Service Health Check
    print_status "INFO" "Testing crew service connectivity..."
    test_service_discovery "$CREW_SERVICE_URL" "Crew Service"
    if test_endpoint "$CREW_SERVICE_URL/health" "Crew Service"; then
        test_results+=("Crew Service: ✅")
    else
        test_results+=("Crew Service: ❌")
        overall_success=false
    fi
    echo ""
    
    # Test 3: Workflow Service Health Check
    print_status "INFO" "Testing workflow service connectivity..."
    test_service_discovery "$WORKFLOW_SERVICE_URL" "Workflow Service"
    if test_endpoint "$WORKFLOW_SERVICE_URL/health" "Workflow Service"; then
        test_results+=("Workflow Service: ✅")
    else
        test_results+=("Workflow Service: ❌")
        overall_success=false
    fi
    echo ""
    
    # Test 4: API Service Integration Test
    print_status "INFO" "Testing API service integration with external services..."
    local integration_response
    if integration_response=$(curl -s --connect-timeout $TIMEOUT --max-time $TIMEOUT "$API_BASE_URL/health" 2>/dev/null); then
        if echo "$integration_response" | grep -q '"crew"' && echo "$integration_response" | grep -q '"workflow"'; then
            print_status "SUCCESS" "API service reports external service configuration"
            test_results+=("API Integration: ✅")
        else
            print_status "WARNING" "API service health check doesn't include external service status"
            test_results+=("API Integration: ⚠️")
        fi
    else
        print_status "ERROR" "API service integration test failed"
        test_results+=("API Integration: ❌")
        overall_success=false
    fi
    echo ""
    
    # Test 5: End-to-End Workflow Test (if services are available)
    if [[ "$overall_success" == "true" ]]; then
        print_status "INFO" "Testing end-to-end workflow..."
        local test_session_id="test-$(date +%s)"
        local test_task="Test connectivity and service integration"
        
        # Test workflow start endpoint
        local workflow_start_response
        if workflow_start_response=$(curl -s -X POST \
            --connect-timeout $TIMEOUT \
            --max-time $TIMEOUT \
            -H "Content-Type: application/json" \
            -d "{\"sessionId\":\"$test_session_id\",\"task\":\"$test_task\"}" \
            "$API_BASE_URL/api/chat/crew/start" 2>/dev/null); then
            
            if echo "$workflow_start_response" | grep -q '"success":true'; then
                print_status "SUCCESS" "End-to-end workflow test passed"
                test_results+=("E2E Workflow: ✅")
            else
                print_status "WARNING" "End-to-end workflow test returned unexpected response"
                test_results+=("E2E Workflow: ⚠️")
            fi
        else
            print_status "ERROR" "End-to-end workflow test failed"
            test_results+=("E2E Workflow: ❌")
            overall_success=false
        fi
    else
        print_status "WARNING" "Skipping end-to-end test due to service connectivity issues"
        test_results+=("E2E Workflow: ⏭️")
    fi
    echo ""
    
    # Summary
    echo "📊 Test Results Summary"
    echo "======================="
    for result in "${test_results[@]}"; do
        echo "  $result"
    done
    echo ""
    
    if [[ "$overall_success" == "true" ]]; then
        print_status "SUCCESS" "All critical services are accessible and functioning"
        echo ""
        echo "🎉 Service connectivity test completed successfully!"
        echo "   Your BeBrahma API is ready to handle requests."
        exit 0
    else
        print_status "ERROR" "Some services are not accessible or functioning properly"
        echo ""
        echo "🔧 Troubleshooting Tips:"
        echo "   1. Check if all services are running"
        echo "   2. Verify network connectivity"
        echo "   3. Check firewall settings"
        echo "   4. Verify service URLs in environment configuration"
        echo "   5. Check service logs for errors"
        echo ""
        echo "   For more detailed troubleshooting, run with -v flag"
        exit 1
    fi
}

# Check dependencies
if ! command -v curl &> /dev/null; then
    print_status "ERROR" "curl is required but not installed"
    exit 1
fi

if ! command -v nslookup &> /dev/null; then
    print_status "WARNING" "nslookup not available, DNS tests will be skipped"
fi

# Run main function
main "$@"
