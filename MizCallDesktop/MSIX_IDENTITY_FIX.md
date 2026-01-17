# Fix MSIX Package Identity for Microsoft Store

## The Problem

Your MSIX package identity doesn't match what Microsoft Partner Center expects.

## Required Identity Information (from Partner Center)

```
Package/Identity/Name: MizCall.MizCall
Package/Identity/Publisher: CN=9EAC33C0-82DB-4E49-871F-C85D726D865E
Package Family Name: MizCall.MizCall_65apfcsfi8cvr
```

## Solution: Update Your Build Configuration

### Option 1: Using Electron Builder (Recommended)

Update your `package.json` with the correct identity:

```json
{
  "name": "mizcalldesktop",
  "version": "1.0.0",
  "build": {
    "appId": "MizCall.MizCall",
    "productName": "MizCall",
    "win": {
      "target": [
        {
          "target": "appx",
          "arch": ["x64"]
        }
      ],
      "publisherName": "CN=9EAC33C0-82DB-4E49-871F-C85D726D865E",
      "applicationId": "MizCall.MizCall",
      "identityName": "MizCall.MizCall",
      "publisher": "CN=9EAC33C0-82DB-4E49-871F-C85D726D865E"
    },
    "appx": {
      "applicationId": "MizCall.MizCall",
      "identityName": "MizCall.MizCall",
      "publisher": "CN=9EAC33C0-82DB-4E49-871F-C85D726D865E",
      "publisherDisplayName": "MizCall",
      "backgroundColor": "#FFFFFF",
      "showNameOnTiles": true
    }
  }
}
```

### Option 2: Manual AppxManifest.xml Edit

If you have the MSIX file already:

1. Extract the MSIX (rename to .zip and extract)
2. Edit `AppxManifest.xml`
3. Update the Identity section:

```xml
<Identity 
  Name="MizCall.MizCall"
  Publisher="CN=9EAC33C0-82DB-4E49-871F-C85D726D865E"
  Version="1.0.0.0" />

<Properties>
  <DisplayName>MizCall</DisplayName>
  <PublisherDisplayName>MizCall</PublisherDisplayName>
  ...
</Properties>
```

4. Repackage as MSIX using Windows SDK tools

## Rebuild Steps

### On Windows Machine:

1. Update `package.json` with correct identity (see above)
2. Clean previous builds:
   ```bash
   rm -rf release/
   ```
3. Rebuild:
   ```bash
   npm run build
   npm run build:win
   ```
4. Look for the new MSIX in `release/` folder

## Important Notes

- The Publisher CN is a GUID assigned by Microsoft
- The Package Name must match exactly
- Version format must be X.X.X.X (e.g., 1.0.0.0)
- After rebuilding, the file will be named something like: `MizCall 1.0.0.msix`

## Verification

Before uploading, you can verify the identity:

```powershell
# Extract package info
Get-AppxPackage -Path ".\MizCall.msix"
```

Should show:
- Name: MizCall.MizCall
- Publisher: CN=9EAC33C0-82DB-4E49-871F-C85D726D865E

## Re-upload to Store

1. Delete the failed package from Partner Center
2. Upload the newly built MSIX
3. Validation should pass ✅
