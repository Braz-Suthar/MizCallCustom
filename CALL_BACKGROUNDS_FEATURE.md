# 🖼️ Call Background Images - Complete Feature Guide

## ✅ Feature Overview

Hosts can customize their active call screen with background images:
- **5 Preset Backgrounds** (inbuilt, ready to use)
- **Custom Uploads** (build your own library)
- **Persistent Library** (all uploads saved, can switch anytime)
- **Auto-sync** (users see host's background)

---

## 📁 Storage Architecture

### **1. Inbuilt Backgrounds** (Preset)
```
Location: backend/public/inbuilt_call_background_images/
Files: 1.jpg, 2.jpg, 3.jpg, 4.jpg, 5.jpg
URL: /public/inbuilt_call_background_images/{filename}
```
- ✅ Pre-installed in Docker image
- ✅ Always available
- ✅ Never deleted

### **2. Custom Uploads** (Per Host)
```
Location: backend/uploads/backgrounds/
Format: bg_{hostId}_{timestamp}.jpg
URL: /uploads/backgrounds/{filename}
Database: custom_backgrounds table
```
- ✅ Persisted via Docker volume (`./backend/uploads:/app/uploads`)
- ✅ Tracked in database per host
- ✅ Builds a reusable library
- ✅ Can be deleted individually

### **3. Active Background** (Current)
```
Database: hosts.call_background_url
Value: URL of currently active background (inbuilt or custom)
```
- ✅ Can be inbuilt or custom
- ✅ Shown on call screen
- ✅ Synced to users automatically

---

## 🗄️ Database Schema

### **Table: `custom_backgrounds`**
```sql
id          UUID (Primary Key)
host_id     TEXT (FK to hosts)
url         TEXT (unique)
filename    TEXT
uploaded_at TIMESTAMP
```

**Purpose**: Track all custom backgrounds uploaded by each host

### **Column: `hosts.call_background_url`**
```sql
call_background_url TEXT NULL
```

**Purpose**: Currently active background for this host

---

## 🔌 API Endpoints

### **Get Inbuilt Backgrounds**
```http
GET /host/call-background/inbuilt
Authorization: Bearer <token>
```
**Response:**
```json
{
  "backgrounds": [
    { "id": "1.jpg", "url": "/public/inbuilt_call_background_images/1.jpg" },
    { "id": "2.jpg", "url": "/public/inbuilt_call_background_images/2.jpg" },
    ...
  ]
}
```

### **Get Custom Uploaded Backgrounds**
```http
GET /host/call-background/custom
Authorization: Bearer <token>
```
**Response:**
```json
{
  "backgrounds": [
    {
      "id": "uuid",
      "url": "/uploads/backgrounds/bg_H123_123456.jpg",
      "filename": "bg_H123_123456.jpg",
      "uploaded_at": "2026-01-13T..."
    }
  ]
}
```

### **Get Active Background**
```http
GET /host/call-background
Authorization: Bearer <token>
```
**Response:**
```json
{
  "backgroundUrl": "/public/inbuilt_call_background_images/1.jpg"
}
```
**Note**: Works for both hosts and users (users get their host's background)

### **Upload Custom Background**
```http
POST /host/call-background
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form field: background (image file)
```
**Response:**
```json
{
  "backgroundUrl": "/uploads/backgrounds/bg_H123_123456.jpg"
}
```
**Behavior**: Uploads to library AND sets as active

### **Set Active Background**
```http
POST /host/call-background/set-active
Authorization: Bearer <token>
Content-Type: application/json

{
  "backgroundUrl": "/public/inbuilt_call_background_images/1.jpg"
}
```
**Response:**
```json
{
  "backgroundUrl": "/public/inbuilt_call_background_images/1.jpg"
}
```
**Purpose**: Switch between inbuilt and custom without uploading

### **Clear Active Background**
```http
DELETE /host/call-background
Authorization: Bearer <token>
```
**Response:**
```json
{
  "ok": true,
  "message": "Background cleared"
}
```
**Behavior**: Clears active background, keeps library intact

### **Delete from Library**
```http
DELETE /host/call-background/custom/:id
Authorization: Bearer <token>
```
**Response:**
```json
{
  "ok": true,
  "message": "Background deleted from library"
}
```
**Behavior**: Deletes file and database entry, clears if was active

---

## 🎨 User Experience

### **Expo Host App**

**Settings → Call Customization:**

**If no background set:**
```
┌─────────────────────────────────┐
│ 📷 Choose from Gallery          │
│ "5 preset backgrounds available"│
└─────────────────────────────────┘

        ─── or ───

┌─────────────────────────────────┐
│ ☁️  Upload Custom Image          │
│ "Recommended: 16:9, 1920x1080px"│
└─────────────────────────────────┘
```

**If background set:**
```
┌─────────────────────────────────┐
│ [Preview Image]                 │
│ [Gallery] [Upload] [Remove]     │
└─────────────────────────────────┘
```

**Background Gallery Modal:**
```
Your Uploads (3)              [← Shows if any custom uploads]
┌───────┐ ┌───────┐ ┌───────┐
│🗑️ [img]│ │🗑️ [img]│ │🗑️ [img]│  [← Delete button top-left]
│   ✓   │ │       │ │       │  [← Checkmark if active]
└───────┘ └───────┘ └───────┘

       ─── or choose preset ───

Preset Backgrounds
┌───────┐ ┌───────┐ ┌───────┐
│ [img] │ │ [img] │ │ [img] │
└───────┘ └───────┘ └───────┘

       ─── or upload new ───

┌─────────────────────────────────┐
│ ☁️  Upload New Image             │
└─────────────────────────────────┘
```

### **Desktop Host App**

**Settings → Call Customization:**

Similar layout to Expo, with file picker instead of image picker.

**Gallery Modal:**
- Grid layout (4 columns on large screens)
- Custom uploads shown first with delete buttons
- Preset backgrounds below
- Upload button at bottom

---

## 🎬 Usage Flow

### **1. First Time Setup**
1. Host → Settings → Call Customization
2. Click "Choose from Gallery"
3. See 5 preset backgrounds
4. Click one → Set as active
5. **OR** upload custom image → Saved to library + set as active

### **2. Building Library**
1. Upload multiple custom images
2. Each upload saved to library
3. Library grows over time
4. Can have 5 presets + unlimited custom

### **3. Switching Backgrounds**
1. Open gallery
2. See "Your Uploads" section (all custom images)
3. See "Preset Backgrounds" section
4. Click any image → Instantly becomes active
5. No re-upload needed!

### **4. Managing Library**
1. Open gallery
2. Custom images have 🗑️ delete button
3. Click delete → Removes from library
4. If was active → Background cleared
5. Preset images can't be deleted

### **5. During Call**
- Host sees their selected background
- Users see host's background (auto-synced)
- Background has blur + dark overlay
- UI remains readable

---

## 📊 Database Records

**Example for Host H405441:**

**custom_backgrounds table:**
```
id                                    host_id  url                                         uploaded_at
uuid-1                               H405441  /uploads/backgrounds/bg_H405441_123.jpg     2026-01-13 10:00
uuid-2                               H405441  /uploads/backgrounds/bg_H405441_456.jpg     2026-01-13 11:00
uuid-3                               H405441  /uploads/backgrounds/bg_H405441_789.jpg     2026-01-13 12:00
```

**hosts table:**
```
id       call_background_url
H405441  /public/inbuilt_call_background_images/1.jpg
```

**Meaning**: This host has 3 custom uploads in library, but currently using preset #1

---

## 🔄 Migration

**Automatic on backend restart:**
```sql
✅ 20260113_1200_add_call_background.sql (hosts.call_background_url)
✅ 20260113_1300_add_custom_backgrounds_library.sql (custom_backgrounds table)
```

---

## 💾 Persistence

**Volume mapping in `docker-compose.yml`:**
```yaml
volumes:
  - ./backend/uploads:/app/uploads  ✅ Already configured
```

**This ensures:**
- ✅ Custom uploads survive container restarts
- ✅ Database records match actual files
- ✅ No broken images after redeployment

---

## 🎯 Key Benefits

**For Hosts:**
- ✅ Professional, branded call screens
- ✅ Quick switching between backgrounds
- ✅ Library of favorites
- ✅ No re-upload needed

**For Users:**
- ✅ Consistent visual experience
- ✅ Recognizable host branding
- ✅ Automatic synchronization

**For Developers:**
- ✅ Clean separation (inbuilt vs custom)
- ✅ Efficient storage (no duplicates)
- ✅ Easy maintenance (delete unused images)

---

## 📝 Summary

**Storage Locations:**
```
backend/
├── public/inbuilt_call_background_images/  ← 5 preset images (static)
└── uploads/backgrounds/                    ← Custom uploads (per host, persisted)
```

**Database Tables:**
```
custom_backgrounds  ← Library of all custom uploads per host
hosts               ← Current active background URL
```

**Full Feature Set:**
- ✅ 5 inbuilt presets
- ✅ Unlimited custom uploads
- ✅ Persistent library per host
- ✅ Quick switching
- ✅ Individual delete
- ✅ Auto-sync to users
- ✅ Beautiful UI with preview
- ✅ Works on Expo + Desktop

**Ready for production!** 🚀🖼️
