# 🔐 Phase 2: Authentication & Session Management - Implementation Guide

## Status: ✅ IMPLEMENTATION COMPLETED

### 2.1 Password Hashing (Argon2id)  
✅ **File**: `src/utils/password.ts`
- ✅ `hashPassword()` - Hash password with Argon2id (19MB memory, 2 iterations)
- ✅ `verifyPassword()` - Verify password against hash with error handling

### 2.2 Session Configuration (Express-session)
✅ **File**: `src/config/session.ts`
- ✅ Installed `@quixo3/prisma-session-store` for Prisma-based session storage
- ✅ Session persisted to SQL Server database
- ✅ Configured:
  - HttpOnly cookies (XSS protection)
  - Secure flag (HTTPS in production)
  - SameSite: strict (CSRF protection)
  - Max age: 24 hours
  - Auto-prune expired sessions every 2 minutes

### 2.3 Validation Schemas (Zod)
✅ **File**: `src/services/validators.ts`
- ✅ `RegisterSchema` - Email, username (alphanumeric + underscore), password (8+ chars, upper, lower, number), displayName
- ✅ `LoginSchema` - Username/email + password
- ✅ `UpdateProfileSchema` - Update displayName, avatarUrl
- ✅ `ChangePasswordSchema` - Old password, new password, confirm password

### 2.4 Auth Service
✅ **File**: `src/services/auth.service.ts`
- ✅ `AuthService.register()` - Create user with USER role, hash password
- ✅ `AuthService.login()` - Verify credentials, check account status (ACTIVE/LOCKED/BANNED)
- ✅ `AuthService.getUserProfile()` - Fetch user with roles & permissions
- ✅ `AuthService.updateProfile()` - Update displayName & avatarUrl
- ✅ `AuthService.changePassword()` - Verify old password, hash new password
- ✅ `AuthService.hasRole()` - Check if user has specific role
- ✅ `AuthService.hasPermission()` - Check if user has specific permission

### 2.5 Auth Controller
✅ **File**: `src/controllers/auth.controller.ts`
- ✅ `POST /auth/register` - Register new user + audit log
- ✅ `POST /auth/login` - Login + session creation + audit log
- ✅ `POST /auth/logout` - Destroy session + audit log
- ✅ `GET /auth/profile` - Get current user profile (requires auth)
- ✅ `PUT /auth/profile` - Update profile (requires auth)
- ✅ `POST /auth/change-password` - Change password (requires auth)

### 2.6 Auth Routes  
✅ **File**: `src/routes/auth.routes.ts`
- ✅ Route configuration with proper HTTP methods
- ✅ **Rate limiting**:
  - Register: 3 attempts per hour per IP
  - Login: 5 attempts per 15 minutes per IP
- ✅ Protected routes require `requireAuth` middleware

### 2.7 Auth Middleware
✅ **File**: `src/middlewares/auth.middleware.ts`
- ✅ `requireAuth` - Verify session.userId exists
- ✅ Returns 401 if unauthorized

✅ **File**: `src/middlewares/role.middleware.ts`
- ✅ `requireRole(roleName)` - Check if user has specific role
- ✅ Uses `AuthService.hasRole()` to verify
- ✅ Returns 403 if forbidden

### 2.8 Type Definitions
✅ **File**: `src/types/express-session.d.ts`
- ✅ `SessionData` interface with `userId` and `username`

### 2.9 App Integration
✅ **File**: `src/app.ts`
- ✅ Session middleware configured and mounted
- ✅ Auth routes registered at `/api/v1/auth`
- ✅ CORS configured with credentials: true

---

## 📝 API Endpoints Specification

### Public Endpoints (No Auth Required)

#### `POST /api/v1/auth/register`
```json
Request:
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "SecurePass123",
  "displayName": "John Doe"
}

Response (201):
{
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "john_doe",
    "displayName": "John Doe",
    "status": "ACTIVE"
  }
}

Response (400):
{
  "error": "Email already registered" | "Username already taken"
}
```

#### `POST /api/v1/auth/login`
```json
Request:
{
  "username": "john_doe",  // or email
  "password": "SecurePass123"
}

Response (200):
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "displayName": "John Doe",
    "email": "user@example.com",
    "status": "ACTIVE"
  }
}

Response (401):
{
  "error": "Invalid username/email or password"
}
```

---

### Protected Endpoints (Requires Auth)

#### `POST /api/v1/auth/logout`
```
Header: Cookie: connect.sid=<session_id>

Response (200):
{
  "message": "Logged out successfully"
}
```

#### `GET /api/v1/auth/profile`
```
Header: Cookie: connect.sid=<session_id>

Response (200):
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "john_doe",
  "displayName": "John Doe",
  "avatarUrl": "https://...",
  "status": "ACTIVE",
  "roles": ["USER"],
  "permissions": ["SEND_MESSAGE", "CREATE_GROUP"],
  "createdAt": "2026-05-15T...",
  "updatedAt": "2026-05-15T..."
}
```

#### `PUT /api/v1/auth/profile`
```json
Request:
{
  "displayName": "John Updated",
  "avatarUrl": "https://example.com/avatar.jpg"
}

Response (200):
{
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "username": "john_doe",
    "displayName": "John Updated",
    "email": "user@example.com",
    "avatarUrl": "https://example.com/avatar.jpg",
    "updatedAt": "2026-05-15T..."
  }
}
```

#### `POST /api/v1/auth/change-password`
```json
Request:
{
  "oldPassword": "SecurePass123",
  "newPassword": "NewSecurePass456",
  "confirmPassword": "NewSecurePass456"
}

Response (200):
{
  "message": "Password changed successfully"
}

Response (400):
{
  "error": "Current password is incorrect"
}
```

---

## 🔒 Security Features

✅ **Password Security**
- Argon2id hashing with strong parameters
- Timing attack resistance

✅ **Session Security**
- HttpOnly cookies (prevents XSS theft)
- Secure flag (HTTPS only in production)
- SameSite=strict (prevents CSRF)
- Server-side session storage
- Auto-expiration after 24 hours

✅ **Input Validation**
- Zod schemas for all inputs
- Email format validation
- Password strength requirements
- Username format restriction

✅ **Audit Logging**
- Register, login, logout, profile changes logged
- Failed attempts logged
- IP address & timestamp captured

✅ **Account Status**
- ACTIVE, LOCKED, BANNED states
- Prevents login for locked/banned accounts

---

## 🧪 Testing Endpoints

### Using cURL

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123",
    "displayName": "Test User"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "testuser",
    "password": "TestPass123"
  }'

# Get Profile
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -b cookies.txt
```

### Using Postman
1. Set request to POST `/api/v1/auth/login`
2. Go to "Cookies" tab → enable "cookie jar"
3. Send login request (cookies auto-saved)
4. Now make requests to protected endpoints (cookies auto-sent)

---

## 📊 Database Changes

New table created automatically via Prisma:
- ✅ `Session` - Stores express-session data

Existing tables with new relationships:
- ✅ `User` - No changes to base schema
- ✅ `UserRole` - Used for role assignment
- ✅ `AuditLog` - Records auth actions

---

## 📦 Dependencies Installed

- ✅ `argon2` - Password hashing
- ✅ `express-session` - Session management
- ✅ `@quixo3/prisma-session-store` - Prisma session store
- ✅ `zod` - Input validation  
- ✅ `express-rate-limit` - Rate limiting
- ✅ `@types/express-session` - TypeScript types

---

## 🚀 Commands

```bash
# Start development server
npm run dev

# Build TypeScript
npm run build

# Start production server
npm run start

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

---

## ⚠️ Known Issues & Next Steps

### Compilation Errors (Non-Auth)
- admin.service.ts - Uses old schema (will fix in Phase 3)
- room.service.ts - References old model names (will fix in Phase 3)
- socket/chat.handler.ts - Uses old schema (will fix in Phase 4)

### Phase 2 Is Complete ✅
All auth functionality is implemented and ready for testing. Admin, room, and chat features will be implemented in Phase 3-4.

---

## 📝 Phase 2 Checklist

- ✅ Password hashing (Argon2id)
- ✅ Express-session configuration
- ✅ Prisma session store integration
- ✅ Zod validation schemas
- ✅ Auth service (register, login, logout, profile)
- ✅ Auth controller (all endpoints)
- ✅ Auth routes with rate limiting
- ✅ requireAuth & requireRole middleware
- ✅ Audit logging for auth events
- ✅ Session type definitions
- ✅ App integration

**Estimated Time**: 12-15 hours  
**Actual Implementation Time**: [To be measured]

---

**Ready for Phase 3: RBAC Middleware! 🎯**
