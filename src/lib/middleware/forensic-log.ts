import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { requestLogs } from "@/lib/db/schema";

const MAX_BODY_LENGTH = 4096;

const SKIP_LOG_PATHS = new Set(["/api/notifications/stream"]);

export function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

function getPlatform(request: Request): string | null {
  const secPlatform = request.headers.get("sec-ch-ua-platform");
  if (secPlatform) return secPlatform.replace(/"/g, "");

  const ua = request.headers.get("user-agent") ?? "";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Linux/i.test(ua)) return "Linux";
  return null;
}

export async function logApiRequest(
  request: Request,
  userId: string | null,
  bodyText?: string,
): Promise<void> {
  const url = new URL(request.url);
  if (SKIP_LOG_PATHS.has(url.pathname)) return;

  const body = bodyText ? bodyText.slice(0, MAX_BODY_LENGTH) : null;

  try {
    await db.insert(requestLogs).values({
      id: randomUUID(),
      method: request.method,
      path: url.pathname,
      body,
      clientIp: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
      acceptLanguage: request.headers.get("accept-language"),
      userId,
      cfRay: request.headers.get("cf-ray"),
      countryCode: request.headers.get("cf-ipcountry"),
      platform: getPlatform(request),
    });
  } catch {
    // Forensic log başarısız olsa da iş isteği devam etmeli
  }
}
