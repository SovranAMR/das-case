const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "guerrillamail.com",
  "yopmail.com",
  "10minutemail.com",
]);

const PREFERRED_DOMAIN = "buro.local";

export function validateBureauEmail(email: string): {
  valid: boolean;
  message?: string;
  hint?: string;
} {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0) {
    return { valid: false, message: "Geçerli bir e-posta girin" };
  }

  const domain = normalized.slice(at + 1);
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, message: "Geçici e-posta adresleri kabul edilmez" };
  }

  if (domain !== PREFERRED_DOMAIN) {
    return {
      valid: true,
      hint: `Önerilen büro adresi: kullanici@${PREFERRED_DOMAIN}`,
    };
  }

  return { valid: true };
}
