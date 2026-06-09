"use client";

import React, { useMemo, useState } from "react";
import { Check, Loader2, Save } from "lucide-react";

export interface EditableField {
  path: string;
  label: string;
  multiline?: boolean;
}

interface FieldRow {
  path: string;
  label: string;
  multiline?: boolean;
  values: Record<string, string>;
}

interface SectionData {
  title: string;
  rows: FieldRow[];
}

interface TextEditorProps {
  sections: SectionData[];
  locales: string[];
}

const LOCALE_LABEL: Record<string, string> = { en: "EN", fr: "FR", de: "DE", th: "TH" };

export default function TextEditor({ sections, locales }: TextEditorProps): React.JSX.Element {
  // Edited holds the working copy. Anything that differs from `initial` is
  // a pending change.
  const initial = useMemo(() => buildInitial(sections, locales), [sections, locales]);
  const [edited, setEdited] = useState<Record<string, Record<string, string>>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty = computeDirty(initial, edited);
  const dirtyCount = dirty.length;

  function update(path: string, locale: string, value: string): void {
    setEdited((prev) => ({
      ...prev,
      [path]: { ...prev[path], [locale]: value },
    }));
    setSavedAt(null);
  }

  async function save(): Promise<void> {
    if (dirtyCount === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/content/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: dirty }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setSavedAt(Date.now());
      // Reflect saved state as the new baseline.
      for (const change of dirty) {
        initial[change.path] = { ...initial[change.path], [change.locale]: change.value };
      }
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
          {dirtyCount === 0 ? (
            savedAt ? (
              <span className="text-brand-teal inline-flex items-center gap-1.5">
                <Check className="size-3.5" /> Saved
              </span>
            ) : (
              "No changes"
            )
          ) : (
            <span>
              <strong className="text-brand-ink">{dirtyCount}</strong> change
              {dirtyCount === 1 ? "" : "s"} pending
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={dirtyCount === 0 || saving}
          className="btn-pill-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save className="size-4" /> Save changes
            </>
          )}
        </button>
      </div>

      {error && <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-10">
        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-black/5 bg-white p-6">
            <h2 className="text-brand-ink font-serif text-xl font-semibold">{section.title}</h2>
            <div className="mt-5 grid gap-6">
              {section.rows.map((row) => (
                <div key={row.path}>
                  <div className="flex items-baseline justify-between gap-3">
                    <label className="text-brand-ink text-sm font-medium">{row.label}</label>
                    <code className="text-brand-ink-soft/80 font-mono text-[10px]">{row.path}</code>
                  </div>
                  <div className="mt-2 grid gap-1.5">
                    {locales.map((locale) => {
                      const current = edited[row.path]?.[locale] ?? "";
                      const baseline = initial[row.path]?.[locale] ?? "";
                      const isDirty = current !== baseline;
                      return (
                        <div key={locale} className="grid grid-cols-[44px_1fr] items-start gap-2">
                          <span
                            className={`mt-2 text-[10px] font-semibold tracking-wider uppercase ${
                              isDirty ? "text-brand-pink" : "text-brand-ink-soft/70"
                            }`}
                          >
                            {LOCALE_LABEL[locale] ?? locale}
                          </span>
                          {row.multiline ? (
                            <textarea
                              rows={3}
                              value={current}
                              onChange={(e) => update(row.path, locale, e.target.value)}
                              className={`focus:border-brand-pink w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors outline-none ${
                                isDirty ? "border-brand-pink/60" : "border-black/10"
                              }`}
                            />
                          ) : (
                            <input
                              type="text"
                              value={current}
                              onChange={(e) => update(row.path, locale, e.target.value)}
                              className={`focus:border-brand-pink w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors outline-none ${
                                isDirty ? "border-brand-pink/60" : "border-black/10"
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function buildInitial(
  sections: SectionData[],
  locales: string[]
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const section of sections) {
    for (const row of section.rows) {
      out[row.path] = {};
      for (const locale of locales) {
        out[row.path][locale] = row.values[locale] ?? "";
      }
    }
  }
  return out;
}

interface Change {
  path: string;
  locale: string;
  value: string;
}

function computeDirty(
  initial: Record<string, Record<string, string>>,
  edited: Record<string, Record<string, string>>
): Change[] {
  const out: Change[] = [];
  for (const path of Object.keys(edited)) {
    for (const locale of Object.keys(edited[path] ?? {})) {
      const before = initial[path]?.[locale] ?? "";
      const after = edited[path][locale] ?? "";
      if (before !== after) out.push({ path, locale, value: after });
    }
  }
  return out;
}
