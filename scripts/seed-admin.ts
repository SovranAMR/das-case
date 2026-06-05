import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import * as schema from "../src/lib/db/schema";
import { DEFAULT_REMINDER_OFFSETS } from "../src/lib/types";
import { generateSecurePassword } from "../src/lib/utils/credentials";

const dbPath = process.env.DATABASE_URL ?? "./data/app.db";
const resolved = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(process.cwd(), dbPath);

const dir = path.dirname(resolved);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(resolved);
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

const email = process.env.ADMIN_EMAIL ?? "admin@buro.local";
const password = process.env.ADMIN_PASSWORD ?? generateSecurePassword(16);
const name = process.env.ADMIN_NAME ?? "Büro Yöneticisi";

async function main() {
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log("Admin zaten mevcut:", email);
    sqlite.close();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(schema.users).values({
    id: randomUUID(),
    email,
    name,
    passwordHash,
    role: "ADMIN",
    mustChangePassword: !process.env.ADMIN_PASSWORD,
  });

  await db
    .insert(schema.settings)
    .values({
      key: "default_reminder_offsets",
      value: JSON.stringify(DEFAULT_REMINDER_OFFSETS),
    })
    .onConflictDoNothing();

  console.log("Admin oluşturuldu");
  console.log("E-posta:", email);
  console.log("Şifre:", password);
  sqlite.close();
}

void main();
