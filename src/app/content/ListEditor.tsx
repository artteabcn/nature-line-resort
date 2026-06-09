"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

// Generic editor for an array of items stored in the i18n messages (e.g.
// amenities.items, rooms.items). Each item is kept as a full per-locale object
// so unmanaged keys (id, currency…) are preserved on save. SHARED fields are
// written to every locale; PER-LOCALE fields only to that locale. The whole
// array is saved per locale as a single JSON override at `path`.

export interface ListField {
  key: string;
  label: string;
  perLocale: boolean;
  type: "text" | "textarea" | "iconSelect" | "number";
  options?: readonly string[];
}

type Item = Record<string, unknown>;
interface UnifiedItem {
  byLocale: Record<string, Item>;
}

export interface ListEditorProps {
  title: string;
  description?: string;
  path: string;
  locales: string[];
  fields: ListField[];
  initial: Record<string, Item[]>;
  min: number;
  max: number;
  // Plain template for a new item (functions can't cross the server→client
  // boundary). If idKey is set, a fresh unique id is minted for that key on add.
  newItemTemplate: Item;
  idKey?: string;
}

const LOCALE_LABEL: Record<string, string> = { en: "EN", fr: "FR", de: "DE", th: "TH" };

function buildUnified(props: ListEditorProps): UnifiedItem[] {
  const { locales, initial } = props;
  const canonical = initial[locales[0]] ?? [];
  return canonical.map((_, i) => {
    const byLocale: Record<string, Item> = {};
    for (const loc of locales) {
      byLocale[loc] = { ...(initial[loc]?.[i] ?? initial[locales[0]]?.[i] ?? {}) };
    }
    return { byLocale };
  });
}

function toArray(items: UnifiedItem[], locale: string): Item[] {
  return items.map((it) => it.byLocale[locale]);
}

function coerce(value: string, type: ListField["type"]): unknown {
  if (type === "number") return value === "" ? 0 : Number(value);
  return value;
}

function asStr(v: unknown): string {
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

export default function ListEditor(props: ListEditorProps): React.JSX.Element {
  const { title, description, path, locales, fields, min, max } = props;
  const initialItems = useMemo(() => buildUnified(props), [props]);
  const [items, setItems] = useState<UnifiedItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirtyLocales = useMemo(
    () =>
      locales.filter(
        (loc) => JSON.stringify(toArray(items, loc)) !== JSON.stringify(props.initial[loc] ?? [])
      ),
    [items, locales, props.initial]
  );

  function setField(
    idx: number,
    key: string,
    type: ListField["type"],
    perLocale: boolean,
    loc: string,
    value: string
  ): void {
    const v = coerce(value, type);
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const byLocale = { ...it.byLocale };
        if (perLocale) {
          byLocale[loc] = { ...byLocale[loc], [key]: v };
        } else {
          for (const l of locales) byLocale[l] = { ...byLocale[l], [key]: v };
        }
        return { byLocale };
      })
    );
    setSavedAt(null);
  }

  function addItem(): void {
    if (items.length >= max) return;
    const base: Item = { ...props.newItemTemplate };
    if (props.idKey) {
      const stem = asStr(base[props.idKey]) || "item";
      base[props.idKey] = `${stem}-${Math.random().toString(36).slice(2, 7)}`;
    }
    const byLocale: Record<string, Item> = {};
    for (const loc of locales) byLocale[loc] = { ...base };
    setItems((prev) => [...prev, { byLocale }]);
    setSavedAt(null);
  }
  function removeItem(idx: number): void {
    if (items.length <= min) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setSavedAt(null);
  }

  async function save(): Promise<void> {
    if (dirtyLocales.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const changes = dirtyLocales.map((loc) => ({
        path,
        locale: loc,
        value: JSON.stringify(toArray(items, loc)),
      }));
      const res = await fetch("/api/admin/content/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      for (const loc of dirtyLocales)
        props.initial[loc] = toArray(items, loc).map((o) => ({ ...o }));
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const sharedFields = fields.filter((f) => !f.perLocale);
  const localeFields = fields.filter((f) => f.perLocale);
  const titleKey = localeFields.find((f) => f.type === "text")?.key ?? localeFields[0]?.key;

  return (
    <section className="mt-8">
      <div className="bg-brand-cream/85 sticky top-0 z-10 -mx-6 mb-6 flex items-center justify-between border-b border-black/5 px-6 py-3 backdrop-blur">
        <div>
          <h2 className="text-brand-ink font-serif text-xl font-semibold">{title}</h2>
          <p className="text-brand-ink-soft text-xs">
            {description ? `${description} · ` : ""}
            {items.length} item{items.length === 1 ? "" : "s"} (min {min}, max {max})
            {dirtyLocales.length > 0 && <span className="text-brand-pink"> · unsaved changes</span>}
            {dirtyLocales.length === 0 && savedAt && (
              <span className="text-brand-teal"> · saved</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={dirtyLocales.length === 0 || saving}
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

      <div className="grid gap-6">
        {items.map((item, idx) => {
          const heading =
            (titleKey && asStr(item.byLocale[locales[0]]?.[titleKey])) || `Item ${idx + 1}`;
          return (
            <div key={idx} className="rounded-2xl border border-black/5 bg-white p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-brand-ink font-serif text-lg font-semibold">{heading}</h3>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length <= min}
                  className="text-brand-ink-soft inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>

              {sharedFields.map((f) => (
                <div key={f.key} className="mb-4">
                  <label className="text-brand-ink mb-1.5 block text-sm font-medium">
                    {f.label}
                  </label>
                  {f.type === "iconSelect" ? (
                    <select
                      value={asStr(item.byLocale[locales[0]]?.[f.key])}
                      onChange={(e) =>
                        setField(idx, f.key, f.type, false, locales[0], e.target.value)
                      }
                      className="focus:border-brand-pink w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm capitalize outline-none"
                    >
                      {(f.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      value={asStr(item.byLocale[locales[0]]?.[f.key])}
                      onChange={(e) =>
                        setField(idx, f.key, f.type, false, locales[0], e.target.value)
                      }
                      className="focus:border-brand-pink w-full max-w-[200px] rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
                    />
                  )}
                </div>
              ))}

              {localeFields.map((f) => (
                <div key={f.key} className="mb-4">
                  <label className="text-brand-ink mb-1.5 block text-sm font-medium">
                    {f.label}
                  </label>
                  <div className="grid gap-1.5">
                    {locales.map((loc) => (
                      <div key={loc} className="grid grid-cols-[44px_1fr] items-start gap-2">
                        <span className="text-brand-ink-soft/70 mt-2 text-[10px] font-semibold tracking-wider uppercase">
                          {LOCALE_LABEL[loc] ?? loc}
                        </span>
                        {f.type === "textarea" ? (
                          <textarea
                            rows={2}
                            value={asStr(item.byLocale[loc]?.[f.key])}
                            onChange={(e) =>
                              setField(idx, f.key, f.type, true, loc, e.target.value)
                            }
                            className="focus:border-brand-pink w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
                          />
                        ) : (
                          <input
                            type={f.type === "number" ? "number" : "text"}
                            value={asStr(item.byLocale[loc]?.[f.key])}
                            onChange={(e) =>
                              setField(idx, f.key, f.type, true, loc, e.target.value)
                            }
                            className="focus:border-brand-pink w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addItem}
        disabled={items.length >= max}
        className="text-brand-pink mt-6 inline-flex items-center gap-2 rounded-xl border border-dashed border-black/15 px-4 py-2.5 text-sm font-medium hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="size-4" /> Add {items.length >= max ? `(max ${max})` : "item"}
      </button>
    </section>
  );
}
