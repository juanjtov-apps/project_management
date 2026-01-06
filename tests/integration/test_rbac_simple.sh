#!/bin/bash
# Simple test script for RBAC endpoints

echo "Testing RBAC User Endpoints"
echo "============================"

# Login
echo ""
echo "1. Logging in..."
LOGIN_RESP=$(curl -s -X POST http://127.0.0.1:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel@tiento.com","password":"password123"}' \
  -c /tmp/cookies.txt)

echo "Login response: $LOGIN_RESP"

# Get users
echo ""
echo "2. Getting users..."
GET_RESP=$(curl -s -X GET http://127.0.0.1:5000/api/v1/rbac/users \
  -b /tmp/cookies.txt)
echo "GET users status: $(echo "$GET_RESP" | head -1)"
echo "Users count: $(echo "$GET_RESP" | grep -o '"id"' | wc -l)"

# Create user
echo ""
echo "3. Creating user..."
TIMESTAMP=$(date +%s)
CREATE_RESP=$(curl -s -X POST http://127.0.0.1:5000/api/v1/rbac/users \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d "{
    \"first_name\": \"Test\",
    \"last_name\": \"User$TIMESTAMP\",
    \"email\": \"testuser$TIMESTAMP@test.com\",
    \"password\": \"TestPass123!\",
    \"role\": \"crew\",
    \"company_id\": \"61\",
    \"is_active\": true
  }")

echo "Create response: $CREATE_RESP"
USER_ID=$(echo "$CREATE_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created user ID: $USER_ID"

if [ -n "$USER_ID" ]; then
  # Update user
  echo ""
  echo "4. Updating user $USER_ID..."
  UPDATE_RESP=$(curl -s -X PATCH http://127.0.0.1:5000/api/v1/rbac/users/$USER_ID \
    -H "Content-Type: application/json" \
    -b /tmp/cookies.txt \
    -d '{
      "first_name": "Updated",
      "last_name": "TestUser",
      "is_active": false
    }')
  echo "Update response: $UPDATE_RESP"
fi

echo ""
echo "============================"
echo "Test complete"

