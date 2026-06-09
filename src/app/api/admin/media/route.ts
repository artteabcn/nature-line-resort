import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { getR2OrNull } from "@/lib/r2";
import { deleteImage, getImage, upsertImage } from "@/lib/content";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// Hard cap for upload size. R2 itself can take much more, but a hotel
// photo over 15 MB is almost certainly unoptimised.
const MAX_SIZE = 15 * 1024 * 1024;

function extFromType(contentType: string): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "bin";
}

function sanitizeSlot(slot: string): string {
  // Slots are short identifiers like "hero.main" / "gallery.0" — restrict
  // to a known shape so a path-traversal attempt can't escape the prefix.
  return slot.replace(/[^a-zA-Z0-9._-]/g, "");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getAdminUser(req.headers);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const r2 = await getR2OrNull();
  if (!r2) return NextResponse.json({ error: "MEDIA binding unavailable" }, { status: 503 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const rawSlot = form.get("slot");
  const file = form.get("file");
  const alt = form.get("alt");
  const widthRaw = form.get("width");
  const heightRaw = form.get("height");

  if (typeof rawSlot !== "string" || rawSlot.length === 0) {
    return NextResponse.json({ error: "Missing slot" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 15 MB)" }, { status: 400 });
  }

  const slot = sanitizeSlot(rawSlot);
  const ext = extFromType(file.type);
  // Timestamp suffix keeps each upload at a fresh URL so browsers and CDN
  // don't serve a stale cached copy after a replace.
  const r2Key = `uploads/${slot}-${Date.now()}.${ext}`;

  const buffer = await file.arrayBuffer();
  await r2.put(r2Key, buffer, {
    httpMetadata: { contentType: file.type },
  });

  // Clean up the previous binary, if any, so R2 doesn't accumulate
  // orphaned objects every time a slot is re-uploaded.
  const previous = await getImage(slot);
  if (previous && previous.url) {
    const prevRow = await getR2KeyForSlot(slot);
    if (prevRow && prevRow !== r2Key) {
      try {
        await r2.delete(prevRow);
      } catch (err) {
        console.error("R2 delete of previous object failed:", err);
      }
    }
  }

  await upsertImage({
    slot,
    r2Key,
    alt: typeof alt === "string" ? alt : null,
    width: typeof widthRaw === "string" ? Number(widthRaw) || null : null,
    height: typeof heightRaw === "string" ? Number(heightRaw) || null : null,
    contentType: file.type,
    updatedBy: user.email,
  });

  const refreshed = await getImage(slot);
  return NextResponse.json({ ok: true, url: refreshed?.url ?? null });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const user = await getAdminUser(req.headers);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slot = new URL(req.url).searchParams.get("slot");
  if (!slot) return NextResponse.json({ error: "Missing slot" }, { status: 400 });
  const cleanSlot = sanitizeSlot(slot);

  const r2 = await getR2OrNull();
  const r2Key = await deleteImage(cleanSlot);
  if (r2Key && r2) {
    try {
      await r2.delete(r2Key);
    } catch (err) {
      console.error("R2 delete failed:", err);
    }
  }
  return NextResponse.json({ ok: true });
}

// We don't expose the raw r2Key from getImage(). Reach into the D1 row
// directly when we need to remove the previous object on replace.
async function getR2KeyForSlot(slot: string): Promise<string | null> {
  const mod = await import("@/lib/db/get-db");
  const db = await mod.getDbOrNull();
  if (!db) return null;
  const { contentImages } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const rows = await db
    .select({ r2Key: contentImages.r2Key })
    .from(contentImages)
    .where(eq(contentImages.slot, slot))
    .limit(1)
    .all();
  return rows[0]?.r2Key ?? null;
}
