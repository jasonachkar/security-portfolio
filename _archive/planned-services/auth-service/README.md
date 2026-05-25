# Auth Service

Central authentication and authorization service for the security platform.

## Features

- **Multi-user Authentication**: JWT-based authentication with access and refresh tokens
- **RBAC (Role-Based Access Control)**: Admin, Analyst, and Auditor roles with granular permissions
- **User Management**: CRUD operations for users and roles
- **Audit Logging**: Immutable audit trail of all user actions
- **Session Management**: Track and revoke active sessions

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user (Admin only)
- `POST /api/auth/login` - Login and receive JWT tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Revoke session
- `GET /api/auth/me` - Get current user info
- `PUT /api/auth/me` - Update current user profile

### User Management
- `GET /api/auth/users` - List users
- `GET /api/auth/users/{id}` - Get user details
- `PUT /api/auth/users/{id}` - Update user (Admin only)
- `DELETE /api/auth/users/{id}` - Deactivate user (Admin only)

### Roles & Permissions
- `GET /api/auth/roles` - List roles
- `GET /api/auth/roles/{id}` - Get role with permissions

### Audit
- `GET /api/auth/audit` - View audit logs (Admin/Auditor only)

## Default Roles

1. **Admin**: Full access to all resources and actions
2. **Analyst**: Can create/read scans, assessments, alerts; cannot manage users
3. **Auditor**: Read-only access to all data including audit logs

## Environment Variables

```bash
APP_ENV=local
LOG_LEVEL=INFO
DATABASE_URL=postgresql://user:pass@localhost:5432/auth_db
JWT_SECRET=your-secret-key-here
```

## Running

```bash
# Development
uvicorn auth_service.api.main:app --reload --port 8083

# Production
uvicorn auth_service.api.main:app --host 0.0.0.0 --port 8083
```
