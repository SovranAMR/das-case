#!/usr/bin/env node

/**
 * Electron build prep: standalone output + better-sqlite3 native module fix
 *
 * 1. `next build` (output: standalone)
 * 2. Copy static + public into standalone
 * 3. Rebuild better-sqlite3 for Electron's Node ABI
 * 4. Copy hashed .node file into standalone/node_modules
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

console.log("=== DAS Case Electron Build Prep ===\n");

// 1. Next.js build
run("npm run build");

const standalone = path.join(ROOT, ".next", "standalone");
if (!fs.existsSync(standalone)) {
  console.error("ERROR: .next/standalone not found. Is output: 'standalone' set?");
  process.exit(1);
}

// 2. Copy static + public
const staticSrc = path.join(ROOT, ".next", "static");
const staticDest = path.join(standalone, ".next", "static");
console.log("\nCopying .next/static ...");
copyDir(staticSrc, staticDest);

const publicSrc = path.join(ROOT, "public");
const publicDest = path.join(standalone, "public");
if (fs.existsSync(publicSrc)) {
  console.log("Copying public/ ...");
  copyDir(publicSrc, publicDest);
}

// 3. Rebuild better-sqlite3 for Electron
const electronVersion = JSON.parse(
  fs.readFileSync(path.join(ROOT, "node_modules", "electron", "package.json"), "utf-8"),
).version;

console.log(`\nInstalling better-sqlite3 prebuilt for Electron v${electronVersion} ...`);
run(
  `npx prebuild-install -r electron -t ${electronVersion} --tag-prefix v`,
  { cwd: path.join(ROOT, "node_modules", "better-sqlite3") },
);

// 4. Copy native addon into standalone
const betterSqlite3Path = path.join(ROOT, "node_modules", "better-sqlite3");
const standaloneBS3 = path.join(standalone, "node_modules", "better-sqlite3");

if (fs.existsSync(betterSqlite3Path)) {
  console.log("\nCopying better-sqlite3 native module ...");
  copyDir(betterSqlite3Path, standaloneBS3);
}

// 5. Copy drizzle migrations
const drizzleSrc = path.join(ROOT, "drizzle");
const drizzleDest = path.join(standalone, "drizzle");
console.log("\nCopying drizzle migrations ...");
copyDir(drizzleSrc, drizzleDest);

// 6. Copy assets (icons for tray/window)
const assetsSrc = path.join(ROOT, "assets");
const assetsDest = path.join(standalone, "assets");
console.log("\nCopying assets/ ...");
copyDir(assetsSrc, assetsDest);

// 7. Copy migration script
const migrateSrc = path.join(ROOT, "scripts", "migrate.ts");
const migrateDest = path.join(standalone, "scripts", "migrate.ts");
fs.mkdirSync(path.join(standalone, "scripts"), { recursive: true });
if (fs.existsSync(migrateSrc)) {
  fs.copyFileSync(migrateSrc, migrateDest);
}

console.log("\n=== Prep complete ===");
console.log(`Standalone: ${standalone}`);
