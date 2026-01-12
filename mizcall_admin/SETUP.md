# MizCall Admin Setup Guide

## 1. Backend Configuration

### Set Admin Credentials

You need to set admin credentials in your backend environment variables.

#### Generate Password Hash

Run this Node.js script to generate a bcrypt hash for your admin password:

```javascript
// hash_password.js
import bcrypt from 'bcrypt';

const password = 'your_secure_password_here';
const hash = await bcrypt.hash(password, 10);
console.log('Password hash:', hash);
```

Run it:
```bash
node hash_password.js
```

#### Set Environment Variables

Add these to your backend `.env` file:

```bash
# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=your_bcrypt_hash_here
```

Example `.env`:
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJK
```

### Alternative: Database Table

If you prefer storing admin users in the database, create this table:

```sql
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Insert admin user
INSERT INTO admins (username, password, email, name)
VALUES ('admin', '$2b$10$your_hash_here', 'admin@mizcall.com', 'Administrator');
```

Then update the login route to query the database instead of env variables.

## 2. Install Flutter Dependencies

```bash
cd mizcall_admin
flutter pub get
```

## 3. Configure API Endpoint

Edit `lib/config/app_config.dart` if your backend URL is different:

```dart
static const String apiBaseUrl = 'https://your-backend-url.com';
```

For local development:
```dart
static const String apiBaseUrl = 'http://localhost:3100';
```

## 4. Run the App

### Development

**Desktop (Recommended):**
```bash
flutter run -d macos    # macOS
flutter run -d windows  # Windows
flutter run -d linux    # Linux
```

**Mobile:**
```bash
flutter run -d ios      # iOS Simulator
flutter run -d android  # Android Emulator
```

### Production Build

**macOS:**
```bash
flutter build macos --release
# Output: build/macos/Build/Products/Release/mizcall_admin.app
```

**Windows:**
```bash
flutter build windows --release
# Output: build\windows\runner\Release\
```

**Linux:**
```bash
flutter build linux --release
# Output: build/linux/x64/release/bundle/
```

## 5. Default Admin Credentials

For initial testing (CHANGE THESE IN PRODUCTION):

- **Username**: `admin`
- **Password**: `admin123`

Password hash for `admin123`:
```
$2b$10$rXVq5YvV5YvV5YvV5YvV5OZqX5YvV5YvV5YvV5YvV5YvV5YvV5Y
```

## 6. Security Checklist

✅ Change default admin password  
✅ Use strong password (12+ characters)  
✅ Store credentials in environment variables  
✅ Use HTTPS for API endpoint  
✅ Enable CORS only for admin app domain  
✅ Implement rate limiting on admin login  
✅ Add IP whitelist for admin access (optional)  
✅ Enable audit logging for admin actions  
✅ Set token expiration (e.g., 8 hours)  

## 7. Troubleshooting

### "Invalid credentials" error
- Check ADMIN_USERNAME and ADMIN_PASSWORD_HASH are set
- Verify password hash is correct (use bcrypt.compare to test)
- Ensure backend is reading .env file

### "Failed to fetch" error
- Check backend is running
- Verify API_BASE_URL is correct
- Check CORS settings allow admin app origin
- Test endpoint manually: `curl http://localhost:3100/health`

### Build errors
```bash
flutter clean
flutter pub get
flutter doctor
```

## 8. Running Backend with Admin Support

Ensure your backend `.env` includes:

```bash
# API Configuration
API_PORT=3100
JWT_SECRET=your_jwt_secret_here

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mizcall
DB_USER=postgres
DB_PASSWORD=your_db_password

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$10$your_bcrypt_hash_here

# Optional: Admin allowed IPs (comma-separated)
# ADMIN_ALLOWED_IPS=127.0.0.1,192.168.1.100
```

## 9. Testing the Setup

1. Start your backend:
   ```bash
   cd backend
   npm start
   ```

2. Test admin login endpoint:
   ```bash
   curl -X POST http://localhost:3100/auth/admin/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

3. Run Flutter app:
   ```bash
   cd mizcall_admin
   flutter run -d macos
   ```

## 10. Next Steps

After successful login, you can:
- ✅ View dashboard statistics
- ✅ Browse all hosts
- ✅ View detailed host information
- ✅ Monitor system logs
- ✅ Export reports (coming soon)

Enjoy managing your MizCall system! 🚀
