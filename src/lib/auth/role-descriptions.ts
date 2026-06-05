import type { UserRole } from "@/lib/types";

export const ROLE_DESCRIPTIONS: Record<
  UserRole,
  { summary: string; permissions: string[] }
> = {
  ADMIN: {
    summary: "Tam yönetim — kullanıcılar, yedek, silme ve ayarlar.",
    permissions: [
      "Tüm dosya ve işleri görür/düzenler",
      "Dosya ve iş silebilir",
      "Kullanıcı yönetimi ve yedek alma",
      "Ayarlar ve aktivite geçmişi",
    ],
  },
  LAWYER: {
    summary: "Dosya süreci ve iş takibi — silme yetkisi yok.",
    permissions: [
      "Dosya ve iş oluşturur/düzenler",
      "Süreç olayları ve aşama değiştirir",
      "Dosya silemez (arşivleme admin'de)",
    ],
  },
  SECRETARY: {
    summary: "Veri girişi ve takip — süreç düzenleme sınırlı.",
    permissions: [
      "Dosya ve iş oluşturur",
      "Not ve temel bilgi girer",
      "Dosya silemez, kullanıcı yönetemez",
    ],
  },
};
