# 🔑 Backend .env Configuration

## Quick Setup

Create or update `backend/.env` with these values:

```bash
# Copy this entire block to backend/.env

# API Configuration
API_PORT=3100
JWT_SECRET=mizcall_dev_secret_change_in_production_2026

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mizcall
DB_USER=postgres
DB_PASSWORD=postgres

# ⭐ Admin Panel Credentials ⭐
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$rZ.4Hoa9Ory4PYv5wkcPKOGg8Cfay.PWpX6KCNjDkl.UedTGdKGo.

# Mediasoup Configuration
MEDIASOUP_HOST=localhost
MEDIASOUP_PORT=4000

# Recorder Configuration
RECORDER_WS=ws://localhost:9000
```

## Admin Login Credentials

**Username**: `admin`  
**Password**: `admin123`

⚠️ **IMPORTANT**: Change these in production!

## Generate Your Own Password Hash

```bash
cd mizcall_admin/scripts
node generate_admin_hash.js YourSecurePassword123
```

Copy the hash output and replace `ADMIN_PASSWORD_HASH` value in backend/.env

## Verify Setup

```bash
# 1. Start backend
cd backend
npm start

# 2. Test admin login
curl -X POST http://localhost:3100/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Should return:
# {
#   "token": "eyJhbGci...",
#   "id": "admin",
#   "username": "admin",
#   "name": "Administrator"
# }
```

## Common Issues

**"Admin authentication not configured"**
- Make sure `ADMIN_PASSWORD_HASH` is set in .env
- Restart backend after adding .env variables

**"Invalid credentials"**
- Check username matches `ADMIN_USERNAME` in .env
- Verify password hash is correct
- Password is case-sensitive

**Backend won't start**
- Check database credentials are correct
- Ensure PostgreSQL is running
- Check port 3100 is available

---

## ✅ Ready to Launch!

Once `.env` is configured:

```bash
# Start backend
cd backend
npm start

# In another terminal, run admin app
cd mizcall_admin
flutter run -d macos
```

Login with: `admin` / `admin123`
