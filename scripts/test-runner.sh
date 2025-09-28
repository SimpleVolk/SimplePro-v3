#!/bin/bash

# SimplePro-v3 Integration Test Runner
# Comprehensive test execution script for all integration tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
API_DIR="apps/api"
TEST_DIR="$API_DIR/test"
COVERAGE_DIR="coverage/integration"
REPORT_DIR="test-reports"

echo -e "${BLUE}🚀 SimplePro-v3 Integration Test Runner${NC}"
echo "=============================================="

# Create directories
mkdir -p "$COVERAGE_DIR"
mkdir -p "$REPORT_DIR"

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}📋 $1${NC}"
    echo "----------------------------------------"
}

# Function to run test with error handling
run_test() {
    local test_name="$1"
    local test_file="$2"
    local description="$3"

    echo -e "${YELLOW}🧪 Running: $test_name${NC}"
    echo "   Description: $description"

    if cd "$API_DIR" && npx jest --config=jest.integration.config.ts "$test_file" --verbose --detectOpenHandles; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name: FAILED${NC}"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_section "Checking Prerequisites"

    # Check if MongoDB is available (either local or docker)
    if docker ps | grep -q mongodb || nc -z localhost 27017; then
        echo -e "${GREEN}✅ MongoDB is available${NC}"
    else
        echo -e "${YELLOW}⚠️  MongoDB not detected. Starting Docker MongoDB...${NC}"
        if command -v docker &> /dev/null; then
            docker run -d --name test-mongodb -p 27017:27017 mongo:7.0 || true
            sleep 5
        else
            echo -e "${RED}❌ MongoDB required for integration tests${NC}"
            echo "   Please start MongoDB or run: npm run docker:dev"
            exit 1
        fi
    fi

    # Check Node.js version
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js version: $NODE_VERSION${NC}"

    # Check npm dependencies
    if [ -f "node_modules/.package-lock.json" ]; then
        echo -e "${GREEN}✅ Dependencies installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Installing dependencies...${NC}"
        npm install
    fi
}

# Function to run integration test suite
run_integration_tests() {
    print_section "Running Integration Test Suite"

    local failed_tests=0
    local total_tests=0

    # Test files and descriptions
    declare -A tests=(
        ["simple-integration.spec.ts"]="Basic API health checks and estimate calculations"
        ["auth.integration.spec.ts"]="Authentication, authorization, and user management"
        ["customers.integration.spec.ts"]="Customer CRUD operations and search functionality"
        ["jobs.integration.spec.ts"]="Job lifecycle management and crew assignment"
        ["analytics.integration.spec.ts"]="Analytics, reporting, and business intelligence"
        ["estimates.integration.spec.ts"]="Comprehensive estimate calculations and validation"
    )

    for test_file in "${!tests[@]}"; do
        description="${tests[$test_file]}"
        test_name=$(basename "$test_file" .spec.ts)

        total_tests=$((total_tests + 1))

        if ! run_test "$test_name" "test/$test_file" "$description"; then
            failed_tests=$((failed_tests + 1))
        fi

        echo "" # Add spacing between tests
    done

    # Summary
    print_section "Test Results Summary"

    local passed_tests=$((total_tests - failed_tests))
    echo "Total Tests: $total_tests"
    echo -e "Passed: ${GREEN}$passed_tests${NC}"
    echo -e "Failed: ${RED}$failed_tests${NC}"

    if [ $failed_tests -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All integration tests passed!${NC}"
        return 0
    else
        echo -e "\n${RED}💥 $failed_tests test(s) failed.${NC}"
        return 1
    fi
}

# Function to generate coverage report
generate_coverage_report() {
    print_section "Generating Coverage Report"

    echo "Running tests with coverage..."
    cd "$API_DIR"

    if npx jest --config=jest.integration.config.ts --coverage --coverageDirectory="../../$COVERAGE_DIR"; then
        echo -e "${GREEN}✅ Coverage report generated in $COVERAGE_DIR${NC}"

        # Display coverage summary if lcov file exists
        if [ -f "../../$COVERAGE_DIR/lcov.info" ]; then
            echo -e "\n${BLUE}📊 Coverage Summary:${NC}"
            npx lcov-summary "../../$COVERAGE_DIR/lcov.info" || echo "Coverage summary not available"
        fi
    else
        echo -e "${YELLOW}⚠️  Coverage report generation failed${NC}"
    fi

    cd - > /dev/null
}

# Function to generate test documentation
generate_test_documentation() {
    print_section "Generating Test Documentation"

    local doc_file="$REPORT_DIR/integration-test-report.md"

    cat > "$doc_file" << EOF
# SimplePro-v3 Integration Test Report

Generated on: $(date)

## Overview

This report provides comprehensive information about the SimplePro-v3 integration test suite, including test coverage, functionality validation, and system reliability assessment.

## Test Suite Architecture

### Test Categories

1. **Authentication & Authorization Tests** (\`auth.integration.spec.ts\`)
   - User registration and login flows
   - JWT token management and validation
   - Role-based access control (RBAC)
   - Session management and security

2. **Customer Management Tests** (\`customers.integration.spec.ts\`)
   - Customer CRUD operations
   - Search and filtering functionality
   - Data validation and business rules
   - Customer lifecycle management

3. **Job Management Tests** (\`jobs.integration.spec.ts\`)
   - Job creation and scheduling
   - Status transitions and workflow
   - Crew assignment and management
   - Calendar integration

4. **Analytics & Reporting Tests** (\`analytics.integration.spec.ts\`)
   - Dashboard metrics and KPIs
   - Revenue analysis and tracking
   - Business intelligence calculations
   - Custom report generation

5. **Estimate Calculation Tests** (\`estimates.integration.spec.ts\`)
   - Deterministic pricing calculations
   - Complex estimate scenarios
   - Pricing rule validation
   - Location handicap calculations

6. **Basic Integration Tests** (\`simple-integration.spec.ts\`)
   - API health checks
   - Basic estimate calculations
   - Error handling validation

## Test Infrastructure

### Database Management
- **In-Memory MongoDB**: Uses mongodb-memory-server for isolated testing
- **Data Fixtures**: Comprehensive test data factories
- **Cleanup**: Automatic database cleanup between tests

### Authentication Testing
- **Test Users**: Multiple roles (admin, dispatcher, crew)
- **JWT Tokens**: Proper token management and validation
- **Session Isolation**: Each test gets fresh authentication state

### Performance Testing
- **Concurrent Requests**: Tests handle multiple simultaneous operations
- **Load Testing**: Validates system performance under stress
- **Memory Management**: Proper cleanup prevents memory leaks

## Test Utilities

### Integration Setup (\`integration-setup.ts\`)
- **App Initialization**: Complete NestJS application setup
- **Database Setup**: MongoDB memory server configuration
- **Authentication Helpers**: User creation and login utilities
- **Data Factories**: Consistent test data generation
- **Response Assertions**: Common validation patterns

### Key Features
- **Deterministic Testing**: Reproducible results across runs
- **Error Simulation**: Comprehensive error scenario testing
- **Business Logic Validation**: Real-world workflow testing
- **Cross-Platform Compatibility**: Works on all development environments

## Running Integration Tests

### Prerequisites
- Node.js 20+
- MongoDB (local or Docker)
- All npm dependencies installed

### Commands
\`\`\`bash
# Run all integration tests
npm run test:integration

# Run specific test file
npx jest --config=apps/api/jest.integration.config.ts test/auth.integration.spec.ts

# Run with coverage
npm run test:integration -- --coverage

# Run with verbose output
npm run test:integration -- --verbose
\`\`\`

### Docker Setup
\`\`\`bash
# Start development infrastructure
npm run docker:dev

# Run tests
npm run test:integration

# Stop infrastructure
npm run docker:dev:down
\`\`\`

## Test Configuration

### Jest Configuration (\`jest.integration.config.ts\`)
- **Test Environment**: Node.js
- **Test Pattern**: \`**/*.integration.spec.ts\`
- **Timeout**: 30 seconds per test
- **Sequential Execution**: Tests run one at a time for isolation
- **Module Mapping**: Supports TypeScript path mapping

### Environment Variables
- \`NODE_ENV=test\`
- \`MONGODB_URI\`: Test database connection
- \`JWT_SECRET\`: Test JWT signing key
- \`JWT_REFRESH_SECRET\`: Test refresh token key

## Test Data Management

### Customer Test Data
- Multiple customer types (residential, commercial)
- Various statuses (lead, prospect, active, inactive)
- Complete address information
- Contact details and notes

### Job Test Data
- Different service types (local, long_distance, storage)
- Status transitions (scheduled → in_progress → completed)
- Crew assignments and scheduling
- Cost tracking and billing

### Estimate Test Data
- Complex moving scenarios
- Special items (pianos, antiques, artwork)
- Location handicaps (stairs, parking, access)
- Service combinations and add-ons

## Quality Assurance

### Test Coverage Goals
- **Statements**: 90%+
- **Branches**: 85%+
- **Functions**: 90%+
- **Lines**: 90%+

### Test Quality Metrics
- **Reliability**: All tests must be deterministic
- **Performance**: Tests complete within timeout limits
- **Isolation**: No test dependencies or shared state
- **Maintainability**: Clear, documented test code

## Continuous Integration

### CI/CD Pipeline Integration
- **Automated Testing**: Runs on every pull request
- **Coverage Reporting**: Tracks coverage trends
- **Failure Notifications**: Immediate feedback on failures
- **Deployment Gates**: Tests must pass before deployment

### Performance Monitoring
- **Test Duration**: Tracks test execution time
- **Memory Usage**: Monitors memory consumption
- **Database Performance**: Validates query efficiency
- **Concurrent Load**: Tests system under realistic load

## Troubleshooting

### Common Issues
1. **MongoDB Connection**: Ensure MongoDB is running
2. **Port Conflicts**: Check if ports 27017 (MongoDB) are available
3. **Memory Issues**: Increase Node.js memory limit if needed
4. **Timeout Errors**: Check if MongoDB memory server is starting properly

### Debug Commands
\`\`\`bash
# Run with debug output
DEBUG=* npm run test:integration

# Check MongoDB connection
telnet localhost 27017

# View test logs
npm run test:integration -- --verbose --detectOpenHandles
\`\`\`

## Maintenance

### Regular Tasks
- **Update Test Data**: Keep test scenarios current with business rules
- **Review Coverage**: Ensure new features have appropriate test coverage
- **Performance Monitoring**: Track test execution time trends
- **Dependency Updates**: Keep testing libraries up to date

### Adding New Tests
1. Create test file following naming convention
2. Use integration-setup utilities for consistency
3. Follow AAA pattern (Arrange, Act, Assert)
4. Include both positive and negative test cases
5. Add appropriate performance and error testing

EOF

    echo -e "${GREEN}✅ Test documentation generated: $doc_file${NC}"
}

# Function to cleanup test environment
cleanup_test_environment() {
    print_section "Cleaning Up Test Environment"

    # Stop test MongoDB if we started it
    if docker ps | grep -q test-mongodb; then
        echo "Stopping test MongoDB container..."
        docker stop test-mongodb > /dev/null || true
        docker rm test-mongodb > /dev/null || true
    fi

    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Main execution
main() {
    local run_coverage=false
    local generate_docs=false
    local cleanup_only=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --coverage)
                run_coverage=true
                shift
                ;;
            --docs)
                generate_docs=true
                shift
                ;;
            --cleanup)
                cleanup_only=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --coverage    Generate coverage report"
                echo "  --docs        Generate test documentation"
                echo "  --cleanup     Clean up test environment only"
                echo "  --help        Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Handle cleanup-only mode
    if [ "$cleanup_only" = true ]; then
        cleanup_test_environment
        exit 0
    fi

    # Trap to ensure cleanup on exit
    trap cleanup_test_environment EXIT

    # Run test sequence
    check_prerequisites

    if run_integration_tests; then
        echo -e "\n${GREEN}🎊 Integration tests completed successfully!${NC}"

        # Optional coverage report
        if [ "$run_coverage" = true ]; then
            generate_coverage_report
        fi

        # Optional documentation generation
        if [ "$generate_docs" = true ]; then
            generate_test_documentation
        fi

        exit 0
    else
        echo -e "\n${RED}💥 Integration tests failed!${NC}"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"