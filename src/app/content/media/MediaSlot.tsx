"use client";

import React, { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";

interface MediaSlotProps {
  slot: string;
  label: string;
  fallback: string;
  currentUrl: string | null;
  currentAlt: string | null;
}

interface UploadResult {
  ok: boolean;
  error?: string;
  url?: string;
}

export default function MediaSlot({
  slot,
  label,
  fallback,
  currentUrl,
  currentAlt,
}: MediaSlotProps): React.JSX.Element {
  const [displayUrl, setDisplayUrl] = useState<string>(currentUrl ?? fallback);
  const [hasOverride, setHasOverride] = useState<boolean>(currentUrl !== null);
  const [alt, setAlt] = useState<string>(currentAlt ?? "");
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFileChosen(file: File): Promise<void> {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Only image files are accepted.");
      return;
    }
    setBusy("upload");
    try {
      const { width, height } = await readImageDimensions(file);
      const form = new FormData();
      form.append("slot", slot);
      form.append("file", file);
      form.append("alt", alt);
      form.append("width", String(width));
      form.append("height", String(height));
      const res = await fetch("/api/admin/media", { method: "POST", body: form });
      const json = (await res.json()) as UploadResult;
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setDisplayUrl(json.url ?? URL.createObjectURL(file));
      setHasOverride(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete(): Promise<void> {
    if (!hasOverride) return;
    if (!window.confirm("Remove the uploaded image and revert to the default?")) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/admin/media?slot=${encodeURIComponent(slot)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setDisplayUrl(fallback);
      setHasOverride(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-brand-ink font-serif text-lg font-semibold">{label}</h3>
        <code className="text-brand-ink-soft/70 font-mono text-[10px]">{slot}</code>
      </div>

      <img
        src={displayUrl}
        alt={alt || label}
        className="bg-brand-cream mt-4 aspect-[4/3] w-full rounded-xl object-cover ring-1 ring-black/5"
      />
      {!hasOverride && (
        <p className="text-brand-ink-soft/70 mt-2 text-[11px]">
          Showing the shipped default. Upload to override.
        </p>
      )}

      <div className="mt-4 grid gap-3">
        <label className="text-brand-ink-soft block text-xs">
          Alt text
          <input
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder={label}
            className="focus:border-brand-pink mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            className="btn-pill-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {busy === "upload" ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="size-4" /> {hasOverride ? "Replace" : "Upload"}
              </>
            )}
          </button>

          {hasOverride && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {busy === "delete" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Remove
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFileChosen(file);
          }}
        />

        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = (): void => {
      const out = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    img.onerror = (): void => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions"));
    };
    img.src = url;
  });
}
