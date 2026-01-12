# Admin Panel Backend Setup

## Quick Setup for Admin Access

### 1. Generate Admin Password Hash

```bash
cd mizcall_admin/scripts
npm install
node generate_admin_hash.js YourSecurePassword123
```

This will output something like:
```
✅ Password hash generated successfully!

Add this to your backend .env file:

ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$abcdefghijklmnopqrstuvwxyz...
```

### 2. Update Backend .env

Add these lines to `/backend/.env`:

```bash
# Admin Panel Access
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$your_generated_hash_here
```

### 3. Restart Backend

```bash
cd backend
npm start
```

### 4. Test Admin Login

```bash
curl -X POST http://localhost:3100/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourSecurePassword123"}'
```

Expected response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id": "admin",
  "username": "admin",
  "name": "Administrator"
}
```

## Production Security

⚠️ **IMPORTANT**: For production:

1. **Use Strong Password**: At least 16 characters with mixed case, numbers, symbols
2. **Change Default Username**: Don't use "admin"
3. **IP Whitelist**: Restrict admin API access to specific IPs
4. **HTTPS Only**: Never use HTTP in production
5. **Token Expiration**: Set shorter expiration for admin tokens
6. **Audit Logging**: Log all admin actions
7. **2FA**: Consider adding 2FA for admin login

## API Endpoints Added

The following admin endpoints are now available:

- `POST /auth/admin/login` - Admin authentication
- `GET /admin/dashboard` - Dashboard statistics  
- `GET /admin/hosts` - List all hosts
- `GET /admin/hosts/:hostId` - Host details
- `GET /admin/hosts/:hostId/users` - Host's users
- `GET /admin/hosts/:hostId/calls` - Host's call history
- `GET /admin/hosts/:hostId/sessions` - Host's active sessions
- `GET /admin/logs` - System logs

All endpoints require admin authentication token in header:
```
Authorization: Bearer <admin_token>
```

## Development vs Production

### Development (.env)
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$simple_hash_for_testing
```

### Production (.env)
```bash
ADMIN_USERNAME=mizcall_super_admin_2026
ADMIN_PASSWORD_HASH=$2b$12$very_strong_hash_with_higher_rounds
ADMIN_ALLOWED_IPS=203.0.113.0,198.51.100.0
ADMIN_TOKEN_EXPIRY=8h
```

## Testing

Run this to verify everything works:

```bash
# 1. Backend health check
curl http://localhost:3100/health

# 2. Admin login
curl -X POST http://localhost:3100/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# 3. Get dashboard (use token from login)
curl http://localhost:3100/admin/dashboard \
  -H "Authorization: Bearer <token_from_step_2>"
```

## Notes

- Admin routes are separate from host/user routes
- Admin has full read access to all data
- Admin cannot be created via API (only via env or database)
- Admin tokens don't create sessions in database
- Admin role bypasses host/user session checks
