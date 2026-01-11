# iOS Push Notifications - Currently Disabled

## Why iOS FCM is Disabled

Push notifications on iOS require:
- ✅ Firebase project (you have this)
- ❌ **Paid Apple Developer Account** ($99/year)
- ❌ APNs authentication key from Apple Developer Portal
- ❌ APNs key uploaded to Firebase Console

**Current Status**: iOS builds will work but without push notifications.

---

## What Works on iOS

✅ **All app features** (calls, audio, speaking indicators, etc.)  
✅ **Socket.IO real-time** (call started, session revoked, etc.)  
✅ **In-app notifications** (toasts while app is open)  
✅ **Biometric lock** (Face ID / Touch ID)  
✅ **Session management**  

❌ **Push notifications** (when app is closed/background)

---

## What Works on Android

✅ **Everything** including push notifications!
- Notifications work even when app is killed
- "Call Started" notifications
- Custom notifications from host
- Session revoked notifications

---

## Configuration Changes Made

**1. `app.json`**
- Removed `googleServicesFile` for iOS
- Removed iOS notification permission description
- Android FCM still fully configured

**2. `services/notificationService.ts`**
- Added iOS check: skips FCM registration on iOS
- Logs clear message: "FCM disabled on iOS"
- Android continues to work normally

**3. Build Configuration**
- iOS builds no longer require `GoogleService-Info.plist`
- iOS builds no longer require APNs certificates
- Android builds still require `google-services.json`

---

## How to Enable iOS Push Later

Once you get a paid Apple Developer account:

### **Step 1: Get APNs Auth Key**
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Certificates, Identifiers & Profiles
3. Keys → Create new key
4. Enable "Apple Push Notifications service (APNs)"
5. Download `.p8` file

### **Step 2: Upload to Firebase**
1. Firebase Console → Project Settings
2. Cloud Messaging tab
3. iOS app configuration
4. Upload APNs Authentication Key (.p8 file)
5. Enter Key ID and Team ID

### **Step 3: Re-enable in Code**

**`app.json`:**
```json
"ios": {
  "googleServicesFile": "./GoogleService-Info.plist",
  "infoPlist": {
    "NSUserNotificationsUsageDescription": "MizCall needs permission to send you notifications about calls and messages."
  }
}
```

**`services/notificationService.ts`:**
Remove these lines (lines ~28-32):
```typescript
// Skip FCM on iOS
if (Platform.OS === "ios") {
  console.log("[Notifications] ⚠️ FCM disabled on iOS...");
  return false;
}
```

### **Step 4: Rebuild**
```bash
cd MizCall
npx expo prebuild --clean
eas build --profile production --platform ios
```

---

## Current Testing Setup

**For now, test with:**
- ✅ **Android** - Full FCM push notifications
- ✅ **iOS** - All features except push (Socket.IO still works for real-time)

**Socket.IO provides real-time updates** for:
- Call started (when app is open)
- Session revoked (immediate logout)
- Speaking status (green borders)

**Missing on iOS only:**
- Push notifications when app is completely closed/killed

This is a **temporary limitation** until you get the Apple Developer account. All other features work perfectly! 🍎📱
