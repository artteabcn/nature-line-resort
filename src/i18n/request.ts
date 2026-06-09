import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import de from "../../messages/de.json";
import th from "../../messages/th.json";
import { applyOverrides, getOverridesMap } from "@/lib/content";

const allMessages = { en, fr, de, th };

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    locale = routing.defaultLocale;
  }

  const base = allMessages[locale as keyof typeof allMessages];
  // D1 overrides win over the shipped JSON. Failures (e.g. D1 unavailable in
  // local dev) silently fall back to the JSON defaults — the CMS layer never
  // breaks the public site.
  let messages = base as unknown as Record<string, unknown>;
  try {
    const overrides = await getOverridesMap(locale);
    if (overrides.length > 0) {
      messages = applyOverrides(base, overrides) as unknown as Record<string, unknown>;
    }
  } catch (err) {
    console.error("CMS override fetch failed, falling back to defaults:", err);
  }

  return {
    locale,
    messages,
  };
});
