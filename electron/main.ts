import {
  app,
  BrowserWindow,
  dialog,
  shell,
  Tray,
  Menu,
  nativeImage,
  clipboard,
  ipcMain,
} from "electron";
import { autoUpdater } from "electron-updater";
import { ChildProcess, spawn, execFile } from "child_process";
import path from "path";
import fs from "fs";
import http from "http";
import { networkInterfaces } from "os";
import { randomBytes } from "crypto";
import {
  needsSetup,
  runMigrations,
  showSetupWizard,
  showAdminResetWizard,
  type SetupResult,
} from "./setup-wizard";
import {
  loadConfig,
  saveConfig,
  getAppMode,
  getServerUrl,
  type AppMode,
} from "./client-config";
import { startDiscoveryServer } from "./lan-discovery";
import {
  startAutoBackup,
  stopAutoBackup,
  checkpointAndVerify,
  runBackup,
} from "./auto-backup";
import type dgram from "dgram";

const PORT = 3000;
const isDev = !app.isPackaged;

// Windows/Linux'ta Chromium metin kenarlarini puruzlu render edebiliyor;
// hinting'i kapatmak ve sRGB profili zorlamak yaziyi netlestirir.
app.commandLine.appendSwitch("font-render-hinting", "none");
app.commandLine.appendSwitch("force-color-profile", "srgb");

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverProcess: ChildProcess | null = null;
let discoverySocket: dgram.Socket | null = null;
let currentMode: AppMode | null = null;
let updaterInitialized = false;

function getLogPath(): string {
  const dir = path.join(app.getPath("userData"), "logs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "main.log");
}

function logLine(message: string): void {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(getLogPath(), line, "utf-8");
  } catch {
    /* logging must not break app startup */
  }
  console.error(message);
}

function getResourcePath(...segments: string[]): string {
  const base = isDev
    ? path.join(__dirname, "..")
    : path.join(process.resourcesPath, "app");
  return path.join(base, ...segments);
}

function getStandalonePath(...segments: string[]): string {
  if (isDev) return path.join(__dirname, "..", ".next", "standalone", ...segments);
  return path.join(process.resourcesPath, "app", ...segments);
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

function runNetsh(args: string[]): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    execFile("netsh", args, { windowsHide: true }, (err, stdout, stderr) => {
      resolve({ ok: !err, output: `${stdout ?? ""}${stderr ?? ""}` });
    });
  });
}

/**
 * Server modunda gelen baglantilar icin firewall kurallarini garanti altina alir.
 * Installer kurali ekleyemediyse (admin degil / per-user kurulum) burada tekrar denenir.
 * Admin yetkisi yoksa netsh basarisiz olur; kullaniciya tek seferlik net uyari gosterilir.
 */
async function ensureServerFirewallRules(): Promise<void> {
  if (process.platform !== "win32") return;

  const rules = [
    { name: "DAS Case HTTP", protocol: "TCP", port: String(PORT) },
    { name: "DAS Case Discovery", protocol: "UDP", port: "41520" },
  ];

  let addFailed = false;

  for (const rule of rules) {
    const existing = await runNetsh([
      "advfirewall",
      "firewall",
      "show",
      "rule",
      `name=${rule.name}`,
    ]);
    if (existing.ok) {
      continue;
    }

    const added = await runNetsh([
      "advfirewall",
      "firewall",
      "add",
      "rule",
      `name=${rule.name}`,
      "dir=in",
      "action=allow",
      `protocol=${rule.protocol}`,
      `localport=${rule.port}`,
      "profile=any",
    ]);

    if (added.ok) {
      logLine(`[Firewall] kural eklendi: ${rule.name}`);
    } else {
      addFailed = true;
      logLine(`[Firewall] kural eklenemedi: ${rule.name} — ${added.output.trim()}`);
    }
  }

  if (addFailed) {
    dialog.showMessageBox({
      type: "warning",
      title: "Güvenlik duvarı uyarısı",
      message: "Ağ bağlantısı için güvenlik duvarı kuralı eklenemedi.",
      detail:
        "Diğer bilgisayarların bu sunucuya bağlanabilmesi için yönetici izni gerekiyor. " +
        "DAS Case'i sağ tıklayıp 'Yönetici olarak çalıştır' ile bir kez açın ya da " +
        "Windows Güvenlik Duvarı'nda TCP 3000 ve UDP 41520 portlarına gelen bağlantıya izin verin.",
    });
  }
}

function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverJs = getStandalonePath("server.js");
    if (!fs.existsSync(serverJs)) {
      reject(new Error(`server.js bulunamadı: ${serverJs}`));
      return;
    }

    const dataPath = getDataPath();
    const dbPath = path.join(dataPath, "app.db");

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      PORT: String(PORT),
      HOSTNAME: "0.0.0.0",
      DATABASE_URL: dbPath,
      NODE_ENV: "production",
      APP_VERSION: app.getVersion(),
      ELECTRON_RUN_AS_NODE: "1",
    };

    if (!process.env.SESSION_SECRET) {
      const secretPath = path.join(dataPath, ".session-secret");
      let secret: string;
      if (fs.existsSync(secretPath)) {
        secret = fs.readFileSync(secretPath, "utf-8").trim();
      } else {
        secret = randomBytes(32).toString("hex");
        fs.writeFileSync(secretPath, secret, { mode: 0o600 });
      }
      env.SESSION_SECRET = secret;
    }

    logLine(`[NextServer] starting: ${serverJs}`);

    let settled = false;
    let lastOutput = "";

    function finish(err?: Error) {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve();
    }

    function rememberOutput(prefix: string, data: Buffer) {
      const msg = data.toString();
      lastOutput = `${lastOutput}${prefix} ${msg}`.slice(-8000);
      logLine(`${prefix} ${msg.trim()}`);
    }

    function waitForHttpReady(deadlineMs: number) {
      const startedAt = Date.now();
      const check = () => {
        if (settled) return;

        const req = http.get(`http://127.0.0.1:${PORT}/api/discovery`, (res) => {
          let body = "";
          res.setEncoding("utf-8");
          res.on("data", (chunk: string) => {
            body += chunk;
          });
          res.on("end", () => {
            try {
              const payload = JSON.parse(body) as { app?: string };
              if (res.statusCode === 200 && payload.app === "das-case") {
                logLine(`[NextServer] ready on port ${PORT}`);
                finish();
                return;
              }
            } catch {
              /* another process may be serving this port */
            }
            retry();
          });
        });

        req.on("error", retry);
        req.setTimeout(1000, () => {
          req.destroy();
          retry();
        });
      };

      const retry = () => {
        if (settled) return;
        if (Date.now() - startedAt >= deadlineMs) {
          finish(
            new Error(
              `Sunucu ${Math.round(deadlineMs / 1000)} saniye içinde hazır olmadı. Log: ${getLogPath()}\n${lastOutput}`,
            ),
          );
          return;
        }
        setTimeout(check, 500);
      };

      check();
    }

    serverProcess = spawn(process.execPath, [serverJs], {
      env,
      stdio: "pipe",
      cwd: path.dirname(serverJs),
    });

    serverProcess.stdout?.on("data", (data: Buffer) => {
      rememberOutput("[NextServer:stdout]", data);
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      rememberOutput("[NextServer:stderr]", data);
    });

    serverProcess.on("error", (err) => {
      logLine(`[NextServer] spawn error: ${err.message}`);
      finish(err);
    });
    serverProcess.on("exit", (code) => {
      if (!settled) {
        const err = new Error(
          `Sunucu hazır olmadan kapandı (kod ${code ?? "bilinmiyor"}). Log: ${getLogPath()}\n${lastOutput}`,
        );
        logLine(`[NextServer] exited before ready with code ${code ?? "unknown"}`);
        finish(err);
      } else if (code !== 0 && code !== null) {
        logLine(`[NextServer] exited with code ${code}`);
      }
      serverProcess = null;
    });

    waitForHttpReady(30_000);
  });
}

function createWindow(url: string): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "DAS Case",
    icon: getIconPath(),
    backgroundColor: "#F7F4EF",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "app-preload.js"),
    },
    show: false,
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl) => {
    logLine(`[Window] did-fail-load ${errorCode} ${errorDescription} ${validatedUrl}`);
    dialog.showErrorBox(
      "DAS Case açılamadı",
      `Sayfa yüklenemedi:\n${validatedUrl}\n\n${errorDescription}\n\nLog: ${getLogPath()}`,
    );
  });
  void mainWindow.loadURL(url);

  mainWindow.on("close", (e) => {
    e.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function getIconPath(): string {
  return getResourcePath("assets", "icon.png");
}

// ──── SERVER MODE TRAY ────
function createServerTray(): void {
  const icon = nativeImage.createFromPath(getIconPath());
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("DAS Case — Sunucu");

  const autoStartEnabled = app.getLoginItemSettings().openAtLogin;
  const config = loadConfig();

  const menu = Menu.buildFromTemplate([
    {
      label: "DAS Case'i Aç",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow(`http://localhost:${PORT}`);
        }
      },
    },
    { type: "separator" },
    {
      label: "Tarayıcıda Aç",
      click: () => shell.openExternal(`http://localhost:${PORT}`),
    },
    {
      label: "Bağlantı Bilgisi",
      click: () => {
        const addr = getLanAddress();
        const officeName = config?.officeName ?? "DAS Case";
        clipboard.writeText(addr);
        dialog.showMessageBox({
          type: "info",
          title: "Bağlantı Bilgisi",
          message: `${officeName}\n\nLAN Adresi: ${addr}\n(Panoya kopyalandı)\n\nDiğer bilgisayarlarda DAS Case'i "İstemci" modunda kurarak bu sunucuya bağlanabilirsiniz.`,
        });
      },
    },
    { type: "separator" },
    {
      label: "Yedek Al",
      click: async () => {
        try {
          const dataPath = getDataPath();
          const dbPath = path.join(dataPath, "app.db");
          const { filePath } = await dialog.showSaveDialog({
            defaultPath: `dascase-yedek-${new Date().toISOString().slice(0, 10)}.db`,
            filters: [{ name: "SQLite Database", extensions: ["db"] }],
          });
          if (filePath) {
            const backupResult = runBackup(dbPath, dataPath);
            if (backupResult) {
              fs.copyFileSync(backupResult, filePath);
              dialog.showMessageBox({
                type: "info",
                title: "Yedek alındı",
                message: `Yedek kaydedildi: ${filePath}`,
              });
            } else {
              dialog.showErrorBox("Yedek hatası", "Veritabanı bulunamadı.");
            }
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
      label: "Yönetici Şifresini Sıfırla",
      click: () => {
        const dbPath = path.join(getDataPath(), "app.db");
        void showAdminResetWizard(dbPath).then((done) => {
          if (done) {
            dialog.showMessageBox({
              type: "info",
              title: "Şifre güncellendi",
              message:
                "Yönetici şifresi güncellendi. Yeni şifreyle giriş yapabilirsiniz.",
            });
          }
        });
      },
    },
    {
      label: "Tüm Verileri Sil ve Yeniden Kur",
      click: () => {
        void resetAllData();
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

/**
 * Fabrika ayarlari: tum yerel verileri siler ve uygulamayi ilk kurulum
 * ekranina dondurur. Geri alinamaz; once otomatik yedek alinir.
 */
async function resetAllData(): Promise<void> {
  const { response } = await dialog.showMessageBox({
    type: "warning",
    buttons: ["İptal", "Tüm Verileri Sil"],
    defaultId: 0,
    cancelId: 0,
    title: "Tüm Verileri Sil",
    message: "Bütün dosya, iş ve kullanıcı verileri silinsin mi?",
    detail:
      "Bu işlem geri alınamaz. Tüm veriler silinir ve uygulama ilk kurulum ekranıyla yeniden başlar. " +
      "Silmeden önce mevcut verinin bir yedeği otomatik olarak alınır.",
  });
  if (response !== 1) return;

  const dataPath = getDataPath();
  const dbPath = path.join(dataPath, "app.db");

  try {
    runBackup(dbPath, dataPath);
  } catch (err) {
    logLine(`[Reset] yedek alinamadi: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }

  for (const suffix of ["", "-wal", "-shm"]) {
    const file = `${dbPath}${suffix}`;
    try {
      if (fs.existsSync(file)) fs.rmSync(file);
    } catch (err) {
      logLine(`[Reset] ${file} silinemedi: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  app.relaunch();
  app.exit(0);
}

// ──── CLIENT MODE TRAY ────
function createClientTray(serverUrl: string): void {
  const icon = nativeImage.createFromPath(getIconPath());
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const config = loadConfig();
  tray.setToolTip(`DAS Case — ${config?.officeName ?? "İstemci"}`);

  const autoStartEnabled = app.getLoginItemSettings().openAtLogin;

  const menu = Menu.buildFromTemplate([
    {
      label: "DAS Case'i Aç",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow(serverUrl);
        }
      },
    },
    { type: "separator" },
    {
      label: "Tarayıcıda Aç",
      click: () => shell.openExternal(serverUrl),
    },
    {
      label: `Sunucu: ${serverUrl}`,
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Sunucu Değiştir",
      click: async () => {
        mainWindow?.destroy();
        mainWindow = null;
        tray?.destroy();
        tray = null;

        if (config) {
          config.mode = "client";
          config.serverUrl = undefined;
          config.officeName = undefined;
          saveConfig(config);
        }

        const dbPath = path.join(getDataPath(), "app.db");
        try {
          const result = await showSetupWizard(dbPath);
          if (result.mode === "client" && result.serverUrl) {
            createClientTray(result.serverUrl);
            createWindow(result.serverUrl);
          }
        } catch {
          app.quit();
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

// ──── SERVER MODE BOOT ────
async function bootServer(): Promise<void> {
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

  startAutoBackup(dbPath, dataPath);

  await ensureServerFirewallRules();

  const config = loadConfig();
  const officeName = config?.officeName ?? "DAS Case";

  try {
    discoverySocket = startDiscoveryServer(officeName, PORT, app.getVersion());
  } catch (err) {
    console.error("[Discovery]", err);
  }

  createServerTray();
  createWindow(`http://localhost:${PORT}`);
  initAutoUpdater();
}

// ──── CLIENT MODE BOOT ────
async function bootClient(serverUrl: string): Promise<void> {
  createClientTray(serverUrl);
  createWindow(serverUrl);
  initAutoUpdater();
}

// ──── INITIAL SETUP (first launch) ────
async function bootFirstLaunch(): Promise<void> {
  const dataPath = getDataPath();
  const dbPath = path.join(dataPath, "app.db");
  const migrationsFolder = getResourcePath("drizzle");

  try {
    runMigrations(dbPath, migrationsFolder);
  } catch (err) {
    console.error("[Migration]", err);
  }

  let result: SetupResult;
  try {
    result = await showSetupWizard(dbPath);
  } catch {
    app.quit();
    return;
  }

  currentMode = result.mode;

  if (result.mode === "server") {
    await bootServer();
  } else if (result.serverUrl) {
    await bootClient(result.serverUrl);
  } else {
    app.quit();
  }
}

// ──── GIRIS EKRANI KURTARMA KOPRUSU ────
// Yonetici sifresini unutan kullanici icin giris ekranindan tetiklenir.
// Guvenlik: yalnizca sunucu makinesinde (DB'nin bulundugu, fiziksel erisim
// gerektiren bilgisayar) calisir; istemcilerde reddedilir.
ipcMain.handle("das-get-mode", () => currentMode);

ipcMain.handle("das-forgot-admin", async () => {
  if (currentMode !== "server") {
    return { ok: false, reason: "client" };
  }

  const { response } = await dialog.showMessageBox({
    type: "question",
    buttons: ["İptal", "Şifreyi Sıfırla", "Tüm Verileri Sil"],
    defaultId: 1,
    cancelId: 0,
    title: "Yönetici Erişimi",
    message: "Yönetici hesabına nasıl erişmek istiyorsunuz?",
    detail:
      "Şifreyi Sıfırla: Mevcut yönetici hesabına yeni bir şifre belirler. " +
      "Tüm dosya, iş ve kullanıcı verileri korunur.\n\n" +
      "Tüm Verileri Sil: Önce yedek alır, sonra her şeyi sıfırlayıp ilk " +
      "kurulum (yeni yönetici oluşturma) ekranını açar. Geri alınamaz.",
  });

  if (response === 1) {
    const dbPath = path.join(getDataPath(), "app.db");
    const done = await showAdminResetWizard(dbPath);
    return { ok: done };
  }

  if (response === 2) {
    void resetAllData();
    return { ok: true };
  }

  return { ok: false, reason: "cancel" };
});

// ──── ENTRY POINT ────
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
    initAutoUpdater();
    currentMode = getAppMode();

    if (currentMode === "server") {
      await bootServer();
    } else if (currentMode === "client") {
      const serverUrl = getServerUrl();
      await bootClient(serverUrl);
    } else {
      await bootFirstLaunch();
    }
  });

  app.on("window-all-closed", () => {
    /* Keep running in tray */
  });

  app.on("before-quit", () => {
    stopAutoBackup();

    const dataPath = getDataPath();
    const dbPath = path.join(dataPath, "app.db");
    const result = checkpointAndVerify(dbPath);
    if (!result.ok) {
      console.error("[Shutdown] DB integrity issue:", result.error);
    }

    runBackup(dbPath, dataPath);

    if (discoverySocket) {
      try {
        discoverySocket.close();
      } catch {
        /* already closed */
      }
      discoverySocket = null;
    }
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  });
}

function initAutoUpdater(): void {
  if (isDev) return;
  if (updaterInitialized) return;
  updaterInitialized = true;

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
