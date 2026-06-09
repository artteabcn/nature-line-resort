import { eq } from "drizzle-orm";
import { googleReviewsCache } from "@/db/schema";
import { getDbOrNull } from "@/lib/db/get-db";
import { routing } from "@/i18n/routing";

export interface GoogleReview {
  displayName: string;
  rating: number;
  text: string;
  relativeTime: string;
}

export interface GoogleReviewsData {
  reviews: GoogleReview[];
  placeRating?: number;
  totalRatings?: number;
}

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Restrict the requested translation language to the site's locales; anything
// else falls back to the default locale.
function normalizeLanguage(locale: string): string {
  return (routing.locales as readonly string[]).includes(locale) ? locale : routing.defaultLocale;
}

interface PlacesApiResponse {
  reviews?: Array<{
    rating?: number;
    text?: { text?: string };
    relativePublishTimeDescription?: string;
    authorAttribution?: { displayName?: string };
  }>;
  rating?: number;
  userRatingCount?: number;
}

async function fetchFromGoogle(language: string): Promise<GoogleReviewsData> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!apiKey || !placeId) return { reviews: [] };

  try {
    // `languageCode` makes Google return the review text machine-translated
    // into that language (and localizes the relative-time string too).
    const url = `https://places.googleapis.com/v1/places/${placeId}?languageCode=${encodeURIComponent(language)}`;
    const res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "reviews,rating,userRatingCount",
      },
    });
    if (!res.ok) return { reviews: [] };

    const json = (await res.json()) as PlacesApiResponse;

    const reviews: GoogleReview[] = (json.reviews ?? [])
      .filter((r) => r.rating === 5)
      .map((r) => ({
        displayName: r.authorAttribution?.displayName ?? "Guest",
        rating: r.rating ?? 5,
        text: r.text?.text ?? "",
        relativeTime: r.relativePublishTimeDescription ?? "",
      }));

    return { reviews, placeRating: json.rating, totalRatings: json.userRatingCount };
  } catch {
    return { reviews: [] };
  }
}

export async function getGoogleReviews(
  locale: string = routing.defaultLocale
): Promise<GoogleReviewsData> {
  const language = normalizeLanguage(locale);
  // Cache each language separately so a French visitor never gets the German
  // translation just because it was fetched first.
  const cacheKey = `reviews:${language}`;
  const db = await getDbOrNull();

  if (db) {
    const rows = await db
      .select()
      .from(googleReviewsCache)
      .where(eq(googleReviewsCache.cacheKey, cacheKey))
      .limit(1);

    const cached = rows[0];
    if (cached) {
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < CACHE_TTL_MS) {
        return JSON.parse(cached.data) as GoogleReviewsData;
      }
    }

    const data = await fetchFromGoogle(language);
    if (data.reviews.length > 0 || data.placeRating) {
      await db
        .insert(googleReviewsCache)
        .values({
          cacheKey,
          data: JSON.stringify(data),
          fetchedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: googleReviewsCache.cacheKey,
          set: { data: JSON.stringify(data), fetchedAt: new Date().toISOString() },
        });
    }
    return data;
  }

  return fetchFromGoogle(language);
}
