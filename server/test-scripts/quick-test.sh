#!/bin/bash

# Quick Test Script for Anonymous Survey Server
# Run this script after starting your local server to test basic functionality

set -e  # Exit on any error

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  Anonymous Survey Server - Quick Test${NC}"
echo -e "${BLUE}===========================================${NC}"
echo

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        exit 1
    fi
}

# Function to print step
print_step() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if server is running
print_step "Checking if server is running..."
curl -s "$BASE_URL/health" > /dev/null 2>&1
print_status $? "Server is responding"

# Test 1: Admin Authentication
print_step "Testing admin authentication..."
ADMIN_EMAIL="admin@school.edu"
ADMIN_PASSWORD="admin123"  # Default password from env.txt

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  -w "%{http_code}")

HTTP_CODE="${LOGIN_RESPONSE: -3}"
RESPONSE_BODY="${LOGIN_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    JWT_TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    print_status 0 "Admin login successful"
    echo "  JWT Token: ${JWT_TOKEN:0:20}..."
else
    print_status 1 "Admin login failed (HTTP $HTTP_CODE)"
fi

# Test 2: Create Survey
print_step "Creating test survey..."
SURVEY_RESPONSE=$(curl -s -X POST "$API_URL/surveys" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "title": "Quick Test Survey",
    "description": "Testing survey creation functionality",
    "question": "How is the local testing setup working?"
  }' \
  -w "%{http_code}")

HTTP_CODE="${SURVEY_RESPONSE: -3}"
RESPONSE_BODY="${SURVEY_RESPONSE%???}"

if [ "$HTTP_CODE" = "201" ]; then
    SURVEY_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    print_status 0 "Survey created successfully"
    echo "  Survey ID: $SURVEY_ID"
else
    print_status 1 "Survey creation failed (HTTP $HTTP_CODE)"
fi

# Test 3: Get Survey Public Keys
print_step "Retrieving survey public keys..."
KEYS_RESPONSE=$(curl -s -X GET "$API_URL/surveys/$SURVEY_ID/keys" \
  -w "%{http_code}")

HTTP_CODE="${KEYS_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    print_status 0 "Public keys retrieved successfully"
else
    print_status 1 "Failed to retrieve public keys (HTTP $HTTP_CODE)"
fi

# Test 4: Generate Student Tokens
print_step "Generating student tokens..."
TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/tokens/batch-generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "{
    \"surveyId\": \"$SURVEY_ID\",
    \"students\": [
      {\"email\": \"student1@test.edu\"},
      {\"email\": \"student2@test.edu\"}
    ]
  }" \
  -w "%{http_code}")

HTTP_CODE="${TOKEN_RESPONSE: -3}"

if [ "$HTTP_CODE" = "201" ]; then
    print_status 0 "Student tokens generated successfully"
else
    print_status 1 "Token generation failed (HTTP $HTTP_CODE)"
fi

# Test 5: Get Survey Stats
print_step "Checking survey statistics..."
STATS_RESPONSE=$(curl -s -X GET "$API_URL/surveys/$SURVEY_ID/stats" \
  -w "%{http_code}")

HTTP_CODE="${STATS_RESPONSE: -3}"
RESPONSE_BODY="${STATS_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    print_status 0 "Survey statistics retrieved"
    # Extract and display stats
    TOTAL_TOKENS=$(echo "$RESPONSE_BODY" | grep -o '"totalTokens":[0-9]*' | cut -d':' -f2)
    echo "  Total tokens created: $TOTAL_TOKENS"
else
    print_status 1 "Failed to retrieve statistics (HTTP $HTTP_CODE)"
fi

# Test 6: Test Cryptographic Operations
print_step "Testing commitment generation..."
COMMIT_RESPONSE=$(curl -s -X POST "$API_URL/crypto/generate-commitment" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "This is a test survey answer"
  }' \
  -w "%{http_code}")

HTTP_CODE="${COMMIT_RESPONSE: -3}"
RESPONSE_BODY="${COMMIT_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    COMMITMENT=$(echo "$RESPONSE_BODY" | grep -o '"commitment":"[^"]*"' | cut -d'"' -f4)
    print_status 0 "Commitment generated successfully"
    echo "  Commitment: ${COMMITMENT:0:20}..."
    
    # Test commitment verification
    print_step "Testing commitment verification..."
    VERIFY_RESPONSE=$(curl -s -X POST "$API_URL/crypto/verify-commitment" \
      -H "Content-Type: application/json" \
      -d "{
        \"message\": \"This is a test survey answer\",
        \"commitment\": \"$COMMITMENT\"
      }" \
      -w "%{http_code}")
    
    HTTP_CODE="${VERIFY_RESPONSE: -3}"
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_status 0 "Commitment verification successful"
    else
        print_status 1 "Commitment verification failed (HTTP $HTTP_CODE)"
    fi
else
    print_status 1 "Commitment generation failed (HTTP $HTTP_CODE)"
fi

# Test 7: List All Surveys
print_step "Listing all surveys..."
LIST_RESPONSE=$(curl -s -X GET "$API_URL/surveys" \
  -w "%{http_code}")

HTTP_CODE="${LIST_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    print_status 0 "Survey list retrieved successfully"
else
    print_status 1 "Failed to list surveys (HTTP $HTTP_CODE)"
fi

echo
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  All tests completed successfully! ✓${NC}"
echo -e "${GREEN}===========================================${NC}"
echo
echo -e "${BLUE}Test Summary:${NC}"
echo "• Admin authentication: ✓"
echo "• Survey creation: ✓"
echo "• Public key retrieval: ✓"
echo "• Token generation: ✓"
echo "• Survey statistics: ✓"
echo "• Cryptographic operations: ✓"
echo "• Survey listing: ✓"
echo
echo -e "${BLUE}Next steps:${NC}"
echo "1. Try the full test suite: npm test"
echo "2. Open Prisma Studio: npx prisma studio"
echo "3. Check the detailed testing guide: LOCAL_TESTING.md"
echo "4. Test with Postman using the API documentation"

echo
echo -e "${YELLOW}Survey Created:${NC}"
echo "  ID: $SURVEY_ID"
echo "  URL: $BASE_URL/survey/$SURVEY_ID"
echo "  Admin can view at: $BASE_URL/admin/surveys/$SURVEY_ID" 