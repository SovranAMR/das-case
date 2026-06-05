import { app } from "electron";
import path from "path";
import fs from "fs";

export type AppMode = "server" | "client";

export type ClientConfig = {
  mode: AppMode;
  serverUrl?: string;
  officeName?: string;
};

function getConfigPath(): string {
  return path.join(app.getPath("userData"), "das-case-config.json");
}

export function loadConfig(): ClientConfig | null {
  const p = getConfigPath();
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as ClientConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: ClientConfig): void {
  const p = getConfigPath();
  fs.writeFileSync(p, JSON.stringify(config, null, 2), "utf-8");
}

export function getAppMode(): AppMode | null {
  const config = loadConfig();
  return config?.mode ?? null;
}

export function getServerUrl(): string {
  const config = loadConfig();
  return config?.serverUrl ?? "http://localhost:3000";
}
