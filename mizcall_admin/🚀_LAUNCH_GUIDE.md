# 🚀 LAUNCH GUIDE - Ready to Run!

## ✅ Setup Complete!

Everything is installed and ready. Just follow these 3 steps:

---

## Step 1: Configure Backend (1 minute)

### Add admin credentials to backend

Create or edit `backend/.env` and add these lines:

```bash
# Admin Panel Access
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$rZ.4Hoa9Ory4PYv5wkcPKOGg8Cfay.PWpX6KCNjDkl.UedTGdKGo.
```

**Or copy the entire .env template:**

```bash
API_PORT=3100
JWT_SECRET=mizcall_dev_secret_change_in_production_2026

DB_HOST=localhost
DB_PORT=5432
DB_NAME=mizcall
DB_USER=postgres
DB_PASSWORD=postgres

ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$rZ.4Hoa9Ory4PYv5wkcPKOGg8Cfay.PWpX6KCNjDkl.UedTGdKGo.

MEDIASOUP_HOST=localhost
MEDIASOUP_PORT=4000

RECORDER_WS=ws://localhost:9000
```

---

## Step 2: Start Backend (30 seconds)

```bash
cd /Users/brazsuthar/Projects/Projects/MizCallCustom/backend
npm start
```

You should see:
```
MizCallCustom API + WS running on :3100
```

---

## Step 3: Launch Admin App (30 seconds)

Open a **new terminal** and run:

```bash
cd /Users/brazsuthar/Projects/Projects/MizCallCustom/mizcall_admin
/Users/brazsuthar/develop/flutter/bin/flutter run -d macos
```

Or use the shortcut:
```bash
cd /Users/brazsuthar/Projects/Projects/MizCallCustom/mizcall_admin
./run.sh
```

First launch takes ~1 minute. Subsequent runs: ~10 seconds.

---

## 🔑 Login Credentials

**Username**: `admin`  
**Password**: `admin123`

---

## 🎉 You're In!

After login, you'll see:

1. **Dashboard** - System stats, health monitoring
2. **Hosts** - All hosts with search
3. **Logs** - System logs with filters

Click **"Hosts"** → Click any host → See complete details!

---

## 🔄 Daily Usage

```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Admin App  
cd mizcall_admin && flutter run -d macos
```

---

## 💡 Pro Tips

**While app is running:**
- Press `r` for hot reload (instant UI updates)
- Press `R` for hot restart (full restart)
- Press `q` to quit

**Refresh data:**
- Click the "Refresh" button on any screen
- All data updates in real-time

**Search:**
- Use search bar on Hosts screen
- Search by ID, name, or email

**Filters:**
- On Logs screen, filter by level or service
- Click "Clear Filters" to reset

---

## 🛠️ Troubleshooting

### Backend won't start?
```bash
# Check if port 3100 is in use
lsof -i :3100

# Check database is running
psql -U postgres -c "SELECT 1"
```

### Login fails?
```bash
# Test login manually
curl -X POST http://localhost:3100/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Flutter errors?
```bash
flutter clean
flutter pub get
/Users/brazsuthar/develop/flutter/bin/flutter run -d macos
```

---

## 📱 Try Different Platforms

```bash
# macOS (best for admin)
flutter run -d macos

# Windows
flutter run -d windows

# Linux
flutter run -d linux

# iOS Simulator
flutter run -d ios

# Android Emulator
flutter run -d android

# List all available devices
flutter devices
```

---

## 🎯 What You Can Do

### Dashboard
- View total hosts, users, calls
- Monitor system health
- See active calls
- Check storage usage

### Hosts
- Browse all hosts
- Search by any field
- See user/call counts
- Access detailed views

### Host Details (Click any host)
- View complete profile
- See all users
- Browse call history
- Check active sessions
- Monitor security settings

### Logs
- Monitor system events
- Filter by severity
- Filter by service
- Debug issues

---

## 🔐 Change Admin Password

### For Production:

```bash
# 1. Generate new hash
cd scripts
node generate_admin_hash.js MyVerySecurePassword2026!

# 2. Copy the hash

# 3. Update backend/.env
ADMIN_PASSWORD_HASH=$2b$10$...new_hash...

# 4. Restart backend
cd ../backend
npm start
```

---

## 📚 Need More Help?

**Quick Reference:**
- [ENV_SETUP.md](ENV_SETUP.md) - Backend configuration
- [COMMANDS.md](COMMANDS.md) - All Flutter commands
- [SETUP.md](SETUP.md) - Detailed setup

**Issues?**
- Check backend console for API errors
- Run `flutter doctor` for Flutter issues
- See troubleshooting section above

---

## ✨ You're Ready!

Everything is set up and working. Just:

1. Add admin credentials to `backend/.env`
2. Start backend
3. Run admin app
4. Login and manage your system!

**Happy Managing!** 🎊

---

**Password for testing**: `admin123`  
**Hash**: `$2b$10$rZ.4Hoa9Ory4PYv5wkcPKOGg8Cfay.PWpX6KCNjDkl.UedTGdKGo.`

Copy this hash to `backend/.env` and you're good to go! 🚀
