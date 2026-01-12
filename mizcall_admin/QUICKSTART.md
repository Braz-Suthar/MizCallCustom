# 🚀 Quick Start Guide

## 1. Generate Admin Password (One-time setup)

```bash
cd scripts
npm install
node generate_admin_hash.js YourSecurePassword123
```

Copy the output and add to your backend `.env` file.

## 2. Update Backend .env

Add these lines to `/backend/.env`:

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$...paste_hash_here...
```

## 3. Restart Backend

```bash
cd ../backend
npm start
```

## 4. Run Admin App

```bash
cd ../mizcall_admin

# Install dependencies (first time only)
flutter pub get

# Run on desktop
./run.sh

# Or manually:
flutter run -d macos     # macOS
flutter run -d windows   # Windows
flutter run -d linux     # Linux
```

## 5. Login

- **Username**: `admin`
- **Password**: (the password you used to generate the hash)

## That's it! 🎉

You now have access to:
- 📊 Dashboard with system stats
- 👥 Hosts management
- 🔍 Detailed host information
- 📝 System logs monitoring

## Troubleshooting

**Can't login?**
- Check backend is running: `curl http://localhost:3100/health`
- Verify .env has ADMIN_USERNAME and ADMIN_PASSWORD_HASH
- Check console for errors

**Build errors?**
```bash
flutter clean
flutter pub get
flutter run -d macos
```

**Need help?**
See [SETUP.md](SETUP.md) for detailed instructions.
