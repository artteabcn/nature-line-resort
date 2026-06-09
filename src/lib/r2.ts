// R2 bucket binding lookup. Returns null in local dev where the binding
// isn't available (so admin UI can boot without crashing — uploads will
// fail with a clear error rather than a stack trace).

export async function getR2OrNull(): Promise<R2Bucket | null> {
  try {
    const mod = await import("@opennextjs/cloudflare");
    const ctx = await mod.getCloudflareContext({ async: true });
    const r2 = (ctx.env as { MEDIA?: R2Bucket }).MEDIA;
    return r2 ?? null;
  } catch {
    return null;
  }
}
