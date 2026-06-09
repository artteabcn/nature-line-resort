import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin-auth";
import { getDbOrNull } from "@/lib/db/get-db";
import { paidServices } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const ServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().int().nonnegative(),
  currency: z.string().max(10).default("THB"),
  unit: z.string().max(50).optional(),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

const UpdateSchema = ServiceSchema.partial().extend({
  id: z.number().int().positive(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getAdminUser(req.headers);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDbOrNull();
  if (!db) return NextResponse.json({ services: [] });

  const services = await db
    .select()
    .from(paidServices)
    .orderBy(asc(paidServices.sortOrder), asc(paidServices.id));
  return NextResponse.json({ services });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getAdminUser(req.headers);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ServiceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const db = await getDbOrNull();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const rows = await db.insert(paidServices).values(parsed.data).returning();
  return NextResponse.json({ service: rows[0] }, { status: 201 });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const user = await getAdminUser(req.headers);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { id, ...data } = parsed.data;
  const db = await getDbOrNull();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const rows = await db
    .update(paidServices)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(paidServices.id, id))
    .returning();

  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ service: rows[0] });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const user = await getAdminUser(req.headers);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id || isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = await getDbOrNull();
  if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  await db.delete(paidServices).where(eq(paidServices.id, id));
  return NextResponse.json({ ok: true });
}
