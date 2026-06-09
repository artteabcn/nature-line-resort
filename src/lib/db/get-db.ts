import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

type Drizzled = ReturnType<typeof drizzle<typeof schema>>;

export async function getDbOrNull(): Promise<Drizzled | null> {
  try {
    const mod = await import("@opennextjs/cloudflare");
    const ctx = await mod.getCloudflareContext({ async: true });
    const db = (ctx.env as { DB?: D1Database }).DB;
    if (!db) return null;
    return drizzle(db, { schema });
  } catch {
    return null;
  }
}
