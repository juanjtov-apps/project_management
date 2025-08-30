#!/bin/bash

# Simple Bash Script to Test All Proesphere API Endpoints
# Usage: chmod +x simple_test_endpoints.sh && ./simple_test_endpoints.sh

echo "🚀 Proesphere API Endpoint Test Battery"
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Helper function to test endpoints
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    
    echo -n "Testing $method $endpoint ... "
    
    if [ "$method" = "GET" ]; then
        status=$(curl -s -o /dev/null -w "%{http_code}" -b cookies.txt "http://127.0.0.1:8000$endpoint")
    elif [ "$method" = "POST" ]; then
        status=$(curl -s -o /dev/null -w "%{http_code}" -b cookies.txt -X POST -H "Content-Type: application/json" -d "$data" "http://127.0.0.1:8000$endpoint")
    fi
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ $status${NC} | $description"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ $status (expected $expected_status)${NC} | $description"
        FAILED=$((FAILED + 1))
    fi
}

# Step 1: Authenticate (assume we already have cookies from browser)
echo "🔐 Using existing browser session cookies..."

# Step 2: Test Core Dashboard Endpoints
echo ""
echo "📊 Testing Core Dashboard Endpoints..."
test_endpoint "GET" "/api/auth/user" "200" "Current user info"
test_endpoint "GET" "/api/dashboard/stats" "200" "Dashboard statistics" 
test_endpoint "GET" "/api/activities" "200" "Recent activities"

# Step 3: Test Main Feature Endpoints
echo ""
echo "🏗️ Testing Main Feature Endpoints..."
test_endpoint "GET" "/api/projects" "200" "List all projects"
test_endpoint "GET" "/api/tasks" "200" "List all tasks"
test_endpoint "GET" "/api/photos" "200" "List all photos"
test_endpoint "GET" "/api/schedule" "200" "Schedule changes"

# Step 4: Test User Management
echo ""
echo "👥 Testing User Management..."
test_endpoint "GET" "/api/users" "200" "List all users"
test_endpoint "GET" "/api/users/managers" "200" "List managers"

# Step 5: Test Notifications
echo ""
echo "🔔 Testing Notifications..."
test_endpoint "GET" "/api/notifications" "200" "User notifications"

# Step 6: Test Permission-Based Endpoints
echo ""
echo "🛡️ Testing Permission System..."
test_endpoint "GET" "/api/companies" "403" "Companies (platform admin only)"

# Step 7: Calculate Results
echo ""
echo "========================================"
echo "📈 TEST SUMMARY"
echo "========================================"
echo -e "✅ Passed: ${GREEN}$PASSED${NC}"
echo -e "❌ Failed: ${RED}$FAILED${NC}"

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=1; $PASSED * 100 / $TOTAL" | bc)
    echo -e "📊 Success Rate: ${YELLOW}${SUCCESS_RATE}%${NC}"
fi

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL TESTS PASSED! The FastAPI backend is working perfectly.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  $FAILED tests failed. Please check the endpoints above.${NC}"
    exit 1
fi