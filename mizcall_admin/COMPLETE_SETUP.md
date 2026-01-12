# 🎯 Complete Setup Instructions

## Step 1: Initialize Flutter Project (Required)

Since the Flutter CLI needs to generate platform-specific files, run this command **once**:

```bash
cd /Users/brazsuthar/Projects/Projects/MizCallCustom/mizcall_admin
flutter create .
```

This will generate the necessary platform folders (android, ios, macos, windows, linux).

**Note**: This won't overwrite existing files in `lib/` folder.

## Step 2: Install Dependencies

```bash
flutter pub get
```

## Step 3: Configure Backend

### Option A: Environment Variables (Recommended)

1. Generate admin password hash:
```bash
cd scripts
npm install
node generate_admin_hash.js YourSecurePassword123
```

2. Copy the hash and add to `backend/.env`:
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$...your_hash_here...
```

3. Restart backend:
```bash
cd ../backend
npm start
```

### Option B: Use Default (Development Only)

For quick testing, you can use these default credentials:

**Username**: `admin`  
**Password**: `admin123`

Hash for `admin123`:
```
$2b$10$N9qo8uLOickgx2ZZVlL79eP3zGvyB7kYhwVBdRWZGqrTQ7g3VQGLa
```

Add to `backend/.env`:
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$N9qo8uLOickgx2ZZVlL79eP3zGvyB7kYhwVBdRWZGqrTQ7g3VQGLa
```

## Step 4: Run the Admin App

### Desktop (Recommended)

```bash
# macOS
flutter run -d macos

# Windows
flutter run -d windows

# Linux
flutter run -d linux
```

### Mobile (Optional)

```bash
# iOS
flutter run -d ios

# Android
flutter run -d android
```

### Or use the convenience script:

```bash
./run.sh
```

## Step 5: Login

1. App will start and show login screen
2. Enter credentials:
   - **Username**: `admin`
   - **Password**: (your password)
3. Click "Sign In"

## Step 6: Explore Features

After login, you'll have access to:

### 📊 Dashboard
- Total hosts, users, calls statistics
- System health monitoring
- Active calls count
- Real-time metrics

### 👥 Hosts
- List all hosts in the system
- Search and filter hosts
- View host details
- See user count per host

### 🔍 Host Details
- Complete host information
- All users under that host
- Call history
- Active sessions
- Security settings

### 📝 Logs
- System logs monitoring
- Filter by level (INFO, WARN, ERROR, DEBUG)
- Filter by service (backend, mediasoup, database)
- Real-time log updates

## Production Build

When ready to deploy:

```bash
# macOS app
flutter build macos --release

# Windows executable
flutter build windows --release

# Linux binary
flutter build linux --release
```

## File Structure

```
mizcall_admin/
├── lib/
│   ├── config/          # App configuration
│   │   ├── app_config.dart
│   │   ├── routes.dart
│   │   └── theme.dart
│   ├── models/          # Data models
│   │   ├── admin_user.dart
│   │   ├── dashboard_stats.dart
│   │   ├── host.dart
│   │   └── log_entry.dart
│   ├── screens/         # UI screens
│   │   ├── login_screen.dart
│   │   ├── main_layout.dart
│   │   ├── dashboard_screen.dart
│   │   ├── hosts_screen.dart
│   │   ├── host_details_screen.dart
│   │   └── logs_screen.dart
│   ├── services/        # API & Business logic
│   │   ├── api_service.dart
│   │   └── auth_service.dart
│   ├── widgets/         # Reusable widgets
│   │   └── stat_card.dart
│   └── main.dart        # App entry point
├── scripts/             # Utility scripts
│   ├── generate_admin_hash.js
│   └── package.json
├── test/                # Tests
├── pubspec.yaml         # Dependencies
├── QUICKSTART.md        # Quick start guide
├── SETUP.md             # Detailed setup
└── README.md            # Documentation
```

## Troubleshooting

### Flutter Command Not Found
```bash
# Add Flutter to PATH
export PATH="$PATH:/path/to/flutter/bin"

# Or add permanently to ~/.zshrc or ~/.bashrc
echo 'export PATH="$PATH:$HOME/Desktop/flutter/bin"' >> ~/.zshrc
source ~/.zshrc
```

### Backend Connection Failed
1. Check backend is running: `curl http://localhost:3100/health`
2. Verify API URL in `lib/config/app_config.dart`
3. Check CORS settings allow Flutter app

### Build Errors
```bash
flutter clean
flutter pub get
flutter doctor
```

### Missing Platform Files
```bash
# Regenerate platform files
flutter create . --platforms=macos,windows,linux,android,ios
```

## Security Notes

⚠️ **Production Checklist:**

- [ ] Change default admin password
- [ ] Use strong password (16+ characters)
- [ ] Store in environment variables
- [ ] Use HTTPS for API
- [ ] Enable firewall rules
- [ ] Add IP whitelist
- [ ] Implement audit logging
- [ ] Set token expiration
- [ ] Regular security audits

## Support

For issues or questions:
1. Check [SETUP.md](SETUP.md) for detailed setup
2. See [README.md](README.md) for features
3. Check backend logs for API errors
4. Run `flutter doctor` for Flutter issues

---

**Ready to manage your MizCall system!** 🎉
