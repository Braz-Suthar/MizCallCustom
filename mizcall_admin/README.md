# MizCall Admin Panel

A Flutter-based admin panel for managing the MizCall system - hosts, users, calls, and system logs.

## Features

- 🔐 **Secure Authentication** - Admin login with token-based auth
- 📊 **Dashboard** - Real-time system statistics and health monitoring
- 👥 **Host Management** - View all hosts with detailed information
- 🔍 **Host Details** - Deep dive into host data (users, calls, sessions)
- 📝 **System Logs** - Monitor and filter system logs in real-time

## Getting Started

### Prerequisites

- Flutter SDK (3.2.0 or higher)
- Dart SDK
- For mobile: Android Studio / Xcode
- For desktop: Platform-specific build tools

### Installation

1. **Install dependencies**
   ```bash
   cd mizcall_admin
   flutter pub get
   ```

2. **Configure API endpoint** (if needed)
   Edit `lib/config/app_config.dart` to set your backend URL:
   ```dart
   static const String apiBaseUrl = 'https://custom.mizcall.com';
   ```

3. **Run the app**
   
   **Desktop (recommended for admin):**
   ```bash
   # macOS
   flutter run -d macos
   
   # Windows
   flutter run -d windows
   
   # Linux
   flutter run -d linux
   ```
   
   **Mobile:**
   ```bash
   # iOS
   flutter run -d ios
   
   # Android
   flutter run -d android
   ```

### Building for Production

**macOS:**
```bash
flutter build macos --release
```

**Windows:**
```bash
flutter build windows --release
```

**Linux:**
```bash
flutter build linux --release
```

**iOS:**
```bash
flutter build ios --release
```

**Android:**
```bash
flutter build apk --release
# or
flutter build appbundle --release
```

## Project Structure

```
lib/
├── config/           # App configuration and theme
│   ├── app_config.dart
│   ├── theme.dart
│   └── routes.dart
├── models/           # Data models
│   ├── admin_user.dart
│   ├── host.dart
│   ├── dashboard_stats.dart
│   └── log_entry.dart
├── screens/          # UI screens
│   ├── login_screen.dart
│   ├── main_layout.dart
│   ├── dashboard_screen.dart
│   ├── hosts_screen.dart
│   ├── host_details_screen.dart
│   └── logs_screen.dart
├── services/         # Business logic and API
│   ├── api_service.dart
│   └── auth_service.dart
├── widgets/          # Reusable widgets
│   └── stat_card.dart
└── main.dart         # App entry point
```

## Admin Credentials

Admin credentials should be configured on the backend:
- Via environment variables, or
- Direct database entry

Default development credentials (if configured):
- Username: `admin`
- Password: `admin123` (change in production!)

## API Endpoints Used

- `POST /auth/admin/login` - Admin authentication
- `GET /admin/dashboard` - Dashboard statistics
- `GET /admin/hosts` - List all hosts
- `GET /admin/hosts/:hostId` - Host details
- `GET /admin/hosts/:hostId/users` - Host's users
- `GET /admin/hosts/:hostId/calls` - Host's calls
- `GET /admin/hosts/:hostId/sessions` - Host's sessions
- `GET /admin/logs` - System logs

## Security Notes

⚠️ **Important Security Considerations:**

1. **Admin Access**: This app has full system access. Distribute carefully.
2. **Credentials**: Never commit admin credentials to version control.
3. **HTTPS**: Always use HTTPS in production.
4. **Token Storage**: Tokens are stored securely using platform-specific secure storage.
5. **Session Management**: Implement proper token refresh and expiration.

## Development

### Hot Reload

During development, use hot reload:
```bash
# Press 'r' in terminal to hot reload
# Press 'R' in terminal to hot restart
```

### Debugging

Enable debug mode in VS Code or Android Studio for:
- Breakpoints
- Variable inspection
- Performance profiling

## Troubleshooting

**Issue**: "Flutter command not found"
- Ensure Flutter is in your PATH
- Run `flutter doctor` to check installation

**Issue**: Build failures
- Run `flutter clean` then `flutter pub get`
- Check platform-specific requirements with `flutter doctor`

**Issue**: API connection errors
- Verify backend is running
- Check API_BASE_URL in app_config.dart
- Ensure network permissions are set

## License

Proprietary - MizCall Internal Use Only
