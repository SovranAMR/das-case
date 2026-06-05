"use client";

import { useEffect, useMemo, useState } from "react";
import type { CaseTemplate, EventTypeDefinition, FormField } from "@/lib/case-templates/types";
import { toDateTimeLocalValue } from "@/lib/utils/dates";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form-label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function CaseEventForm({
  template,
  onSubmit,
  onCancel,
}: {
  template: CaseTemplate;
  onSubmit: (data: {
    eventType: string;
    title: string;
    description?: string;
    occurredAt: string;
    metadata: Record<string, string>;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [eventType, setEventType] = useState(template.eventTypes[0]?.code ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const definition = useMemo(
    () => template.eventTypes.find((e) => e.code === eventType),
    [template.eventTypes, eventType],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!definition) return;
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const metadata: Record<string, string> = {};
    for (const field of definition.fields) {
      if (field.key === "description") continue;
      const value = String(form.get(field.key) ?? "").trim();
      if (value) metadata[field.key] = value;
    }

    const title =
      String(form.get("title") || "").trim() ||
      definition.defaultTitle ||
      definition.label;
    const occurredAt = String(form.get("occurredAt") || "");
    const description = String(form.get("description") || "").trim() || undefined;

    try {
      await onSubmit({ eventType, title, description, occurredAt, metadata });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <FormLabel>Olay Türü</FormLabel>
        <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
          {template.eventTypes.map((et) => (
            <option key={et.code} value={et.code}>
              {et.label}
            </option>
          ))}
        </Select>
      </div>

      {definition && (
        <>
          {!definition.defaultTitle && (
            <div>
              <FormLabel required>Başlık</FormLabel>
              <Input name="title" defaultValue={definition.defaultTitle ?? ""} required />
            </div>
          )}
          {renderFields(definition)}
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Kaydediliyor..." : "Olay Kaydet"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          İptal
        </Button>
      </div>
    </form>
  );
}

function renderFields(definition: EventTypeDefinition) {
  return definition.fields.map((field) => (
    <div key={field.key}>
      <FormLabel required={field.required}>{field.label}</FormLabel>
      <FieldInput field={field} />
    </div>
  ));
}

function FieldInput({ field }: { field: FormField }) {
  const [defaultValue, setDefaultValue] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (field.type === "datetime") {
      setDefaultValue(toDateTimeLocalValue(new Date()));
    }
  }, [field.type]);

  if (field.type === "textarea") {
    return (
      <Textarea
        name={field.key}
        placeholder={field.placeholder}
        required={field.required}
        rows={3}
      />
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <Select name={field.key} required={field.required} defaultValue="">
        <option value="" disabled>
          Seçin
        </option>
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    );
  }

  if (field.type === "datetime" && defaultValue === undefined) {
    return (
      <Input
        name={field.key}
        type="datetime-local"
        placeholder={field.placeholder}
        required={field.required}
        disabled
      />
    );
  }

  return (
    <Input
      name={field.key}
      type={field.type === "datetime" ? "datetime-local" : field.type === "date" ? "date" : "text"}
      defaultValue={defaultValue}
      placeholder={field.placeholder}
      required={field.required}
      key={defaultValue}
    />
  );
}
