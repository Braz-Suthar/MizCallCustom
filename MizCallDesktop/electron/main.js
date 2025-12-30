import { app, BrowserWindow, nativeTheme, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Electron exposes a reliable flag; avoids relying on NODE_ENV being set.
const isDev = !app.isPackaged;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const createWindow = (opts = {}) => {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: "MizCall Desktop",
    ...opts,
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return win;
};

app.whenReady().then(() => {
  createWindow();

  ipcMain.on("open-active-call-window", (_event, payload) => {
    const callWin = createWindow({ width: 1280, height: 800, title: "MizCall - Active Call" });
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

