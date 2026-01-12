# 🎯 START HERE - MizCall Admin Panel

## ⚡ Quick 5-Minute Setup

### Step 1: Initialize Flutter Project
```bash
cd /Users/brazsuthar/Projects/Projects/MizCallCustom/mizcall_admin
flutter create .
flutter pub get
```
**Time**: ~2 minutes

---

### Step 2: Set Admin Password
```bash
cd scripts
npm install
node generate_admin_hash.js admin123
```

**Copy the output** and add to `backend/.env`:
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<paste_hash_here>
```

**Time**: ~1 minute

---

### Step 3: Restart Backend
```bash
cd ../../backend
npm start
```
**Time**: ~30 seconds

---

### Step 4: Run Admin App
```bash
cd ../mizcall_admin
flutter run -d macos
```
**Time**: ~1 minute (first run), ~10 seconds (subsequent runs)

---

### Step 5: Login
- **Username**: `admin`
- **Password**: `admin123` (or whatever you used in Step 2)

---

## ✅ That's It!

You now have a fully functional admin panel! 🎉

---

## 🎮 What You Can Do Now

1. **📊 Dashboard** - View system statistics
2. **👥 Hosts** - Browse all hosts, click to see details
3. **🔍 Host Details** - See users, calls, sessions for each host
4. **📝 Logs** - Monitor system logs with filters

---

## 📚 Need More Info?

- **Quick commands**: [COMMANDS.md](COMMANDS.md)
- **Detailed setup**: [SETUP.md](SETUP.md)
- **Features**: [README.md](README.md)
- **Project overview**: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

---

## 🆘 Troubleshooting

**Can't run Flutter?**
```bash
flutter doctor
```

**Login fails?**
- Check backend is running: `curl http://localhost:3100/health`
- Verify .env has ADMIN_USERNAME and ADMIN_PASSWORD_HASH
- Check backend console for errors

**Build issues?**
```bash
flutter clean
flutter pub get
flutter run -d macos
```

---

## 🔐 Default Credentials (Development Only)

For testing, use:
- **Username**: `admin`
- **Password**: `admin123`

**Hash for `admin123`**:
```
$2b$10$N9qo8uLOickgx2ZZVlL79eP3zGvyB7kYhwVBdRWZGqrTQ7g3VQGLa
```

⚠️ **CHANGE THIS IN PRODUCTION!**

---

## 🚀 Ready to Go!

Start with Step 1 above and you'll be managing your MizCall system in minutes.

**Happy Managing!** 😊
