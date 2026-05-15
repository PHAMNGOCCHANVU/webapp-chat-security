#!/usr/bin/env bash

# 🧪 Phase 3: RBAC Admin Endpoints Test Script
# Test admin panel endpoints with role-based access control

BASE_URL="http://localhost:3000/api/v1"

echo "=========================================="
echo "Phase 3: RBAC Admin Endpoints Test"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Register regular user
echo -e "\n${YELLOW}1. Register regular user${NC}"
curl -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@example.com",
    "username": "user1",
    "password": "UserPass123",
    "displayName": "User One"
  }' \
  -c cookies_user1.txt

# Test 2: Register admin user
echo -e "\n${YELLOW}2. Register admin user${NC}"
curl -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "username": "admin_user",
    "password": "AdminPass123",
    "displayName": "Admin User"
  }' \
  -c cookies_admin.txt

# Test 3: Try to access admin panel as regular user (should fail with 403)
echo -e "\n${YELLOW}3. Try accessing admin panel as regular user (should fail 403)${NC}"
curl -X GET $BASE_URL/admin/users \
  -b cookies_user1.txt

# Test 4: Login as admin
echo -e "\n${YELLOW}4. Login as admin${NC}"
curl -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin_user",
    "password": "AdminPass123"
  }' \
  -c cookies_admin.txt

# Note: At this point, admin user doesn't have ADMIN role yet
# In real scenario, you'd need to manually assign ADMIN role via database
# Or use a seed script that creates ADMIN role and assigns it during registration

echo -e "\n${YELLOW}5. Get system stats (requires ADMIN role)${NC}"
curl -X GET $BASE_URL/admin/stats \
  -b cookies_admin.txt

echo -e "\n${YELLOW}6. List all users (requires ADMIN role)${NC}"
curl -X GET $BASE_URL/admin/users \
  -b cookies_admin.txt

echo -e "\n${YELLOW}========================================== TESTS COMPLETED ============================================${NC}\n"
