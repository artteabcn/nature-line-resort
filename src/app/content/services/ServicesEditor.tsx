"use client";

import React, { useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import type { PaidService } from "@/db/schema";

interface Props {
  initialServices: PaidService[];
}

interface FormState {
  id?: number;
  name: string;
  description: string;
  price: string;
  currency: string;
  unit: string;
  sortOrder: string;
  active: boolean;
}

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    price: "",
    currency: "THB",
    unit: "",
    sortOrder: "0",
    active: true,
  };
}

function formFromService(s: PaidService): FormState {
  return {
    id: s.id,
    name: s.name,
    description: s.description ?? "",
    price: String(s.price),
    currency: s.currency,
    unit: s.unit ?? "",
    sortOrder: String(s.sortOrder),
    active: s.active,
  };
}

export default function ServicesEditor({ initialServices }: Props): React.JSX.Element {
  const [services, setServices] = useState<PaidService[]>(initialServices);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function openAdd(): void {
    setForm(emptyForm());
    setError(null);
  }

  function openEdit(s: PaidService): void {
    setForm(formFromService(s));
    setError(null);
  }

  function closeForm(): void {
    setForm(null);
    setError(null);
  }

  function patch(key: keyof FormState, value: string | boolean): void {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function submit(): Promise<void> {
    if (!form) return;
    const price = parseInt(form.price, 10);
    if (!form.name.trim() || isNaN(price) || price < 0) {
      setError("Name and a valid price are required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      id: form.id,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price,
      currency: form.currency || "THB",
      unit: form.unit.trim() || undefined,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
      active: form.active,
    };

    try {
      const res = await fetch("/api/admin/paid-services", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const { service } = (await res.json()) as { service: PaidService };
      setServices((prev) =>
        form.id
          ? prev.map((s) => (s.id === form.id ? service : s))
          : [...prev, service].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
      );
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteService(id: number): Promise<void> {
    if (!confirm("Delete this service? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/paid-services?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Delete failed. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <p className="text-brand-ink-soft text-sm">
          {services.length} service{services.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={openAdd}
          className="bg-brand-pink hover:bg-brand-pink-dark inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="size-4" /> Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-black/10 bg-white p-12 text-center">
          <p className="text-brand-ink-soft text-sm">No services yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-black/5 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left">
                <th className="text-brand-ink-soft px-6 py-3 font-medium">Name</th>
                <th className="text-brand-ink-soft px-4 py-3 font-medium">Price</th>
                <th className="text-brand-ink-soft hidden px-4 py-3 font-medium sm:table-cell">
                  Unit
                </th>
                <th className="text-brand-ink-soft hidden px-4 py-3 font-medium md:table-cell">
                  Description
                </th>
                <th className="text-brand-ink-soft px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-black/5 last:border-0 hover:bg-gray-50/50"
                >
                  <td className="text-brand-ink px-6 py-4 font-medium">{s.name}</td>
                  <td className="text-brand-ink px-4 py-4">
                    {s.price.toLocaleString()} {s.currency}
                  </td>
                  <td className="text-brand-ink-soft hidden px-4 py-4 sm:table-cell">
                    {s.unit ?? "—"}
                  </td>
                  <td className="text-brand-ink-soft hidden max-w-xs truncate px-4 py-4 md:table-cell">
                    {s.description ?? "—"}
                  </td>
                  <td className="px-4 py-4">
                    {s.active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <Check className="size-3" /> On
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Off
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-brand-ink-soft hover:text-brand-ink rounded-lg p-1.5 transition-colors"
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => deleteService(s.id)}
                        disabled={deletingId === s.id}
                        className="rounded-lg p-1.5 text-red-400 transition-colors hover:text-red-600 disabled:opacity-50"
                        aria-label="Delete"
                      >
                        {deletingId === s.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
              <h2 className="text-brand-ink font-serif text-lg font-semibold">
                {form.id ? "Edit Service" : "Add Service"}
              </h2>
              <button
                onClick={closeForm}
                className="text-brand-ink-soft hover:text-brand-ink rounded-lg p-1"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <Field label="Name *">
                <input
                  value={form.name}
                  onChange={(e) => patch("name", e.target.value)}
                  placeholder="Airport Transfer"
                  className="input"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Price *">
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => patch("price", e.target.value)}
                    placeholder="500"
                    className="input"
                  />
                </Field>
                <Field label="Currency">
                  <input
                    value={form.currency}
                    onChange={(e) => patch("currency", e.target.value)}
                    placeholder="THB"
                    className="input"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit (optional)">
                  <input
                    value={form.unit}
                    onChange={(e) => patch("unit", e.target.value)}
                    placeholder="per person"
                    className="input"
                  />
                </Field>
                <Field label="Sort order">
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => patch("sortOrder", e.target.value)}
                    className="input"
                  />
                </Field>
              </div>

              <Field label="Description (optional)">
                <textarea
                  value={form.description}
                  onChange={(e) => patch("description", e.target.value)}
                  placeholder="Comfortable car, available 24/7"
                  rows={2}
                  className="input resize-none"
                />
              </Field>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => patch("active", e.target.checked)}
                  className="accent-brand-pink size-4 rounded"
                />
                <span className="text-brand-ink text-sm">Show to guests</span>
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex justify-end gap-3 border-t border-black/5 px-6 py-4">
              <button
                onClick={closeForm}
                className="text-brand-ink-soft hover:text-brand-ink rounded-xl px-4 py-2 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="bg-brand-pink hover:bg-brand-pink-dark inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {form.id ? "Save changes" : "Add service"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input { width: 100%; border: 1px solid rgba(0,0,0,0.1); border-radius: 0.75rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; } .input:focus { border-color: #1a6b8a; box-shadow: 0 0 0 3px rgba(220,64,128,0.1); }`}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div>
      <label className="text-brand-ink mb-1 block text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}
