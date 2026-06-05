import { BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { randomUUID, randomBytes } from "crypto";

/**
 * Checks whether the database already has at least one admin user.
 * Returns true if setup is needed (no admin exists).
 */
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

/**
 * Runs DB migrations using drizzle migrator.
 */
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

/**
 * Creates the admin user directly in SQLite.
 */
async function createAdmin(dbPath: string, data: SetupData): Promise<void> {
  const bcrypt = require("bcryptjs");
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
    .prepare(
      `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
    )
    .run("office_name", data.officeName);

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
    )
    .run(
      "default_reminder_offsets",
      JSON.stringify([24 * 60, 60, 15]),
    );

  sqlite.close();
}

/**
 * Shows a setup wizard window and returns the data once submitted.
 */
export function showSetupWizard(dbPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 520,
      height: 620,
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

    ipcMain.once("setup-submit", async (_event, data: SetupData) => {
      try {
        await createAdmin(dbPath, data);
        win.close();
        resolve();
      } catch (err) {
        win.webContents.send(
          "setup-error",
          err instanceof Error ? err.message : String(err),
        );
        reject(err);
      }
    });

    ipcMain.once("setup-cancel", () => {
      win.close();
      reject(new Error("Kurulum iptal edildi"));
    });

    win.on("closed", () => {
      resolve();
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
    background: #F7F4EF;
    color: #151515;
    padding: 40px 36px;
    -webkit-font-smoothing: antialiased;
  }
  .label {
    font-family: ui-monospace, monospace;
    font-size: 11px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #5c5c5c;
    margin-bottom: 8px;
  }
  h1 {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: 28px;
    line-height: 1.1;
    margin-bottom: 8px;
  }
  .subtitle {
    color: #5a5a5a;
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 28px;
  }
  .field { margin-bottom: 16px; }
  .field label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 6px;
  }
  .field input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid rgba(0,0,0,0.12);
    border-radius: 4px;
    font-size: 14px;
    background: white;
    outline: none;
    transition: border-color 0.15s;
  }
  .field input:focus {
    border-color: #151515;
  }
  .actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }
  button {
    padding: 11px 24px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    border-radius: 4px;
  }
  .btn-primary {
    background: #151515;
    color: #F7F4EF;
    flex: 1;
  }
  .btn-primary:hover { opacity: 0.9; }
  .btn-secondary {
    background: transparent;
    border: 1px solid rgba(0,0,0,0.12);
    color: #5a5a5a;
  }
  .error {
    color: #dc2626;
    font-size: 13px;
    margin-top: 8px;
    display: none;
  }
</style>
</head>
<body>
  <p class="label">İlk Kurulum</p>
  <h1>DAS Case</h1>
  <p class="subtitle">
    Büro yöneticisi hesabını oluşturun. Bu hesapla giriş yapıp
    diğer kullanıcıları ekleyebilirsiniz.
  </p>
  <form id="form">
    <div class="field">
      <label>Büro Adı *</label>
      <input id="officeName" required placeholder="ör. Yılmaz Hukuk Bürosu" />
    </div>
    <div class="field">
      <label>Yönetici Adı *</label>
      <input id="name" required placeholder="ör. Av. Mehmet Yılmaz" />
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
    <p class="error" id="error"></p>
    <div class="actions">
      <button type="submit" class="btn-primary">Kurulumu Tamamla</button>
    </div>
  </form>
  <script>
    const form = document.getElementById('form');
    const errorEl = document.getElementById('error');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const pw = document.getElementById('password').value;
      const confirm = document.getElementById('confirm').value;
      if (pw !== confirm) {
        errorEl.textContent = 'Şifreler eşleşmiyor.';
        errorEl.style.display = 'block';
        return;
      }
      errorEl.style.display = 'none';
      window.setupBridge.submit({
        email: document.getElementById('email').value,
        password: pw,
        name: document.getElementById('name').value,
        officeName: document.getElementById('officeName').value,
      });
    });

    window.setupBridge?.onError?.((msg) => {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    });
  </script>
</body>
</html>`;
}
