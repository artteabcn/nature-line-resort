"use client";

import React, { useState } from "react";
import { Check, Loader2, Save } from "lucide-react";

export interface SiteField {
  key: string;
  label: string;
  hint?: string;
  placeholder?: string;
}

interface SiteConfigEditorProps {
  fields: SiteField[];
  initial: Record<string, string>;
}

export default function SiteConfigEditor({
  fields,
  initial,
}: SiteConfigEditorProps): React.JSX.Element {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, initial[f.key] ?? ""]))
  );
  const [baseline, setBaseline] = useState(values);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty = fields.filter((f) => values[f.key] !== baseline[f.key]);

  function update(key: string, value: string): void {
    const iframeSrc = value.match(/src="([^"]+)"/)?.[1];
    setValues((prev) => ({ ...prev, [key]: iframeSrc ?? value }));
    setSavedAt(null);
  }

  async function save(): Promise<void> {
    if (dirty.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/content/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: dirty.map((f) => ({ key: f.key, value: values[f.key] })) }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setBaseline({ ...values });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="bg-brand-cream/85 sticky top-0 z-10 -mx-6 mb-6 flex items-center justify-between border-b border-black/5 px-6 py-3 backdrop-blur">
        <p className="text-brand-ink-soft text-sm">
          {dirty.length === 0 ? (
            savedAt ? (
              <span className="text-brand-teal inline-flex items-center gap-1.5">
                <Check className="size-3.5" /> Saved
              </span>
            ) : (
              "No changes"
            )
          ) : (
            <span>
              <strong className="text-brand-ink">{dirty.length}</strong> change
              {dirty.length === 1 ? "" : "s"} pending
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={dirty.length === 0 || saving}
          className="btn-pill-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving\u2026
            </>
          ) : (
            <>
              <Save className="size-4" /> Save changes
            </>
          )}
        </button>
      </div>

      {error && <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <div className="grid gap-6">
          {fields.map((field) => {
            const isDirty = values[field.key] !== baseline[field.key];
            return (
              <div key={field.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <label className="text-brand-ink text-sm font-medium">{field.label}</label>
                  <code className="text-brand-ink-soft/80 font-mono text-[10px]">{field.key}</code>
                </div>
                {field.hint && <p className="text-brand-ink-soft mt-0.5 text-xs">{field.hint}</p>}
                <input
                  type="text"
                  value={values[field.key] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(e) => update(field.key, e.target.value)}
                  className={`focus:border-brand-pink mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors outline-none ${
                    isDirty ? "border-brand-pink/60" : "border-black/10"
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
