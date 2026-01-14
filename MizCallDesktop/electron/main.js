import { app, BrowserWindow, nativeTheme, ipcMain, systemPreferences, shell, safeStorage } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// Electron exposes a reliable flag; avoids relying on NODE_ENV being set.
const isDev = !app.isPackaged;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Enable better media support
app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

// Suppress the representedObject warning on macOS
if (process.platform === 'darwin') {
  try {
    const iconPath = path.join(__dirname, "..", "assets", "icon.png");
    if (app.dock && app.dock.setIcon) {
      app.dock.setIcon(iconPath).catch(() => {
        console.log("[Electron] No dock icon found, using default");
      });
    }
  } catch (error) {
    console.log("[Electron] Could not set dock icon:", error.message);
  }
}

// Request microphone permission on macOS
async function requestMicrophonePermission() {
  if (process.platform === "darwin") {
    try {
      const micStatus = systemPreferences.getMediaAccessStatus("microphone");
      console.log("[Electron] Microphone permission status:", micStatus);
      
      if (micStatus === "not-determined") {
        console.log("[Electron] Requesting microphone permission...");
        const granted = await systemPreferences.askForMediaAccess("microphone");
        console.log("[Electron] Microphone permission granted:", granted);
        
        if (!granted) {
          console.log("[Electron] ⚠️ Permission denied. In development mode, look for 'Electron' or 'Electron Helper' in System Settings > Privacy & Security > Microphone");
        }
        
        return granted;
      } else if (micStatus === "granted") {
        console.log("[Electron] Microphone permission already granted");
        return true;
      } else if (micStatus === "denied") {
        console.error("[Electron] Microphone permission denied or restricted");
        console.log("[Electron] ⚠️ In development mode, look for 'Electron' in System Settings > Privacy & Security > Microphone and enable it");
        return false;
      } else if (micStatus === "restricted") {
        console.error("[Electron] Microphone access is restricted by system policy");
        return false;
      }
    } catch (error) {
      console.error("[Electron] Error requesting microphone permission:", error);
      return false;
    }
  }
  
  // On other platforms, assume permission is granted
  return true;
}

const createWindow = (opts = {}) => {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Enable WebRTC features
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    title: "MizCall Desktop",
    ...opts,
  });

  // Handle permission requests (microphone, camera, etc.)
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log("[Electron] ✅ Permission requested:", permission);
    
    // Always allow media permissions
    if (permission === 'media' || permission === 'microphone' || permission === 'audio' || permission === 'audioCapture') {
      console.log("[Electron] ✅ Granting permission:", permission);
      callback(true);
    } else {
      console.log("[Electron] ❌ Denying permission:", permission);
      callback(false);
    }
  });

  // Handle permission check requests
  win.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    console.log("[Electron] Permission check:", permission, "from:", requestingOrigin);
    
    if (permission === 'media' || permission === 'microphone' || permission === 'audio' || permission === 'audioCapture') {
      console.log("[Electron] ✅ Permission check passed:", permission);
      return true;
    }
    
    console.log("[Electron] ❌ Permission check failed:", permission);
    return false;
  });

  // Log when page is ready
  win.webContents.on('did-finish-load', () => {
    console.log("[Electron] Page loaded successfully");
  });

  // Log console messages from renderer
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (message.includes('getUserMedia') || message.includes('microphone') || message.includes('permission')) {
      console.log(`[Renderer] ${message}`);
    }
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return win;
};

app.whenReady().then(async () => {
  // Request microphone permission before creating window
  console.log("[Electron] App ready, requesting microphone permission...");
  const granted = await requestMicrophonePermission();
  
  if (!granted && process.platform === "darwin") {
    console.log("[Electron] Microphone permission denied, will need to be granted in System Settings");
  }
  
  console.log("[Electron] Registering IPC handlers...");
  
  // Test IPC handler
  ipcMain.on("test-ipc", (event, data) => {
    console.log("[Electron] 🧪 Test IPC received:", data);
  });
  
  // Handle IPC to open System Settings - REGISTER BEFORE CREATING WINDOW
  ipcMain.on("open-system-settings", (event, type) => {
    console.log("[Electron] 🔧 IPC received: open-system-settings, type:", type);
    console.log("[Electron] Event sender:", event.sender.id);
    console.log("[Electron] Platform:", process.platform);
    
    try {
      if (process.platform === "darwin") {
        console.log("[Electron] Platform: macOS, opening Settings...");
        
        if (type === "microphone") {
          const url = "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone";
          console.log("[Electron] Opening URL:", url);
          shell.openExternal(url).then(() => {
            console.log("[Electron] ✅ System Settings opened successfully");
          }).catch((err) => {
            console.error("[Electron] ❌ Failed to open System Settings:", err);
          });
        } else if (type === "camera") {
          const url = "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera";
          console.log("[Electron] Opening URL:", url);
          shell.openExternal(url).then(() => {
            console.log("[Electron] ✅ System Settings opened successfully");
          }).catch((err) => {
            console.error("[Electron] ❌ Failed to open System Settings:", err);
          });
        }
      } else if (process.platform === "win32") {
        console.log("[Electron] Platform: Windows, opening Settings...");
        
        if (type === "microphone") {
          const url = "ms-settings:privacy-microphone";
          console.log("[Electron] Opening URL:", url);
          shell.openExternal(url).then(() => {
            console.log("[Electron] ✅ Windows Settings opened successfully");
          }).catch((err) => {
            console.error("[Electron] ❌ Failed to open Windows Settings:", err);
          });
        } else if (type === "camera") {
          shell.openExternal("ms-settings:privacy-webcam");
        }
      } else {
        console.warn("[Electron] Platform not supported for opening settings:", process.platform);
      }
    } catch (error) {
      console.error("[Electron] Exception opening system settings:", error);
    }
  });
  
  console.log("[Electron] IPC handlers registered successfully");
  
  // Biometric authentication handlers
  ipcMain.handle("check-biometric-support", async () => {
    try {
      if (process.platform === "darwin") {
        // macOS - check for Touch ID
        const canPrompt = await systemPreferences.canPromptTouchID?.();
        return {
          available: canPrompt === true,
          type: "touchid",
          platform: "darwin"
        };
      } else if (process.platform === "win32") {
        // Windows - check for Windows Hello
        try {
          // Try to check if Windows Hello is available
          const { stdout } = await execAsync('powershell -Command "Get-WmiObject -Namespace root\\cimv2\\security\\microsofttpm -Class Win32_Tpm | Select-Object -ExpandProperty IsEnabled_InitialValue"');
          const available = stdout.trim() === "True";
          return {
            available,
            type: "windowshello",
            platform: "win32"
          };
        } catch {
          return { available: false, type: "none", platform: "win32" };
        }
      } else {
        // Linux or other - no biometric support
        return { available: false, type: "none", platform: process.platform };
      }
    } catch (error) {
      console.error("[Electron] Error checking biometric support:", error);
      return { available: false, type: "none", platform: process.platform };
    }
  });

  ipcMain.handle("authenticate-biometric", async (_event, reason = "unlock the app") => {
    try {
      if (process.platform === "darwin") {
        // macOS Touch ID
        await systemPreferences.promptTouchID?.(reason);
        return { success: true, method: "touchid" };
      } else if (process.platform === "win32") {
        // Windows Hello - would need native module, fallback to false for now
        // In production, use a package like "windows-hello" or "node-biometric"
        console.log("[Electron] Windows Hello not yet implemented, returning false");
        return { success: false, method: "none", error: "Windows Hello requires native module" };
      } else {
        return { success: false, method: "none", error: "Platform not supported" };
      }
    } catch (error) {
      console.error("[Electron] Biometric authentication failed:", error);
      return { success: false, method: "none", error: error.message };
    }
  });
  
  createWindow();

  ipcMain.on("open-active-call-window", (_event, payload) => {
    const callWin = createWindow({ 
      width: 1280, 
      height: 800, 
      minWidth: 900,
      minHeight: 600,
      title: "MizCall - Active Call" 
    });
    callWin.webContents.once("did-finish-load", () => {
      callWin.webContents.send("active-call-context", payload);
    });
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Light/dark awareness for future theming
nativeTheme.on("updated", () => {
  // no-op for now
});

