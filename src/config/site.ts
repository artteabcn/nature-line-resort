import { SOCIAL_LINKS } from "@/components/SocialIcons";

export const SITE_URL = "https://nature-line-resortkhanom.com";

export const SITE = {
  name: "Nature Line Resort",
  shortName: "Nature Line Resort",
  url: SITE_URL,
  defaultLocale: "en",
  locales: ["en", "fr", "de", "th"] as const,
  email: "hello@nature-line-resortkhanom.com",
  phone: {
    e164: "PLACEHOLDER_PHONE_E164",
    display: "PLACEHOLDER_PHONE_DISPLAY",
    waMe: "PLACEHOLDER_PHONE_WA",
  },
  ogImage: "/images/main.jpeg",
  address: {
    streetAddress: "Khanom",
    addressLocality: "Khanom",
    addressRegion: "Nakhon Si Thammarat",
    postalCode: "80210",
    addressCountry: "TH",
  },
  geo: {
    latitude: 9.1900,
    longitude: 99.8400,
  },
  priceRange: "฿฿",
  social: SOCIAL_LINKS,
} as const;

export type SiteLocale = (typeof SITE.locales)[number];

export function localePath(locale: string, path: string = ""): string {
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return `${SITE_URL}/${locale}${clean ? `/${clean}` : ""}`;
}

export function alternateLanguages(path: string = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of SITE.locales) {
    out[l] = localePath(l, path);
  }
  out["x-default"] = localePath(SITE.defaultLocale, path);
  return out;
}
