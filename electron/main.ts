import {
  app,
  BrowserWindow,
  dialog,
  shell,
  Tray,
  Menu,
  nativeImage,
  clipboard,
} from "electron";
import { autoUpdater } from "electron-updater";
import { ChildProcess, fork } from "child_process";
import path from "path";
import fs from "fs";
import { networkInterfaces } from "os";
import { needsSetup, runMigrations, showSetupWizard } from "./setup-wizard";

const PORT = 3000;
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverProcess: ChildProcess | null = null;

function getResourcePath(...segments: string[]): string {
  const base = isDev
    ? path.join(__dirname, "..")
    : path.join(process.resourcesPath, "app");
  return path.join(base, ...segments);
}

function getDataPath(): string {
  const dir = path.join(app.getPath("userData"), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getLanAddress(): string {
  const nets = networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    if (!ifaces) continue;
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        return `http://${iface.address}:${PORT}`;
      }
    }
  }
  return `http://localhost:${PORT}`;
}

function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverJs = getResourcePath(".next", "standalone", "server.js");
    if (!fs.existsSync(serverJs)) {
      reject(new Error(`server.js bulunamadı: ${serverJs}`));
      return;
    }

    const dataPath = getDataPath();
    const dbPath = path.join(dataPath, "app.db");

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      PORT: String(PORT),
      HOSTNAME: "0.0.0.0",
      DATABASE_URL: dbPath,
      NODE_ENV: "production",
    };

    if (!process.env.SESSION_SECRET) {
      const secretPath = path.join(dataPath, ".session-secret");
      let secret: string;
      if (fs.existsSync(secretPath)) {
        secret = fs.readFileSync(secretPath, "utf-8").trim();
      } else {
        const { randomBytes } = require("crypto");
        secret = randomBytes(32).toString("hex");
        fs.writeFileSync(secretPath, secret, { mode: 0o600 });
      }
      env.SESSION_SECRET = secret;
    }

    serverProcess = fork(serverJs, [], {
      env,
      stdio: "pipe",
      cwd: path.dirname(serverJs),
    });

    serverProcess.stdout?.on("data", (data: Buffer) => {
      const msg = data.toString();
      if (msg.includes("Ready") || msg.includes("started server")) {
        resolve();
      }
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      console.error("[NextServer]", data.toString());
    });

    serverProcess.on("error", reject);
    serverProcess.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[NextServer] exited with code ${code}`);
      }
      serverProcess = null;
    });

    setTimeout(resolve, 5000);
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "DAS Case",
    icon: getIconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on("close", (e) => {
    e.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function getIconPath(): string {
  const iconName =
    process.platform === "win32" ? "icon.ico" : "icon.png";
  return getResourcePath("assets", iconName);
}

function createTray(): void {
  const icon = nativeImage.createFromPath(getIconPath());
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("DAS Case");

  const autoStartEnabled = app.getLoginItemSettings().openAtLogin;

  const menu = Menu.buildFromTemplate([
    {
      label: "DAS Case'i Aç",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: "separator" },
    {
      label: "Tarayıcıda Aç",
      click: () => shell.openExternal(`http://localhost:${PORT}`),
    },
    {
      label: "LAN Adresini Kopyala",
      click: () => {
        const addr = getLanAddress();
        clipboard.writeText(addr);
        dialog.showMessageBox({
          type: "info",
          title: "Kopyalandı",
          message: `LAN adresi panoya kopyalandı:\n${addr}`,
        });
      },
    },
    { type: "separator" },
    {
      label: "Yedek Al",
      click: async () => {
        try {
          const res = await fetch(`http://localhost:${PORT}/api/backup`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          const { filePath } = await dialog.showSaveDialog({
            defaultPath: `is-takibi-backup-${new Date().toISOString().slice(0, 10)}.db`,
            filters: [{ name: "SQLite Database", extensions: ["db"] }],
          });
          if (filePath) {
            fs.writeFileSync(filePath, buf);
            dialog.showMessageBox({
              type: "info",
              title: "Yedek alındı",
              message: `Yedek kaydedildi: ${filePath}`,
            });
          }
        } catch (err) {
          dialog.showErrorBox(
            "Yedek hatası",
            `Yedek alınamadı: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      },
    },
    { type: "separator" },
    {
      label: "Otomatik Başlat",
      type: "checkbox",
      checked: autoStartEnabled,
      click: (menuItem) => {
        app.setLoginItemSettings({ openAtLogin: menuItem.checked });
      },
    },
    { type: "separator" },
    {
      label: "Çıkış",
      click: () => {
        mainWindow?.destroy();
        mainWindow = null;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    const dataPath = getDataPath();
    const dbPath = path.join(dataPath, "app.db");
    const migrationsFolder = getResourcePath("drizzle");

    try {
      runMigrations(dbPath, migrationsFolder);
    } catch (err) {
      console.error("[Migration]", err);
    }

    if (needsSetup(dbPath)) {
      try {
        await showSetupWizard(dbPath);
      } catch {
        app.quit();
        return;
      }
    }

    try {
      await startNextServer();
    } catch (err) {
      dialog.showErrorBox(
        "Sunucu başlatılamadı",
        `Next.js sunucusu başlatılamadı:\n${err instanceof Error ? err.message : String(err)}`,
      );
      app.quit();
      return;
    }

    createTray();
    createWindow();
    initAutoUpdater();
  });

  app.on("window-all-closed", () => {
    // Keep running in tray
  });

  app.on("before-quit", () => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  });
}

function initAutoUpdater(): void {
  if (isDev) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    dialog.showMessageBox({
      type: "info",
      title: "Güncelleme mevcut",
      message: `DAS Case ${info.version} indiriliyor...`,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox({
        type: "info",
        title: "Güncelleme hazır",
        message:
          "Yeni sürüm indirildi. Uygulamayı yeniden başlatmak ister misiniz?",
        buttons: ["Şimdi yeniden başlat", "Sonra"],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on("error", (err) => {
    console.error("[AutoUpdater]", err);
  });

  autoUpdater.checkForUpdatesAndNotify();
}
