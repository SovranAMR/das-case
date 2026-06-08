import { BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { saveConfig, type AppMode } from "./client-config";
import { scanForServers } from "./lan-discovery";

export function needsSetup(dbPath: string): boolean {
  if (!fs.existsSync(dbPath)) return true;
  try {
    const sqlite = new Database(dbPath, { readonly: true });
    const row = sqlite
      .prepare("SELECT COUNT(*) as c FROM users WHERE role = 'ADMIN'")
      .get() as { c: number } | undefined;
    sqlite.close();
    return !row || row.c === 0;
  } catch {
    return true;
  }
}

export function runMigrations(dbPath: string, migrationsFolder: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  const { migrate } = require("drizzle-orm/better-sqlite3/migrator");
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder });
  sqlite.close();
}

type SetupData = {
  email: string;
  password: string;
  name: string;
  officeName: string;
};

export type SetupResult = {
  mode: AppMode;
  serverUrl?: string;
  officeName?: string;
};

async function createAdmin(dbPath: string, data: SetupData): Promise<void> {
  const hash = await bcrypt.hash(data.password, 12);
  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO users (id, email, name, password_hash, role, active, must_change_password)
       VALUES (?, ?, ?, ?, 'ADMIN', 1, 0)`,
    )
    .run(id, data.email, data.name, hash);
  sqlite
    .prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`)
    .run("office_name", data.officeName);
  sqlite
    .prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`)
    .run("default_reminder_offsets", JSON.stringify([24 * 60, 60, 15]));
  sqlite.close();
}

export function showSetupWizard(dbPath: string): Promise<SetupResult> {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 560,
      height: 680,
      resizable: false,
      minimizable: false,
      maximizable: false,
      title: "DAS Case — İlk Kurulum",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "setup-preload.js"),
      },
    });
    win.setMenuBarVisibility(false);

    const html = getSetupHTML();
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    function cleanup() {
      ipcMain.removeAllListeners("setup-role");
      ipcMain.removeAllListeners("setup-server-submit");
      ipcMain.removeAllListeners("setup-client-scan");
      ipcMain.removeAllListeners("setup-client-connect");
      ipcMain.removeAllListeners("setup-cancel");
    }

    ipcMain.on("setup-role", (_event, role: string) => {
      if (role === "server") {
        win.webContents.send("show-page", "server");
      } else {
        win.webContents.send("show-page", "client-scanning");
        void scanForServers(4000).then((servers) => {
          win.webContents.send("scan-results", servers);
        });
      }
    });

    ipcMain.on("setup-client-scan", () => {
      win.webContents.send("show-page", "client-scanning");
      void scanForServers(4000).then((servers) => {
        win.webContents.send("scan-results", servers);
      });
    });

    ipcMain.on(
      "setup-client-connect",
      (_event, server: { host: string; port: number; name: string }) => {
        const serverUrl = `http://${server.host}:${server.port}`;
        const config: SetupResult = {
          mode: "client",
          serverUrl,
          officeName: server.name,
        };
        saveConfig(config);
        cleanup();
        win.close();
        resolve(config);
      },
    );

    ipcMain.on("setup-server-submit", async (_event, data: SetupData) => {
      try {
        await createAdmin(dbPath, data);
        const config: SetupResult = {
          mode: "server",
          officeName: data.officeName,
        };
        saveConfig(config);
        cleanup();
        win.close();
        resolve(config);
      } catch (err) {
        win.webContents.send(
          "setup-error",
          err instanceof Error ? err.message : String(err),
        );
      }
    });

    ipcMain.on("setup-cancel", () => {
      cleanup();
      win.close();
      reject(new Error("Kurulum iptal edildi"));
    });

    win.on("closed", () => {
      cleanup();
      resolve({ mode: "client" });
    });
  });
}

function getSetupHTML(): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Inter, system-ui, sans-serif;
    background: #F7F4EF; color: #151515;
    padding: 40px 36px;
    -webkit-font-smoothing: antialiased;
  }
  .label {
    font-family: ui-monospace, monospace;
    font-size: 11px; letter-spacing: 0.15em;
    text-transform: uppercase; color: #5c5c5c; margin-bottom: 8px;
  }
  h1 {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: 28px; line-height: 1.1; margin-bottom: 8px;
  }
  .subtitle { color: #5a5a5a; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
  .page { display: none; }
  .page.active { display: block; }

  .role-btn {
    display: block; width: 100%; text-align: left;
    padding: 20px; margin-bottom: 12px;
    border: 1px solid rgba(0,0,0,0.12); border-radius: 6px;
    background: white; cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .role-btn:hover { border-color: #151515; box-shadow: 0 0 0 1px #151515; }
  .role-btn h3 {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: 18px; margin-bottom: 4px;
  }
  .role-btn p { font-size: 13px; color: #5a5a5a; line-height: 1.4; }

  .field { margin-bottom: 14px; }
  .field label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 5px; }
  .field input {
    width: 100%; padding: 10px 12px;
    border: 1px solid rgba(0,0,0,0.12); border-radius: 4px;
    font-size: 14px; background: white; outline: none;
  }
  .field input:focus { border-color: #151515; }

  button { padding: 11px 24px; font-size: 14px; font-weight: 500; border: none; cursor: pointer; border-radius: 4px; }
  .btn-primary { background: #151515; color: #F7F4EF; }
  .btn-primary:hover { opacity: 0.9; }
  .btn-secondary { background: transparent; border: 1px solid rgba(0,0,0,0.12); color: #5a5a5a; }
  .btn-link { background: none; border: none; color: #5a5a5a; font-size: 13px; cursor: pointer; padding: 8px 0; }
  .btn-link:hover { color: #151515; }

  .actions { display: flex; gap: 12px; margin-top: 20px; }
  .error { color: #dc2626; font-size: 13px; margin-top: 8px; display: none; }

  .spinner {
    width: 32px; height: 32px; border: 3px solid rgba(0,0,0,0.1);
    border-top-color: #151515; border-radius: 50%;
    animation: spin 0.8s linear infinite; margin: 24px auto;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .server-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px; margin-bottom: 8px;
    border: 1px solid rgba(0,0,0,0.12); border-radius: 6px;
    background: white;
  }
  .server-item .info h4 { font-size: 15px; font-weight: 600; }
  .server-item .info p { font-size: 12px; color: #5a5a5a; margin-top: 2px; }

  .manual-row { display: flex; gap: 8px; margin-top: 16px; }
  .manual-row input { flex: 1; }
</style>
</head>
<body>

  <!-- PAGE: Role Selection -->
  <div id="page-role" class="page active">
    <p class="label">İlk Kurulum</p>
    <h1>DAS Case</h1>
    <p class="subtitle">Bu bilgisayarın rolünü seçin.</p>

    <button class="role-btn" onclick="selectRole('server')">
      <h3>Sunucu (Yönetici PC)</h3>
      <p>Veritabanı bu bilgisayarda durur. Diğer bilgisayarlar buraya bağlanır.</p>
    </button>

    <button class="role-btn" onclick="selectRole('client')">
      <h3>İstemci (Sekreter / Avukat PC)</h3>
      <p>Ağdaki sunucuya bağlanır. Bu bilgisayarda veri tutulmaz.</p>
    </button>
  </div>

  <!-- PAGE: Server Setup -->
  <div id="page-server" class="page">
    <p class="label">Sunucu Kurulumu</p>
    <h1>Yönetici Hesabı</h1>
    <p class="subtitle">Bu hesapla giriş yapıp diğer kullanıcıları ekleyebilirsiniz.</p>
    <form id="serverForm">
      <div class="field">
        <label>Büro Adı *</label>
        <input id="officeName" required placeholder="ör. Yılmaz Hukuk Bürosu" />
      </div>
      <div class="field">
        <label>Yönetici Adı *</label>
        <input id="adminName" required placeholder="ör. Av. Mehmet Yılmaz" />
      </div>
      <div class="field">
        <label>E-posta *</label>
        <input id="email" type="email" required placeholder="admin@buro.local" />
      </div>
      <div class="field">
        <label>Şifre * (min 8 karakter)</label>
        <input id="password" type="password" required minlength="8" />
      </div>
      <div class="field">
        <label>Şifre Tekrar *</label>
        <input id="confirm" type="password" required minlength="8" />
      </div>
      <p class="error" id="serverError"></p>
      <div class="actions">
        <button type="button" class="btn-secondary" onclick="goBack()">Geri</button>
        <button type="submit" class="btn-primary" style="flex:1">Kurulumu Tamamla</button>
      </div>
    </form>
  </div>

  <!-- PAGE: Client Scanning -->
  <div id="page-client-scanning" class="page">
    <p class="label">İstemci Kurulumu</p>
    <h1>Sunucu aranıyor...</h1>
    <p class="subtitle">Ağınızdaki DAS Case sunucusu taranıyor.</p>
    <div class="spinner"></div>
    <div style="text-align:center">
      <button class="btn-link" onclick="goBack()">Geri dön</button>
    </div>
  </div>

  <!-- PAGE: Client Results -->
  <div id="page-client-results" class="page">
    <p class="label">İstemci Kurulumu</p>
    <h1>Sunucu Seç</h1>
    <p class="subtitle" id="resultSubtitle"></p>
    <div id="serverList"></div>

    <div style="margin-top:20px; border-top:1px solid rgba(0,0,0,0.08); padding-top:16px">
      <p style="font-size:13px; color:#5a5a5a; margin-bottom:8px">Sunucu listede yoksa adresi elle girin:</p>
      <div class="manual-row">
        <input id="manualIP" placeholder="192.168.1.5" />
        <button class="btn-primary" onclick="connectManual()">Bağlan</button>
      </div>
    </div>

    <div class="actions" style="margin-top:16px">
      <button class="btn-secondary" onclick="goBack()">Geri</button>
      <button class="btn-secondary" onclick="rescan()">Tekrar Ara</button>
    </div>
  </div>

<script>
  function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + id)?.classList.add('active');
  }

  function selectRole(role) {
    window.setupBridge.selectRole(role);
  }

  function goBack() {
    showPage('role');
  }

  function rescan() {
    window.setupBridge.rescan();
  }

  function connectToServer(host, port, name) {
    window.setupBridge.connectServer({ host, port, name });
  }

  function connectManual() {
    const ip = document.getElementById('manualIP').value.trim();
    if (!ip) return;
    const port = ip.includes(':') ? parseInt(ip.split(':')[1]) : 3000;
    const host = ip.split(':')[0];
    connectToServer(host, port, 'DAS Case');
  }

  // Server form
  document.getElementById('serverForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;
    const errEl = document.getElementById('serverError');
    if (pw !== confirm) {
      errEl.textContent = 'Şifreler eşleşmiyor.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
    window.setupBridge.submitServer({
      email: document.getElementById('email').value,
      password: pw,
      name: document.getElementById('adminName').value,
      officeName: document.getElementById('officeName').value,
    });
  });

  // IPC listeners
  window.setupBridge.onShowPage((page) => showPage(page));

  window.setupBridge.onScanResults((servers) => {
    const list = document.getElementById('serverList');
    const subtitle = document.getElementById('resultSubtitle');

    if (servers.length === 0) {
      subtitle.textContent = 'Ağınızda DAS Case sunucusu bulunamadı. Adresi elle girebilirsiniz.';
      list.innerHTML = '';
    } else {
      subtitle.textContent = servers.length + ' sunucu bulundu:';
      list.innerHTML = servers.map(s =>
        '<div class="server-item">' +
          '<div class="info">' +
            '<h4>' + s.name + '</h4>' +
            '<p>' + s.host + ':' + s.port + '</p>' +
          '</div>' +
          '<button class="btn-primary" onclick="connectToServer(\\'' + s.host + '\\',' + s.port + ',\\'' + s.name.replace(/'/g, "\\\\'") + '\\')">Bağlan</button>' +
        '</div>'
      ).join('');
    }
    showPage('client-results');
  });

  window.setupBridge.onError((msg) => {
    const errEl = document.getElementById('serverError');
    errEl.textContent = msg;
    errEl.style.display = 'block';
  });
</script>

</body>
</html>`;
}

type AdminRow = { id: string; email: string; name: string };

/**
 * Yonetici sifresini sifirlama penceresi. Veri korunur; sadece secilen
 * yonetici hesabinin password_hash'i guncellenir (FK-safe).
 * Cozulen sorun: ilk kurulumda belirlenen sifre unutuldugunda giris yapilamiyor.
 */
export function showAdminResetWizard(dbPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    let admins: AdminRow[] = [];
    try {
      const sqlite = new Database(dbPath, { readonly: true });
      admins = sqlite
        .prepare(
          "SELECT id, email, name FROM users WHERE role = 'ADMIN' ORDER BY created_at ASC",
        )
        .all() as AdminRow[];
      sqlite.close();
    } catch {
      /* tablo yoksa bos liste */
    }

    if (admins.length === 0) {
      resolve(false);
      return;
    }

    const win = new BrowserWindow({
      width: 480,
      height: 460,
      resizable: false,
      minimizable: false,
      maximizable: false,
      title: "DAS Case — Yönetici Şifresi",
      backgroundColor: "#F7F4EF",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "setup-preload.js"),
      },
    });
    win.setMenuBarVisibility(false);

    win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(getResetHTML(admins))}`,
    );

    function cleanup() {
      ipcMain.removeAllListeners("reset-submit");
      ipcMain.removeAllListeners("reset-cancel");
    }

    ipcMain.on(
      "reset-submit",
      async (_event, data: { userId: string; password: string }) => {
        try {
          const hash = await bcrypt.hash(data.password, 12);
          const sqlite = new Database(dbPath);
          const result = sqlite
            .prepare(
              "UPDATE users SET password_hash = ?, must_change_password = 0, active = 1 WHERE id = ? AND role = 'ADMIN'",
            )
            .run(hash, data.userId);
          sqlite.close();
          if (result.changes === 0) {
            win.webContents.send("setup-error", "Hesap bulunamadı.");
            return;
          }
          cleanup();
          win.close();
          resolve(true);
        } catch (err) {
          win.webContents.send(
            "setup-error",
            err instanceof Error ? err.message : String(err),
          );
        }
      },
    );

    ipcMain.on("reset-cancel", () => {
      cleanup();
      win.close();
      resolve(false);
    });

    win.on("closed", () => {
      cleanup();
      resolve(false);
    });
  });
}

function getResetHTML(admins: AdminRow[]): string {
  const options = admins
    .map(
      (a) =>
        `<option value="${a.id}">${escapeHtml(a.name)} — ${escapeHtml(a.email)}</option>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Inter, system-ui, sans-serif;
    background: #F7F4EF; color: #151515;
    padding: 36px 32px;
    -webkit-font-smoothing: antialiased;
  }
  .label {
    font-family: ui-monospace, monospace;
    font-size: 11px; letter-spacing: 0.15em;
    text-transform: uppercase; color: #5c5c5c; margin-bottom: 8px;
  }
  h1 { font-family: 'Instrument Serif', Georgia, serif; font-size: 26px; margin-bottom: 8px; }
  .subtitle { color: #5a5a5a; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
  .field { margin-bottom: 14px; }
  .field label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 5px; }
  .field input, .field select {
    width: 100%; padding: 10px 12px;
    border: 1px solid rgba(0,0,0,0.12); border-radius: 4px;
    font-size: 14px; background: white; outline: none;
  }
  .field input:focus, .field select:focus { border-color: #151515; }
  button { padding: 11px 24px; font-size: 14px; font-weight: 500; border: none; cursor: pointer; border-radius: 4px; }
  .btn-primary { background: #151515; color: #F7F4EF; }
  .btn-secondary { background: transparent; border: 1px solid rgba(0,0,0,0.12); color: #5a5a5a; }
  .actions { display: flex; gap: 12px; margin-top: 20px; }
  .error { color: #dc2626; font-size: 13px; margin-top: 8px; display: none; }
</style>
</head>
<body>
  <p class="label">Yönetici Şifresi</p>
  <h1>Şifreyi Sıfırla</h1>
  <p class="subtitle">Giriş yapamadığınız yönetici hesabına yeni bir şifre belirleyin. Verileriniz korunur.</p>
  <form id="resetForm">
    <div class="field">
      <label>Yönetici Hesabı</label>
      <select id="userId" required>${options}</select>
    </div>
    <div class="field">
      <label>Yeni Şifre * (min 8 karakter)</label>
      <input id="password" type="password" required minlength="8" />
    </div>
    <div class="field">
      <label>Yeni Şifre (Tekrar) *</label>
      <input id="confirm" type="password" required minlength="8" />
    </div>
    <p class="error" id="resetError"></p>
    <div class="actions">
      <button type="button" class="btn-secondary" onclick="window.setupBridge.cancelReset()">İptal</button>
      <button type="submit" class="btn-primary" style="flex:1">Şifreyi Kaydet</button>
    </div>
  </form>
<script>
  document.getElementById('resetForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;
    const errEl = document.getElementById('resetError');
    if (pw !== confirm) {
      errEl.textContent = 'Şifreler eşleşmiyor.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
    window.setupBridge.submitReset({
      userId: document.getElementById('userId').value,
      password: pw,
    });
  });
  window.setupBridge.onError((msg) => {
    const errEl = document.getElementById('resetError');
    errEl.textContent = msg;
    errEl.style.display = 'block';
  });
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
