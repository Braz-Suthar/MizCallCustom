# 🔔 Firebase Cloud Messaging - Implementation Complete

This document summarizes the complete Firebase Cloud Messaging implementation in MizCall.

---

## ✅ What's Been Implemented

### **Backend** ✅
- Firebase Admin SDK integration
- Device token management (register/unregister)
- Multi-device notification delivery
- Automatic invalid token cleanup
- Notification history tracking
- Graceful degradation (works without Firebase config)

### **Database** ✅
- `device_tokens` table - stores FCM tokens per user/host
- `notifications` table - tracks all sent notifications
- Proper indexes for performance
- Automatic cleanup of invalid tokens

### **Expo Mobile App** ✅
- Auto-request notification permissions on login
- Auto-register FCM token with backend
- Handle notifications in foreground (toast)
- Handle notifications in background (navigate to call)
- Support for Android & iOS

### **Desktop App** ✅
- Touch ID/Windows Hello biometric authentication
- Password-based device lock fallback
- System notification support (built-in Electron)
- Auto-prompt biometric on app startup when locked

---

## 📦 Files Created/Modified

### **New Files (13)**
1. `backend/migrations/20260113_1100_add_device_tokens.sql`
2. `backend/src/services/firebase.js`
3. `backend/src/api/notifications/index.js`
4. `MizCall/services/notificationService.ts`
5. `MizCall/components/ui/SendNotificationModal.tsx`
6. `FIREBASE_SETUP.md` - Complete setup guide
7. `NOTIFICATIONS_SUMMARY.md` - This file

### **Modified Files (12)**
8. `backend/package.json` - Added firebase-admin
9. `backend/src/index.js` - Initialize Firebase, add routes
10. `backend/src/api/host/index.js` - Send notifications on call start
11. `backend/src/api/auth/index.js` - Notify on session revoke
12. `MizCall/package.json` - Added expo-notifications
13. `MizCall/app.json` - FCM configuration
14. `MizCall/app/user/(tabs)/_layout.tsx` - Register tokens, handle notifications
15. `MizCall/app/host/(tabs)/_layout.tsx` - Register tokens
16. `MizCall/app/host/(tabs)/users.tsx` - Send notification UI
17. `MizCallDesktop/electron/main.js` - Biometric auth handlers
18. `MizCallDesktop/electron/preload.js` - Biometric bridge
19. `.gitignore` - Exclude Firebase config files

---

## 🎯 Notification Types

### **1. Call Started** (Automatic)
- **Trigger**: Host starts a new call
- **Recipients**: All users under that host
- **Behavior**:
  - **Foreground**: Toast notification
  - **Background**: Native notification, taps navigate to active call
  - **Data**: `{ type: "call_started", roomId, hostId }`

### **2. Session Revoked** (Automatic)
- **Trigger**: User logs in on new device or host revokes session
- **Recipients**: User being logged out
- **Behavior**:
  - Shows toast notification
  - Auto-logs out after 2 seconds
  - **Data**: `{ type: "session_revoked", reason }`

### **3. Custom Notifications** (Host-initiated)
- **Trigger**: Host sends from "Users" screen
- **Recipients**: All users OR specific user
- **Behavior**: Native notification with custom title/body
- **Data**: `{ type: "custom", ...custom data }`

---

## 🚀 Quick Start

### **Step 1: Install Dependencies**

**Backend:**
```bash
cd backend
npm install
```

**Expo:**
```bash
cd MizCall
npm install
```

### **Step 2: Firebase Setup**

1. Create Firebase project at https://console.firebase.google.com/
2. Add Android app (package: `com.mizcall.app`)
3. Download `google-services.json` → Place in `MizCall/`
4. Add iOS app (bundle: `com.mizcall.app`)
5. Download `GoogleService-Info.plist` → Place in `MizCall/`
6. Generate service account key → Save as `backend/firebase-serviceAccountKey.json`

### **Step 3: Configure Environment**

**Docker Compose** (`docker-compose.yml`):
```yaml
services:
  backend:
    environment:
      - FIREBASE_SERVICE_ACCOUNT_PATH=/app/firebase-serviceAccountKey.json
    volumes:
      - ./backend/firebase-serviceAccountKey.json:/app/firebase-serviceAccountKey.json:ro
```

### **Step 4: Rebuild & Restart**

**Backend:**
```bash
docker compose restart backend
docker compose logs -f backend
```

**Expo App:**
```bash
cd MizCall
eas build --profile development --platform android
# or
npm run android
```

### **Step 5: Verify**

Open Expo app → Login → Check console:
```
[Notifications] ✅ Permission granted
[Notifications] FCM Token: ExponentPushToken[...]
[Notifications] ✅ Registered with backend. Firebase available: true
```

---

## 📱 Features by Platform

| Feature | Expo iOS | Expo Android | Desktop macOS | Desktop Windows |
|---------|----------|--------------|---------------|-----------------|
| **Push Notifications** | ✅ FCM | ✅ FCM | ✅ System | ✅ System |
| **Biometric Lock** | ✅ Face/Touch ID | ✅ Fingerprint | ✅ Touch ID | ⚠️ Ready* |
| **Call Notifications** | ✅ | ✅ | ✅ | ✅ |
| **Custom Notifications** | ✅ | ✅ | ✅ | ✅ |
| **Background Delivery** | ✅ | ✅ | ✅ | ✅ |

*Windows Hello requires native module installation

---

## 🔧 API Endpoints

### Register Device Token
```http
POST /notifications/register-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "ExponentPushToken[...]",
  "platform": "ios|android|web|desktop",
  "deviceName": "iPhone 13"
}
```

### Unregister Device Token
```http
POST /notifications/unregister-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "ExponentPushToken[...]"
}
```

### Send Custom Notification (Host Only)
```http
POST /notifications/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Meeting Reminder",
  "body": "Team meeting starting in 10 minutes",
  "recipientType": "all_users|user",
  "recipientId": "U123456",
  "data": { "custom": "payload" }
}
```

### Get Notification History (Host Only)
```http
GET /notifications/history?limit=50&offset=0
Authorization: Bearer <token>
```

### Check Firebase Status
```http
GET /notifications/status
Authorization: Bearer <token>
```

---

## 🎨 UI Components

### **Expo Host App**
- ✅ **Send Notification** button in Users screen (top right)
- ✅ **SendNotificationModal** component
  - Send to all users or specific user
  - Title & message input
  - Live preview
  - Character counters
  - Success/failure feedback

### **Expo User App**
- ✅ Auto-registers on login
- ✅ Shows toast for foreground notifications
- ✅ Navigates to call when tapping background notification

### **Desktop App**
- ✅ Uses native system notifications
- ✅ Biometric device lock with Touch ID (macOS)
- ✅ Password fallback

---

## 🔐 Security Features

✅ **Token Management**
- Tokens tied to user/host sessions
- Auto-cleanup of invalid tokens
- Secure storage in database

✅ **Authorization**
- Only hosts can send custom notifications
- Users can only register their own tokens
- API endpoints require authentication

✅ **Data Protection**
- Service account key excluded from git
- Firebase config files in gitignore
- Environment variable configuration

---

## 📊 Database Schema

### `device_tokens`
```sql
id          UUID PRIMARY KEY
user_id     TEXT (FK to users)
host_id     TEXT (FK to hosts)
token       TEXT UNIQUE NOT NULL
platform    TEXT
device_name TEXT
created_at  TIMESTAMP
last_used_at TIMESTAMP
```

### `notifications`
```sql
id              UUID PRIMARY KEY
sender_id       TEXT (host who sent it)
recipient_type  TEXT (user|host|all_users)
recipient_id    TEXT (specific user or null)
title           TEXT
body            TEXT
data            JSONB
notification_type TEXT (call_started|custom|system)
sent_at         TIMESTAMP
success_count   INTEGER
failure_count   INTEGER
```

---

## 🎬 User Flows

### **Call Started Notification**
1. Host clicks "Start Call"
2. Backend creates room
3. Backend sends Socket.IO broadcast
4. Backend sends push notifications to all users
5. Users receive notification (even if app is closed)
6. User taps notification → Opens app → Navigates to active call

### **Custom Notification**
1. Host opens Users screen
2. Clicks notification button (bell icon)
3. Selects recipient (all users or specific user)
4. Enters title and message
5. Previews notification
6. Clicks "Send"
7. Backend sends to selected recipients
8. Shows success count
9. Users receive notification

### **Session Revoked**
1. User A logs in on Device 1
2. User A logs in on Device 2
3. Backend revokes Device 1 session
4. Device 1 receives SESSION_REVOKED notification
5. Shows toast
6. Auto-logs out

---

## 🧪 Testing

### **Test Call Notifications**
1. Login as host on Expo
2. Login as user on another device
3. Start call as host
4. User should receive notification

### **Test Custom Notifications**
1. Login as host
2. Go to Users → Click bell icon
3. Send test notification
4. User should receive it

### **Test Biometric Lock** (macOS)
1. Login as host on Desktop
2. Go to Settings → Privacy → Toggle "Device Lock"
3. Touch ID prompt should appear
4. Close and reopen app
5. Touch ID prompt should appear automatically

---

## 📝 Environment Variables

Required for production:
```bash
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
```

Optional (already set):
```bash
API_BASE=https://custom.mizcall.com
```

---

## 🔄 Migration Steps

If already running:
```bash
# 1. Restart backend to run migrations
docker compose restart backend

# 2. Install dependencies
cd backend && npm install
cd MizCall && npm install

# 3. Add Firebase files (see FIREBASE_SETUP.md)

# 4. Rebuild Expo app
cd MizCall
eas build --profile development

# 5. Test!
```

---

## ✨ Summary

**Firebase Cloud Messaging is now fully integrated!**

✅ **Backend**: Sends notifications for calls, session changes, and custom messages
✅ **Expo**: Receives and handles push notifications
✅ **Desktop**: Biometric authentication and system notifications
✅ **Database**: Tracks tokens and notification history
✅ **Security**: Proper auth, token cleanup, and data protection
✅ **UX**: Beautiful UI for sending custom notifications
✅ **Documentation**: Complete setup guide (FIREBASE_SETUP.md)

**Status**: Production-ready (just needs Firebase config files)! 🚀
