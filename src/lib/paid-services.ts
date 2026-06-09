import { eq, asc } from "drizzle-orm";
import { paidServices } from "@/db/schema";
import { getDbOrNull } from "@/lib/db/get-db";
import type { PaidService } from "@/db/schema";

export type { PaidService };

export async function listActivePaidServices(): Promise<PaidService[]> {
  const db = await getDbOrNull();
  if (!db) return [];
  return db
    .select()
    .from(paidServices)
    .where(eq(paidServices.active, true))
    .orderBy(asc(paidServices.sortOrder), asc(paidServices.id));
}

export async function listAllPaidServices(): Promise<PaidService[]> {
  const db = await getDbOrNull();
  if (!db) return [];
  return db.select().from(paidServices).orderBy(asc(paidServices.sortOrder), asc(paidServices.id));
}
