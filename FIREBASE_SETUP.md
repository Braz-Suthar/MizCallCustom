# Firebase Cloud Messaging Setup

This guide explains how to set up Firebase Cloud Messaging (FCM) for push notifications in MizCall.

## ⚠️ Current Configuration: Android Only

**Push notifications are currently configured for Android only.**

- ✅ **Android**: Full FCM support (works now)
- ⚠️ **iOS**: Disabled (requires paid Apple Developer account)

All other features work perfectly on both platforms. iOS will get push notifications once you have a paid Apple Developer account. See `IOS_FCM_DISABLED.md` for details.

## Overview

MizCall uses FCM to send push notifications for:
- **Call Started**: Notify all users when host starts a new call
- **Custom Notifications**: Host can send custom messages to users
- **Session Revocation**: Notify users when logged out from another device

---

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `MizCall` (or your preferred name)
4. Disable Google Analytics (optional)
5. Click "Create project"

---

## 2. Add Android App to Firebase ✅ REQUIRED

1. In Firebase Console, click "Add app" → Android icon
2. **Android package name**: `com.mizcall.app` (must match `app.json`)
3. Download `google-services.json`
4. Place it in: `MizCall/google-services.json`

✅ **You've already done this!** The file is in place.

---

## 3. Add iOS App to Firebase (OPTIONAL - Requires Paid Apple Developer Account)

⚠️ **Currently disabled** - iOS FCM requires a paid Apple Developer account ($99/year).

**When you get a paid account:**
1. In Firebase Console, click "Add app" → iOS icon
2. **iOS bundle ID**: `com.mizcall.app` (must match `app.json`)
3. Download `GoogleService-Info.plist`
4. Place it in: `MizCall/GoogleService-Info.plist`
5. Get APNs auth key from Apple Developer Portal
6. Upload APNs key to Firebase Console
7. Re-enable iOS in code (see `IOS_FCM_DISABLED.md`)

**For now**: iOS builds work fine without FCM. All features except background push notifications work normally.

---

## 4. Enable Cloud Messaging API

1. In Firebase Console → Project Settings → Cloud Messaging tab
2. Scroll to "Cloud Messaging API (Legacy)"
3. If disabled, click "Enable"
4. Note: The new FCM API (V1) is also supported

---

## 5. Generate Service Account Key (Backend)

1. In Firebase Console → Project Settings → Service accounts tab
2. Click "Generate new private key"
3. Save the JSON file securely
4. **Recommended location**: `backend/firebase-serviceAccountKey.json`
5. **IMPORTANT**: Add to `.gitignore` to keep it secret!

---

## 6. Configure Backend

Add environment variable to your backend:

**Option A: Docker Compose** (`docker-compose.yml`)
```yaml
services:
  backend:
    environment:
      - FIREBASE_SERVICE_ACCOUNT_PATH=/app/firebase-serviceAccountKey.json
    volumes:
      - ./backend/firebase-serviceAccountKey.json:/app/firebase-serviceAccountKey.json:ro
```

**Option B: Direct Node.js** (`.env` file)
```bash
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-serviceAccountKey.json
```

**Option C: Environment Variable**
```bash
export FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
```

---

## 7. Install Dependencies

**Backend:**
```bash
cd backend
npm install firebase-admin
```

**Expo App:**
```bash
cd MizCall
npm install expo-notifications expo-device
```

**Expo also needs:**
Add to `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification.wav"]
        }
      ]
    ],
    "notification": {
      "icon": "./assets/icon.png",
      "color": "#3c82f6"
    },
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

---

## 8. Test Notifications

**Backend will start with one of these:**

✅ Success:
```
[Firebase] ✅ Initialized successfully
```

⚠️ Not configured (still works, just no push):
```
[Firebase] ⚠️ FIREBASE_SERVICE_ACCOUNT_PATH not set. Push notifications will be disabled.
```

❌ Error (check your service account file):
```
[Firebase] ❌ Initialization failed: <error message>
```

---

## 9. Verify Setup

**Test notification registration:**
```bash
curl -X POST https://custom.mizcall.com/notifications/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "available": true,
  "message": "Push notifications are enabled"
}
```

---

## API Endpoints

### Register Device Token
```
POST /notifications/register-token
Headers: Authorization: Bearer <token>
Body: {
  "token": "FCM_DEVICE_TOKEN",
  "platform": "ios|android|web|desktop",
  "deviceName": "iPhone 13"
}
```

### Send Custom Notification (Host only)
```
POST /notifications/send
Headers: Authorization: Bearer <token>
Body: {
  "title": "Meeting Reminder",
  "body": "Team meeting in 10 minutes",
  "recipientType": "all_users|user",
  "recipientId": "U123456" (required if recipientType = "user"),
  "data": { "custom": "data" }
}
```

### Get Notification History (Host only)
```
GET /notifications/history?limit=50&offset=0
Headers: Authorization: Bearer <token>
```

---

## Security Notes

⚠️ **NEVER commit** `firebase-serviceAccountKey.json` to git!

Add to `.gitignore`:
```
backend/firebase-serviceAccountKey.json
firebase-serviceAccountKey.json
google-services.json
GoogleService-Info.plist
```

✅ **Production**: Use secure environment variables or secret management service

---

## Troubleshooting

**"Firebase not initialized"**
- Check `FIREBASE_SERVICE_ACCOUNT_PATH` is set correctly
- Verify service account JSON file exists and is readable
- Check file permissions (should be readable by the backend process)

**"No device tokens found"**
- Users must have the app open at least once to register their token
- Check `device_tokens` table has entries: `SELECT * FROM device_tokens;`

**Notifications not received on device**
- Verify `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) is in place
- Rebuild the Expo app after adding Firebase files
- Check device has notifications enabled in system settings

---

## Next Steps

After setup, notifications will automatically be sent when:
1. ✅ Host starts a new call
2. ✅ User session is revoked
3. ✅ Host sends custom notification

Users will see native push notifications on their devices even when the app is closed! 🔔
