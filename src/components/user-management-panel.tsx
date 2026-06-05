"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, Pencil, RefreshCw, Trash2, Upload, UserPlus } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/page-header";
import { FormLabel } from "@/components/ui/form-label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/types";
import { ROLE_DESCRIPTIONS } from "@/lib/auth/role-descriptions";
import { validateBureauEmail } from "@/lib/auth/email-policy";
import { parseBulkUsersCsv } from "@/lib/api/bulk-users";
import { generateSecurePassword } from "@/lib/utils/credentials";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  lastLoginAt: string | null;
};

type CreatedCredentials = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

const roleBadgeStyles: Record<UserRole, string> = {
  ADMIN: "bg-purple-100 text-purple-800",
  LAWYER: "bg-blue-100 text-blue-800",
  SECRETARY: "border border-border bg-bg-elevated text-text-secondary",
};

export function UserManagementPanel({ currentUserId }: { currentUserId: string }) {
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [addPassword, setAddPassword] = useState("");
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("SECRETARY");
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [bulkCsv, setBulkCsv] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkCreatedCredentials, setBulkCreatedCredentials] = useState<CreatedCredentials[]>([]);

  async function loadUsers() {
    const res = await fetch("/api/users");
    if (!res.ok) return;
    const data = (await res.json()) as { users: UserRow[] };
    setUsers(data.users);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function handleGeneratePassword(target: "add" | "edit") {
    const password = generateSecurePassword(12);
    if (target === "add") setAddPassword(password);
    else setEditPassword(password);
  }

  async function handleAddUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    const form = new FormData(event.currentTarget);

    const payload = {
      email: String(form.get("email") ?? ""),
      name: String(form.get("name") ?? ""),
      password: addPassword || String(form.get("password") ?? ""),
      role: String(form.get("role") ?? "SECRETARY") as UserRole,
    };

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Kullanıcı eklenemedi");
      return;
    }

    setCreatedCredentials({
      name: payload.name,
      email: payload.email.toLowerCase(),
      password: payload.password,
      role: payload.role,
    });
    setAddPassword("");
    event.currentTarget.reset();
    await loadUsers();
  }

  async function handleUpdateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editUser) return;
    clearMessages();

    const form = new FormData(event.currentTarget);
    const nextRole = String(form.get("role") ?? editUser.role) as UserRole;
    const payload: Record<string, string> = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      role: nextRole,
    };

    if (nextRole !== editUser.role && (nextRole === "ADMIN" || editUser.role === "ADMIN")) {
      const ok = await confirm({
        title: "Rol değişikliği onayı",
        message:
          nextRole === "ADMIN"
            ? `${editUser.name} yönetici yapılacak. Tüm dosya ve kullanıcı yönetimine erişim verilir.`
            : `${editUser.name} artık yönetici olmayacak. Devam?`,
        confirmLabel: "Rolü değiştir",
        variant: "danger",
      });
      if (!ok) return;
    }

    if (editPassword) {
      payload.password = editPassword;
    }

    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Kullanıcı güncellenemedi");
      return;
    }

    setSuccess("Kullanıcı güncellendi");
    setEditUser(null);
    setEditPassword("");
    await loadUsers();
  }

  async function handleDeactivateUser(user: UserRow) {
    const ok = await confirm({
      title: user.active ? "Kullanıcıyı pasifleştir" : "Kullanıcıyı aktifleştir",
      message: user.active
        ? `${user.name} giriş yapamayacak. Devam?`
        : `${user.name} tekrar giriş yapabilecek.`,
      confirmLabel: user.active ? "Pasifleştir" : "Aktifleştir",
      variant: user.active ? "danger" : "default",
    });
    if (!ok) return;
    clearMessages();
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    if (!res.ok) {
      setError("Durum güncellenemedi");
      return;
    }
    setSuccess(user.active ? "Kullanıcı pasifleştirildi" : "Kullanıcı aktifleştirildi");
    await loadUsers();
  }

  async function handleDeleteUser(id: string) {
    const ok = await confirm({
      title: "Kullanıcıyı sil",
      message: "Bu kullanıcıyı silmek istediğine emin misin? Bu işlem geri alınamaz.",
      confirmLabel: "Sil",
      variant: "danger",
    });
    if (!ok) return;
    clearMessages();

    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Silinemedi");
      return;
    }

    setSuccess("Kullanıcı silindi");
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  async function handleBulkImport() {
    if (!bulkCsv.trim()) return;

    const { rows, errors } = parseBulkUsersCsv(bulkCsv);
    if (errors.length > 0) {
      setError(errors.join("; "));
      return;
    }

    if (rows.some((row) => row.role === "ADMIN")) {
      const ok = await confirm({
        title: "Toplu yönetici ataması",
        message:
          "CSV içinde ADMIN rolü var. Bu kullanıcılar tüm dosya ve kullanıcı yönetimine erişir. Devam?",
        confirmLabel: "İçe aktar",
        variant: "danger",
      });
      if (!ok) return;
    }

    clearMessages();
    setBulkLoading(true);
    const res = await fetch("/api/users/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: bulkCsv }),
    });
    setBulkLoading(false);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Toplu içe aktarma başarısız");
      return;
    }

    const data = (await res.json()) as {
      created: Array<{ name: string; email: string; password: string; role: string }>;
      skipped: string[];
    };

    if (data.created.length > 0) {
      setBulkCreatedCredentials(
        data.created.map((item) => ({
          name: item.name,
          email: item.email,
          password: item.password,
          role: item.role as UserRole,
        })),
      );
      setSuccess(`${data.created.length} kullanıcı oluşturuldu — giriş bilgilerini kaydet`);
    }
    if (data.skipped.length > 0) {
      setError(`Atlanan: ${data.skipped.join("; ")}`);
    }
    setBulkCsv("");
    await loadUsers();
  }

  async function copyBulkCredentials() {
    if (bulkCreatedCredentials.length === 0) return;
    const text = bulkCreatedCredentials
      .map(
        (item) =>
          `${item.name}\nGiriş: ${item.email}\nŞifre: ${item.password}\nRol: ${ROLE_LABELS[item.role]}`,
      )
      .join("\n\n---\n\n");

    await navigator.clipboard.writeText(text);
    setSuccess("Tüm giriş bilgileri panoya kopyalandı");
  }

  async function copyCredentials() {
    if (!createdCredentials) return;
    const text = [
      `Ad: ${createdCredentials.name}`,
      `Giriş ID (e-posta): ${createdCredentials.email}`,
      `Şifre: ${createdCredentials.password}`,
      `Rol: ${ROLE_LABELS[createdCredentials.role]}`,
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setSuccess("Giriş bilgileri panoya kopyalandı");
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <SectionTitle>Yeni Kullanıcı Ekle</SectionTitle>
        </div>
        <p className="mb-4 text-sm text-muted">
          Giriş kimliği olarak e-posta kullanılır. Şifreyi sen belirle veya otomatik oluştur.
        </p>
        <form onSubmit={handleAddUser} className="grid gap-3 md:grid-cols-2">
          <div>
            <FormLabel required>Ad Soyad</FormLabel>
            <Input name="name" placeholder="Örn. Ayşe Yılmaz" required />
          </div>
          <div>
            <FormLabel required>Giriş ID (E-posta)</FormLabel>
            <Input
              name="email"
              type="email"
              placeholder="kullanici@buro.local"
              required
              onChange={(e) => {
                const check = validateBureauEmail(e.target.value);
                setEmailHint(check.hint ?? (check.valid ? null : check.message ?? null));
              }}
            />
            {emailHint && <p className="mt-1 text-xs text-muted">{emailHint}</p>}
          </div>
          <div>
            <FormLabel required>Şifre</FormLabel>
            <div className="flex gap-2">
              <Input
                name="password"
                type="text"
                placeholder="Min. 8 karakter"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleGeneratePassword("add")}
                title="Rastgele şifre oluştur"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <FormLabel required>Rol</FormLabel>
            <Select
              name="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
            <div className="mt-2 rounded-lg border border-border bg-bg-elevated p-3 text-xs text-text-secondary">
              <p className="font-medium">{ROLE_DESCRIPTIONS[selectedRole].summary}</p>
              <ul className="mt-1 list-inside list-disc">
                {ROLE_DESCRIPTIONS[selectedRole].permissions.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
          <Button type="submit" className="md:col-span-2">
            Kullanıcı Oluştur
          </Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <SectionTitle>Toplu Kullanıcı İçe Aktar</SectionTitle>
        </div>
        <p className="mb-3 text-sm text-muted">
          Her satır: <code>Ad Soyad,e-posta,ROL</code> (ör. Ayşe Yılmaz,ayse@buro.local,LAWYER)
        </p>
        <Textarea
          value={bulkCsv}
          onChange={(e) => setBulkCsv(e.target.value)}
          rows={6}
          placeholder={"Ayşe Yılmaz,ayse@buro.local,LAWYER\nMehmet Demir,mehmet@buro.local,SECRETARY"}
        />
        <Button className="mt-3" disabled={bulkLoading || !bulkCsv.trim()} onClick={() => void handleBulkImport()}>
          {bulkLoading ? "İçe aktarılıyor..." : "CSV İçe Aktar"}
        </Button>
      </Card>

      <Card>
        <SectionTitle className="mb-4">Kullanıcılar ({users.length})</SectionTitle>
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{user.name}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeStyles[user.role]}`}
                  >
                    {ROLE_LABELS[user.role]}
                  </span>
                  {user.id === currentUserId && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      Sen
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">
                  Giriş ID: <span className="font-mono text-text-primary">{user.email}</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  {user.active ? "Aktif" : "Pasif"}
                  {user.lastLoginAt &&
                    ` · Son giriş: ${new Date(user.lastLoginAt).toLocaleString("tr-TR")}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  disabled={user.id === currentUserId}
                  onClick={() => void handleDeactivateUser(user)}
                >
                  {user.active ? "Pasifleştir" : "Aktifleştir"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditUser(user);
                    setEditPassword("");
                    clearMessages();
                  }}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Düzenle
                </Button>
                <Button
                  variant="danger"
                  disabled={user.id === currentUserId}
                  onClick={() => void handleDeleteUser(user.id)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Sil
                </Button>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-sm text-muted">Henüz kullanıcı yok.</p>
          )}
        </div>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <Modal
        open={createdCredentials !== null}
        title="Kullanıcı Oluşturuldu"
        onClose={() => setCreatedCredentials(null)}
      >
        {createdCredentials && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Bu bilgileri personele ilet. Şifre bir daha gösterilmez.
            </p>
            <div className="space-y-2 rounded-lg border border-border bg-bg-elevated p-4 text-sm">
              <p>
                <span className="font-medium">Ad:</span> {createdCredentials.name}
              </p>
              <p>
                <span className="font-medium">Giriş ID:</span>{" "}
                <span className="font-mono">{createdCredentials.email}</span>
              </p>
              <p>
                <span className="font-medium">Şifre:</span>{" "}
                <span className="font-mono">{createdCredentials.password}</span>
              </p>
              <p>
                <span className="font-medium">Rol:</span> {ROLE_LABELS[createdCredentials.role]}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void copyCredentials()}>
                <Copy className="mr-2 h-4 w-4" />
                Kopyala
              </Button>
              <Button variant="secondary" onClick={() => setCreatedCredentials(null)}>
                Kapat
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={bulkCreatedCredentials.length > 0}
        title="Toplu İçe Aktarma — Giriş Bilgileri"
        onClose={() => setBulkCreatedCredentials([])}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Bu şifreler bir daha gösterilmez. Personel ile paylaşmadan önce kopyala.
          </p>
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {bulkCreatedCredentials.map((item) => (
              <div key={item.email} className="rounded-lg border border-border bg-bg-elevated p-3 text-sm">
                <p className="font-medium">{item.name}</p>
                <p>
                  Giriş: <span className="font-mono">{item.email}</span>
                </p>
                <p>
                  Şifre: <span className="font-mono">{item.password}</span>
                </p>
                <p>Rol: {ROLE_LABELS[item.role]}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void copyBulkCredentials()}>
              <Copy className="mr-2 h-4 w-4" />
              Tümünü Kopyala
            </Button>
            <Button variant="secondary" onClick={() => setBulkCreatedCredentials([])}>
              Kapat
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={editUser !== null}
        title="Kullanıcı Düzenle"
        onClose={() => {
          setEditUser(null);
          setEditPassword("");
        }}
      >
        {editUser && (
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Ad Soyad</label>
              <Input name="name" defaultValue={editUser.name} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Giriş ID (E-posta)</label>
              <Input name="email" type="email" defaultValue={editUser.email} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Rol</label>
              <Select name="role" defaultValue={editUser.role}>
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Yeni Şifre (isteğe bağlı)</label>
              <div className="flex gap-2">
                <Input
                  name="password"
                  type="text"
                  placeholder="Boş bırak = şifre değişmez"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleGeneratePassword("edit")}
                  title="Yeni şifre oluştur"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Kaydet</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditUser(null);
                  setEditPassword("");
                }}
              >
                İptal
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
