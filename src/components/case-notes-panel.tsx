"use client";

import { useState } from "react";
import { Pin, PinOff, Pencil, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils/dates";

export type CaseNote = {
  id: string;
  content: string;
  isPinned: boolean;
  userName: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export function CaseNotesPanel({
  notes,
  currentUserId,
  isAdmin,
  onAdd,
  onUpdate,
  onDelete,
}: {
  notes: CaseNote[];
  currentUserId: string;
  isAdmin: boolean;
  onAdd: (content: string) => Promise<void>;
  onUpdate: (id: string, data: { content?: string; isPinned?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { confirm } = useConfirm();
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = notes.filter((n) =>
    search ? n.content.toLowerCase().includes(search.toLowerCase()) : true,
  );

  async function handleAdd() {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await onAdd(content.trim());
      setContent("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Notlarda ara..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Yeni not yaz..."
          rows={3}
        />
        <Button onClick={() => void handleAdd()} disabled={loading || !content.trim()}>
          Not Ekle
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">Not bulunamadı.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => {
            const canModify = isAdmin || note.createdBy === currentUserId;
            const isEditing = editingId === note.id;

            return (
              <div
                key={note.id}
                className={`rounded-lg border p-4 ${note.isPinned ? "border-amber-300 bg-amber-50" : "border-border bg-bg-surface"}`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          await onUpdate(note.id, { content: editContent });
                          setEditingId(null);
                        }}
                      >
                        Kaydet
                      </Button>
                      <Button variant="secondary" onClick={() => setEditingId(null)}>
                        İptal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                    <p className="mt-2 text-xs text-muted">
                      {note.userName} — {formatDateTime(new Date(note.updatedAt))}
                      {note.isPinned && " — Sabitli"}
                    </p>
                    {canModify && (
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() =>
                            void onUpdate(note.id, { isPinned: !note.isPinned })
                          }
                        >
                          {note.isPinned ? (
                            <PinOff className="h-4 w-4" />
                          ) : (
                            <Pin className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => {
                            setEditingId(note.id);
                            setEditContent(note.content);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-7 px-2 text-red-600"
                          onClick={async () => {
                            const ok = await confirm({
                              title: "Notu sil",
                              message: "Bu notu silmek istediğine emin misin? 5 saniye içinde geri alabilirsin.",
                              confirmLabel: "Sil",
                              variant: "danger",
                            });
                            if (ok) void onDelete(note.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
