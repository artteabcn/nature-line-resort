// CMS storage layer: text overrides (D1) + image slots (R2 + D1).
//
// Reads:
//   - getOverrides(locale)  → deep-merged messages object for that locale
//   - getImage(slot)        → { url, alt, width, height } | null
//   - getAllImages()        → all slots (admin UI)
//   - listOverrides(locale) → flat list of (path, value) (admin UI)
//
// Writes (admin only, see /api/admin):
//   - upsertOverride(locale, path, value, updatedBy)
//   - deleteOverride(locale, path)
//   - upsertImage(slot, r2Key, alt, ..., updatedBy)
//   - deleteImage(slot)

import { and, eq } from "drizzle-orm";
import { contentOverrides, contentImages, siteConfig } from "@/db/schema";
import { getDbOrNull } from "@/lib/db/get-db";
import type { ContentImage, ContentOverride } from "@/db/schema";

export interface ImageInfo {
  slot: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}

function imageInfoFromRow(row: ContentImage): ImageInfo {
  return {
    slot: row.slot,
    url: `/api/media/${row.r2Key}`,
    alt: row.alt,
    width: row.width,
    height: row.height,
  };
}

// Apply a list of dot-path overrides onto a (deep-cloned) base messages tree.
// Numeric path segments create arrays, named segments create objects.
export function applyOverrides<T extends object>(
  base: T,
  overrides: ReadonlyArray<{ path: string; value: string }>
): T {
  if (overrides.length === 0) return base;
  // structuredClone preserves arrays vs objects; JSON-based clone would too,
  // but structuredClone is faster and available on Workers.
  const next = (
    typeof structuredClone === "function" ? structuredClone(base) : JSON.parse(JSON.stringify(base))
  ) as Record<string, unknown>;
  for (const { path, value } of overrides) {
    setByPath(next, path, value);
  }
  return next as T;
}

function setByPath(root: Record<string, unknown>, path: string, value: string): void {
  const keys = path.split(".");
  let cursor: Record<string, unknown> | unknown[] = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    const isArrayCursor = Array.isArray(cursor);
    const idx = isArrayCursor ? Number(key) : key;
    // Read current child
    let child: unknown;
    if (isArrayCursor) {
      child = (cursor as unknown[])[idx as number];
    } else {
      child = (cursor as Record<string, unknown>)[idx as string];
    }
    if (child == null || (typeof child !== "object" && !Array.isArray(child))) {
      child = /^\d+$/.test(nextKey) ? [] : {};
      if (isArrayCursor) {
        (cursor as unknown[])[idx as number] = child;
      } else {
        (cursor as Record<string, unknown>)[idx as string] = child;
      }
    }
    cursor = child as Record<string, unknown> | unknown[];
  }
  const lastKey = keys[keys.length - 1];
  // Whole-array / object overrides (e.g. "amenities.items", "rooms.items") are
  // stored as a JSON string; parse them so the leaf becomes a real array/object.
  // Scalar string values pass through unchanged.
  const finalValue = parseMaybeJson(value);
  if (Array.isArray(cursor)) {
    cursor[Number(lastKey)] = finalValue;
  } else {
    cursor[lastKey] = finalValue;
  }
}

function parseMaybeJson(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Not valid JSON — treat as a plain string.
    }
  }
  return value;
}

export async function listOverrides(locale: string): Promise<ContentOverride[]> {
  const db = await getDbOrNull();
  if (!db) return [];
  return db.select().from(contentOverrides).where(eq(contentOverrides.locale, locale)).all();
}

export async function getOverridesMap(
  locale: string
): Promise<Array<{ path: string; value: string }>> {
  const rows = await listOverrides(locale);
  return rows.map((r) => ({ path: r.path, value: r.value }));
}

export async function upsertOverride(
  locale: string,
  path: string,
  value: string,
  updatedBy: string | null
): Promise<void> {
  const db = await getDbOrNull();
  if (!db) throw new Error("D1 not available");
  // SQLite-flavored upsert via Drizzle.
  await db
    .insert(contentOverrides)
    .values({
      locale,
      path,
      value,
      updatedBy,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [contentOverrides.locale, contentOverrides.path],
      set: { value, updatedBy, updatedAt: new Date().toISOString() },
    });
}

export async function deleteOverride(locale: string, path: string): Promise<void> {
  const db = await getDbOrNull();
  if (!db) throw new Error("D1 not available");
  await db
    .delete(contentOverrides)
    .where(and(eq(contentOverrides.locale, locale), eq(contentOverrides.path, path)));
}

export async function getImage(slot: string): Promise<ImageInfo | null> {
  const db = await getDbOrNull();
  if (!db) return null;
  const row = await db
    .select()
    .from(contentImages)
    .where(eq(contentImages.slot, slot))
    .limit(1)
    .all();
  return row[0] ? imageInfoFromRow(row[0]) : null;
}

// Convenience: returns the image URL or the supplied fallback. This is the
// helper most pages will use to render <Image src=…> with a sane default.
export async function getImageUrl(slot: string, fallback: string): Promise<string> {
  const img = await getImage(slot);
  return img?.url ?? fallback;
}

export async function listImages(): Promise<ImageInfo[]> {
  const db = await getDbOrNull();
  if (!db) return [];
  const rows = await db.select().from(contentImages).all();
  return rows.map(imageInfoFromRow);
}

export async function upsertImage(input: {
  slot: string;
  r2Key: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  contentType: string | null;
  updatedBy: string | null;
}): Promise<void> {
  const db = await getDbOrNull();
  if (!db) throw new Error("D1 not available");
  await db
    .insert(contentImages)
    .values({
      slot: input.slot,
      r2Key: input.r2Key,
      alt: input.alt,
      width: input.width,
      height: input.height,
      contentType: input.contentType,
      updatedBy: input.updatedBy,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: contentImages.slot,
      set: {
        r2Key: input.r2Key,
        alt: input.alt,
        width: input.width,
        height: input.height,
        contentType: input.contentType,
        updatedBy: input.updatedBy,
        updatedAt: new Date().toISOString(),
      },
    });
}

export async function deleteImage(slot: string): Promise<string | null> {
  const db = await getDbOrNull();
  if (!db) throw new Error("D1 not available");
  const existing = await db
    .select()
    .from(contentImages)
    .where(eq(contentImages.slot, slot))
    .limit(1)
    .all();
  if (existing.length === 0) return null;
  await db.delete(contentImages).where(eq(contentImages.slot, slot));
  return existing[0].r2Key;
}

// Non-locale site config (social links, map embed, Place ID).
// Stored in the `site_config` D1 table, editable from /content/site.
export interface SiteConfig {
  facebookUrl: string;
  instagramUrl: string;
  mapEmbedUrl: string;
  googlePlaceId: string;
  minStay: number;
  cutoffHour: number;
}

const SITE_CONFIG_EMPTY: SiteConfig = {
  facebookUrl: "",
  instagramUrl: "",
  mapEmbedUrl: "",
  googlePlaceId: "",
  minStay: 1,
  cutoffHour: 18,
};

export async function getSiteConfig(): Promise<SiteConfig> {
  const db = await getDbOrNull();
  if (!db) return SITE_CONFIG_EMPTY;
  try {
    const rows = await db.select().from(siteConfig).all();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      facebookUrl: map["facebookUrl"] ?? "",
      instagramUrl: map["instagramUrl"] ?? "",
      mapEmbedUrl: map["mapEmbedUrl"] ?? "",
      googlePlaceId: map["googlePlaceId"] ?? "",
      minStay: parseInt(map["min_stay"] ?? "1", 10) || 1,
      cutoffHour: parseInt(map["cutoff_hour"] ?? "18", 10) || 18,
    };
  } catch {
    // Table doesn't exist yet (migration pending) — return empty defaults.
    return SITE_CONFIG_EMPTY;
  }
}

export async function setSiteConfig(
  key: string,
  value: string,
  updatedBy: string | null
): Promise<void> {
  const db = await getDbOrNull();
  if (!db) throw new Error("D1 not available");
  if (value.length === 0) {
    await db.delete(siteConfig).where(eq(siteConfig.key, key));
  } else {
    await db
      .insert(siteConfig)
      .values({ key, value, updatedBy, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: siteConfig.key,
        set: { value, updatedBy, updatedAt: new Date().toISOString() },
      });
  }
}

export async function getAllSiteConfig(): Promise<Array<{ key: string; value: string }>> {
  const db = await getDbOrNull();
  if (!db) return [];
  try {
    const rows = await db.select().from(siteConfig).all();
    return rows.map((r) => ({ key: r.key, value: r.value }));
  } catch {
    return [];
  }
}

// Image slots the site renders. The admin UI iterates this list so new
// slots show up automatically; pages read by slot via getImage()/getImageUrl().
// Fallbacks must point at images that actually exist under /public/ so the
// editor previews and the public pages both work before any override is
// uploaded. Add a new slot here and the admin UI picks it up automatically.
export const IMAGE_SLOTS: ReadonlyArray<{
  slot: string;
  label: string;
  fallback: string;
}> = [
  { slot: "logo", label: "Logo", fallback: "/logo.png" },
  { slot: "hero.main", label: "Hero (homepage)", fallback: "/images/main.jpeg" },
  { slot: "about.main", label: "About section", fallback: "/images/main3.jpeg" },
  { slot: "rooms.cosy.cover", label: "Cosy room", fallback: "/images/room.jpeg" },
  { slot: "rooms.deluxe.cover", label: "Deluxe room", fallback: "/images/room.jpeg" },
  { slot: "rooms.family.cover", label: "Family room", fallback: "/images/room.jpeg" },
  { slot: "gallery.0", label: "Gallery 1", fallback: "/images/main.jpeg" },
  { slot: "gallery.1", label: "Gallery 2", fallback: "/images/main2.jpeg" },
  { slot: "gallery.2", label: "Gallery 3", fallback: "/images/main3.jpeg" },
  { slot: "gallery.3", label: "Gallery 4", fallback: "/images/main4.jpeg" },
  { slot: "gallery.4", label: "Gallery 5", fallback: "/images/room.jpeg" },
];
