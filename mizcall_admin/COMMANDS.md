# Command Reference

## Initial Setup (Run Once)

```bash
# 1. Navigate to admin app
cd /Users/brazsuthar/Projects/Projects/MizCallCustom/mizcall_admin

# 2. Generate platform files
flutter create .

# 3. Install dependencies
flutter pub get

# 4. Generate admin password hash
cd scripts
npm install
node generate_admin_hash.js YourPassword123
cd ..

# 5. Update backend .env with the hash
# (Copy the output from step 4)
```

## Running the App

```bash
# Desktop (Recommended)
flutter run -d macos     # macOS
flutter run -d windows   # Windows
flutter run -d linux     # Linux

# Or use the convenience script
./run.sh

# Mobile
flutter run -d ios       # iOS
flutter run -d android   # Android

# List available devices
flutter devices
```

## Development

```bash
# Hot reload (while app is running)
r

# Hot restart (while app is running)
R

# Clear build cache
flutter clean

# Get dependencies
flutter pub get

# Update dependencies
flutter pub upgrade

# Check Flutter installation
flutter doctor

# Analyze code
flutter analyze
```

## Building for Production

```bash
# macOS
flutter build macos --release
# Output: build/macos/Build/Products/Release/mizcall_admin.app

# Windows  
flutter build windows --release
# Output: build\windows\runner\Release\

# Linux
flutter build linux --release
# Output: build/linux/x64/release/bundle/

# iOS
flutter build ios --release
# Then open Xcode to create IPA

# Android
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk

# Android App Bundle
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab
```

## Backend Commands

```bash
# Generate admin password
cd mizcall_admin/scripts
node generate_admin_hash.js MyPassword

# Start backend
cd ../../backend
npm start

# Test admin login
curl -X POST http://localhost:3100/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test dashboard endpoint (use token from login)
curl http://localhost:3100/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Testing

```bash
# Run all tests
flutter test

# Run specific test
flutter test test/widget_test.dart

# Run with coverage
flutter test --coverage

# View coverage report
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

## Debugging

```bash
# Enable verbose logging
flutter run -d macos -v

# Profile mode (performance testing)
flutter run --profile

# Debug mode (default)
flutter run --debug

# Release mode
flutter run --release
```

## Maintenance

```bash
# Update Flutter
flutter upgrade

# Clean project
flutter clean

# Repair pub cache
flutter pub cache repair

# Get outdated packages
flutter pub outdated

# Update all packages
flutter pub upgrade --major-versions
```

## Platform-Specific

### macOS

```bash
# Open in Xcode
open macos/Runner.xcworkspace

# Build for App Store
flutter build macos --release

# Run on specific device
flutter run -d macos
```

### Windows

```bash
# Build
flutter build windows --release

# Run
flutter run -d windows
```

### Linux

```bash
# Build
flutter build linux --release

# Run
flutter run -d linux
```

## Useful Shortcuts

| Command | Description |
|---------|-------------|
| `r` | Hot reload |
| `R` | Hot restart |
| `q` | Quit |
| `h` | Help |
| `c` | Clear console |
| `d` | Detach (keep app running) |

## Environment Variables

Create `.env` in project root (optional):

```bash
# Development
API_URL=http://localhost:3100
LOG_LEVEL=debug

# Production
API_URL=https://custom.mizcall.com
LOG_LEVEL=error
```

## Quick Reference

```bash
# Full setup from scratch
flutter create .
flutter pub get
./run.sh

# Clean rebuild
flutter clean
flutter pub get
flutter run -d macos

# Production build
flutter build macos --release

# Check everything
flutter doctor -v
```

---

**Save this file for quick reference!** 📌
