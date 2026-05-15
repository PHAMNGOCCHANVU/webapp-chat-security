# 🎯 BACKEND API & SOCKET.IO REFERENCE - Complete

## 📊 Current Status

**Session Date**: May 15, 2026  
**Phases Completed**: 1, 2, 3, 4 ✅  
**Compilation**: ✅ SUCCESS (0 errors)  
**Database**: SQL Server (ZelegramDB)  
**API Port**: 3000  

---

## 🔐 Authentication Endpoints

### Public Endpoints (No Auth Required)

#### Register User
```
POST /api/v1/auth/register
Content-Type: application/json

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
```

#### Login
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "john_doe",
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

Note: Session cookie set automatically (connect.sid)
```

---

### Protected Endpoints (Auth Required)

#### Get Profile
```
GET /api/v1/auth/profile
Authorization: Session Cookie

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
  "createdAt": "2026-05-15T..."
}
```

#### Update Profile
```
PUT /api/v1/auth/profile
Content-Type: application/json

{
  "displayName": "John Updated",
  "avatarUrl": "https://example.com/avatar.jpg"
}

Response (200):
{
  "message": "Profile updated successfully",
  "user": { ... }
}
```

#### Change Password
```
POST /api/v1/auth/change-password
Content-Type: application/json

{
  "oldPassword": "SecurePass123",
  "newPassword": "NewSecurePass456",
  "confirmPassword": "NewSecurePass456"
}

Response (200):
{
  "message": "Password changed successfully"
}
```

#### Logout
```
POST /api/v1/auth/logout

Response (200):
{
  "message": "Logged out successfully"
}
```

---

## 🏢 Admin Panel Endpoints (Require ADMIN Role)

### User Management

#### List All Users
```
GET /api/v1/admin/users

Response (200):
[
  {
    "id": "uuid",
    "username": "john_doe",
    "displayName": "John Doe",
    "email": "user@example.com",
    "status": "ACTIVE",
    "roles": ["USER"],
    "createdAt": "2026-05-15T..."
  },
  ...
]
```

#### Update User Status
```
PATCH /api/v1/admin/users/:id/status
Content-Type: application/json

{
  "status": "LOCKED" | "ACTIVE"
}

Response (200):
{
  "id": "uuid",
  "username": "john_doe",
  "status": "LOCKED"
}
```

#### Change User Role
```
PATCH /api/v1/admin/users/:id/role
Content-Type: application/json

{
  "role": "ADMIN" | "USER"
}

Response (200):
{
  "id": "uuid",
  "username": "john_doe",
  "role": "ADMIN"
}
```

#### Delete User
```
DELETE /api/v1/admin/users/:id

Response (200):
{
  "message": "User deleted successfully",
  "user": {
    "id": "uuid",
    "username": "deleted_user",
    "email": "user@example.com"
  }
}
```

### Audit & Monitoring

#### Get Audit Logs
```
GET /api/v1/admin/audit-logs?action=LOGIN&actor=user-id

Response (200):
[
  {
    "id": "uuid",
    "actionType": "LOGIN",
    "targetTable": "User",
    "targetId": "uuid",
    "description": "User logged in",
    "ipAddress": "192.168.1.1",
    "actor": {
      "id": "uuid",
      "username": "admin",
      "displayName": "Admin User"
    },
    "createdAt": "2026-05-15T..."
  },
  ...
]
```

#### Get System Stats
```
GET /api/v1/admin/stats

Response (200):
{
  "totalUsers": 42,
  "activeUsers": 38,
  "admins": 3,
  "inactiveUsers": 4
}
```

---

## 💬 Chat Room Endpoints (Require Auth)

#### List Rooms
```
GET /api/v1/rooms

Response (200):
[
  {
    "id": "uuid",
    "conversationType": "GROUP",
    "conversationName": "General Chat",
    "creator": { id, username, displayName },
    "_count": { members: 5 },
    "messages": [...]
  },
  ...
]
```

#### Create Room
```
POST /api/v1/rooms
Content-Type: application/json

{
  "name": "Project Discussion",
  "isPrivate": false
}

Response (201):
{
  "id": "uuid",
  "conversationType": "GROUP",
  "conversationName": "Project Discussion",
  "creator": { ... },
  "members": [...]
}
```

#### Get Room Details
```
GET /api/v1/rooms/:id

Response (200):
{
  "id": "uuid",
  "conversationType": "GROUP",
  "conversationName": "General Chat",
  "creator": { ... },
  "members": [
    {
      "userId": "uuid",
      "user": { id, username, displayName }
    },
    ...
  ]
}
```

#### Get Room Messages (with Pagination)
```
GET /api/v1/rooms/:id/messages?limit=50&offset=0

Response (200):
[
  {
    "id": "uuid",
    "content": "Hello everyone!",
    "sender": { id, username, displayName },
    "createdAt": "2026-05-15T..."
  },
  ...
]
```

#### Add Member to Room
```
POST /api/v1/rooms/:id/members
Content-Type: application/json

{
  "userId": "uuid"
}

Response (201):
{
  "conversationId": "uuid",
  "userId": "uuid",
  "user": { id, username, displayName }
}
```

#### Remove Member from Room
```
DELETE /api/v1/rooms/:id/members/:userId

Response (200):
{
  "message": "Member removed successfully"
}
```

---

## 🔌 Socket.IO Real-Time Chat Events

### Connection
```javascript
const socket = io('http://localhost:3000', {
  withCredentials: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

socket.on('connect', () => {
  console.log('Connected to chat server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from chat server');
});

socket.on('error', (error) => {
  console.error('Connection error:', error);
});
```

### Room Management

#### Join Room
```javascript
socket.emit('join-room', 
  { conversationId: 'uuid' },
  (response) => {
    if (response.success) {
      console.log('Room info:', response.room);
      console.log('Users online:', response.usersOnline);
    }
  }
);

// Listen for user join
socket.on('user-joined', (data) => {
  console.log(data.username, 'joined');
  console.log('Users now:', data.usersOnline);
});
```

#### Leave Room
```javascript
socket.emit('leave-room', { conversationId: 'uuid' });

// Listen for user leave
socket.on('user-left', (data) => {
  console.log(data.username, 'left');
});
```

### Messaging

#### Send Message
```javascript
socket.emit('send-message',
  { 
    conversationId: 'uuid',
    content: 'Hello everyone!'
  },
  (response) => {
    if (response.success) {
      console.log('Message sent:', response.messageId);
    }
  }
);

// Listen for new messages
socket.on('new-message', (message) => {
  console.log(`${message.sender.username}: ${message.content}`);
  // {
  //   id: 'uuid',
  //   conversationId: 'uuid',
  //   content: 'Hello everyone!',
  //   sender: { id, username, displayName },
  //   createdAt: timestamp,
  //   updatedAt: timestamp
  // }
});
```

#### Get Message History
```javascript
socket.emit('get-message-history',
  { 
    conversationId: 'uuid',
    limit: 50,
    offset: 0
  },
  (response) => {
    if (response.success) {
      console.log('Messages:', response.messages);
      console.log('Count:', response.count);
    }
  }
);
```

### User Presence

#### Typing Indicator
```javascript
// Start typing
socket.emit('typing', { conversationId: 'uuid', isTyping: true });

// Stop typing
socket.emit('typing', { conversationId: 'uuid', isTyping: false });

// Listen for others typing
socket.on('user-typing', (data) => {
  console.log(data.username, data.isTyping ? 'is typing...' : 'stopped typing');
});
```

#### Get Active Users
```javascript
socket.emit('get-active-users',
  { conversationId: 'uuid' },
  (response) => {
    console.log('Users online:', response.users);
    // [
    //   { userId: 'uuid', username: 'user1' },
    //   { userId: 'uuid', username: 'user2' }
    // ]
  }
);
```

---

## 📋 HTTP Status Codes

| Status | Meaning | Example |
|--------|---------|---------|
| 200 | OK | Login successful, message sent |
| 201 | Created | User registered, room created |
| 400 | Bad Request | Invalid input, validation error |
| 401 | Unauthorized | Missing/invalid session |
| 403 | Forbidden | Insufficient role/permissions |
| 404 | Not Found | Room not found, user not found |
| 500 | Server Error | Database error |

---

## 🔒 Security Features

### Authentication
- ✅ Argon2id password hashing
- ✅ Express-session with HttpOnly cookies
- ✅ Secure flag (HTTPS in production)
- ✅ SameSite=strict CSRF protection

### Authorization
- ✅ Role-based access control (RBAC)
- ✅ Room membership verification
- ✅ Owner verification
- ✅ Admin role protection

### Audit & Compliance
- ✅ Comprehensive audit logging
- ✅ Track all operations
- ✅ IP address capture
- ✅ Actor identification

---

## 💾 Database Models

### User
```
- id (UUID PK)
- username (unique)
- email (unique)
- passwordHash
- displayName
- avatarUrl
- status (ACTIVE, LOCKED, BANNED)
- userRoles (M:M)
- sessions (1:M)
- messages (1:M)
- conversationMembers (1:M)
```

### Conversation
```
- id (UUID PK)
- conversationType (PRIVATE, GROUP)
- conversationName
- createdBy (FK to User)
- members (1:M)
- messages (1:M)
```

### Message
```
- id (UUID PK)
- conversationId (FK)
- senderId (FK to User)
- messageContent
- isDeleted
```

### AuditLog
```
- id (UUID PK)
- actorUserId (FK to User)
- actionType
- targetTable
- targetId
- actionStatus (SUCCESS, FAILED)
- ipAddress
```

---

## 🚀 Deployment Checklist

- [ ] Set NODE_ENV=production
- [ ] Update DATABASE_URL for production DB
- [ ] Set SESSION_SECRET to strong random string
- [ ] Update CORS_ORIGIN to production URL
- [ ] Enable HTTPS (Secure flag in cookies)
- [ ] Set up database backups
- [ ] Configure audit log retention
- [ ] Monitor error rates and logs
- [ ] Set up rate limiting alerts
- [ ] Configure SSL certificates

---

## 📚 Documentation Files

- `PHASE_2_AUTH.md` - Authentication & session management
- `PHASE_3_RBAC.md` - Role-based access control
- `PHASE_4_SOCKET_IO.md` - Real-time chat system
- `SESSION_SUMMARY.md` - This session's work

---

## ⚡ Quick Start (Testing)

```bash
# 1. Start backend
npm run dev

# 2. Register user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123",
    "displayName": "Test User"
  }'

# 3. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username": "testuser", "password": "TestPass123"}'

# 4. Get profile
curl http://localhost:3000/api/v1/auth/profile -b cookies.txt

# 5. Connect via Socket.IO (client-side)
const socket = io('http://localhost:3000', { withCredentials: true });
socket.emit('join-room', { conversationId: 'room-uuid' });
```

---

**✨ Complete Backend Reference - All Phases Implemented! 🎉**
