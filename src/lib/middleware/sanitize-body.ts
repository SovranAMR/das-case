const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "newPassword",
  "currentPassword",
  "csv",
]);

const REDACTED = "[REDACTED]";

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key)) return REDACTED;
  if (value !== null && typeof value === "object") return redactObject(value);
  return value;
}

function redactObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item !== null && typeof item === "object" ? redactObject(item) : item,
    );
  }
  if (value === null || typeof value !== "object") return value;

  const result: Record<string, unknown> = {};
  for (const [key, fieldValue] of Object.entries(value as Record<string, unknown>)) {
    result[key] = redactValue(key, fieldValue);
  }
  return result;
}

export function sanitizeRequestBody(bodyText: string | undefined): string | null {
  if (!bodyText) return null;

  try {
    const parsed = JSON.parse(bodyText) as unknown;
    return JSON.stringify(redactObject(parsed));
  } catch {
    return bodyText;
  }
}
