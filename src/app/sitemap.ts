import type { MetadataRoute } from "next";
import { SITE, alternateLanguages, localePath } from "@/config/site";

const ROUTES: { path: string; changeFrequency: "weekly" | "monthly"; priority: number }[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "book", changeFrequency: "weekly", priority: 0.9 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.flatMap((route) =>
    SITE.locales.map((locale) => ({
      url: localePath(locale, route.path),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: { languages: alternateLanguages(route.path) },
    }))
  );
}
