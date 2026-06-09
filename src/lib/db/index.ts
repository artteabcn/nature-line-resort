import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

export type Env = {
  DB: D1Database;
};

export function getDb(env: Env): ReturnType<typeof drizzle> {
  return drizzle(env.DB, { schema });
}
