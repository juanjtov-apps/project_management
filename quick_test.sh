#!/bin/bash
# Quick test script to verify the migration
# Usage: ./quick_test.sh

echo "🧪 Quick Migration Test"
echo "======================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if Python backend is running
echo "1. Checking Python backend..."
if curl -s http://127.0.0.1:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Python backend is running${NC}"
else
    echo -e "${RED}❌ Python backend is not running${NC}"
    echo "   Start it with: cd python_backend && python3 main.py"
    exit 1
fi

# Test 2: Check if frontend is running
echo ""
echo "2. Checking frontend server..."
if curl -s http://127.0.0.1:5000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend server is running${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend server is not running (optional for API testing)${NC}"
fi

# Test 3: Check API versioning
echo ""
echo "3. Testing API versioning..."
V1_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/v1/projects)
if [ "$V1_RESPONSE" = "200" ] || [ "$V1_RESPONSE" = "401" ]; then
    echo -e "${GREEN}✅ /api/v1/* endpoints are accessible (status: $V1_RESPONSE)${NC}"
else
    echo -e "${RED}❌ /api/v1/* endpoints returned status: $V1_RESPONSE${NC}"
fi

# Test 4: Check OpenAPI docs
echo ""
echo "4. Checking API documentation..."
DOCS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/docs)
if [ "$DOCS_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ API documentation is available at http://127.0.0.1:8000/docs${NC}"
else
    echo -e "${YELLOW}⚠️  API documentation returned status: $DOCS_RESPONSE${NC}"
fi

# Test 5: Check object storage endpoints
echo ""
echo "5. Testing object storage endpoints..."
UPLOAD_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:8000/api/v1/objects/upload -H "Content-Type: application/json" -d '{}')
if [ "$UPLOAD_RESPONSE" = "200" ] || [ "$UPLOAD_RESPONSE" = "401" ] || [ "$UPLOAD_RESPONSE" = "500" ]; then
    echo -e "${GREEN}✅ Object upload endpoint exists (status: $UPLOAD_RESPONSE)${NC}"
else
    echo -e "${RED}❌ Object upload endpoint returned status: $UPLOAD_RESPONSE${NC}"
fi

echo ""
echo "======================"
echo "Quick test complete!"
echo ""
echo "For comprehensive testing, run:"
echo "  python test_migration_comprehensive.py"
echo ""
echo "Or open the frontend in your browser:"
echo "  http://127.0.0.1:5000"

