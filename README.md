# ZALEGRAM

ZALEGRAM is a secure realtime chat web application built with React, Express, Prisma, SQL Server, and Socket.IO.

Main features:

- realtime 1-1 chat and group chat
- admin dashboard with RBAC
- audit logging
- hybrid authentication:
  - JWT access token for REST API
  - refresh token in HttpOnly cookie
  - server-side session for session tracking and Socket.IO

## Project structure

```text
webapp-chat-security/
|-- backend/
|-- frontend/
|-- database/
|-- .env.example
|-- prepare-demo.bat
|-- start-demo.bat
|-- stop-demo.bat
```

## Requirements

Install these first:

1. Node.js 18 or newer
2. Microsoft SQL Server
3. A SQL Server account that can access the target database

Optional:

- `Enable-SQL-TCP.ps1` can help when SQL Server Express is not reachable over TCP.

## Create backend/.env

Copy the sample file:

```powershell
Copy-Item .env.example backend/.env
```

Then update `backend/.env` for your machine.

Minimum required values:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="sqlserver://localhost:1433;database=ZalegramDB;user=sa;password=YourPassword123;trustServerCertificate=true"
ENCRYPTION_KEY="64_hex_characters_here"
SESSION_SECRET="your_long_random_session_secret_here"
JWT_SECRET="your_long_random_jwt_secret_here"
JWT_REFRESH_SECRET="your_long_random_refresh_secret_here"
ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:4000,http://127.0.0.1:4000"
```

Quick secret generator:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Notes:

- `ENCRYPTION_KEY` must be exactly 64 hex characters.
- `JWT_SECRET` and `JWT_REFRESH_SECRET` must be different.
- Use long random values for every secret.

## Fastest way to run

This is the recommended path for demo, presentation, or grading.

### 1. Prepare the build

```powershell
.\prepare-demo.bat
```

This script:

- installs dependencies if needed
- applies Prisma migrations
- repairs older database schemas
- builds frontend and backend

### 2. Start the demo server

```powershell
.\start-demo.bat
```

Open:

- `http://127.0.0.1:4000/`

### 3. Stop the demo server

```powershell
.\stop-demo.bat
```

## Development mode

### Backend

```powershell
cd backend
npm install
npm run db:repair
npm run dev
```

Backend URL:

- `http://localhost:4000`

### Frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:

- `http://localhost:5173`

## Default accounts

If the database has already been seeded:

- Admin: `Admin` / `Admin@123`
- Demo user: `user_demo` / `User@123`

If those accounts do not exist:

```powershell
cd backend
npx prisma db seed
```

## Useful commands

Backend:

```powershell
cd backend
npm run dev
npm run build
npm run start
npm run db:repair
npm run db:seed
```

Frontend:

```powershell
cd frontend
npm run dev
npm run build
```

## Authentication note

The current codebase is not pure session-only authentication.

Actual implementation today:

- REST API uses JWT access tokens
- refresh token is stored in an HttpOnly cookie
- `express-session` is still used for server-side session management
- Socket.IO uses the session cookie

If you write a report or handover document, describe the project as a hybrid authentication design unless the code is refactored later.

## Common issues

### Prisma says a column does not exist

Run:

```powershell
cd backend
npm run db:repair
```

### Admin page is blank

Rebuild the frontend and restart the demo:

```powershell
cd frontend
npm.cmd run build
```

### PowerShell blocks npm.ps1

Use `npm.cmd` instead of `npm`:

```powershell
npm.cmd run build
```

### Too many login attempts

Use `start-demo.bat`. Demo mode relaxes the login rate limit automatically.

## Quick review flow

For the simplest Windows review flow:

1. create `backend/.env`
2. run `.\prepare-demo.bat`
3. run `.\start-demo.bat`
4. open `http://127.0.0.1:4000/`
5. log in with `Admin / Admin@123`

That is the shortest supported path to run the system.
