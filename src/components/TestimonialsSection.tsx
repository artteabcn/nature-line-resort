import React from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { getGoogleReviews } from "@/lib/google-reviews";
import type { GoogleReview } from "@/lib/google-reviews";
import ReviewsCarousel from "./ReviewsCarousel";
import type { ReviewItem } from "./ReviewsCarousel";

interface TestimonialItem {
  quote: string;
  name: string;
  origin: string;
}

function Stars({ count = 5 }: { count?: number }): React.JSX.Element {
  return (
    <div className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`size-4 ${i < count ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          aria-hidden
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function GoogleG(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-label="Google">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default async function TestimonialsSection(): Promise<React.JSX.Element> {
  const t = await getTranslations("testimonials");
  const locale = await getLocale();
  const staticItems = t.raw("items") as TestimonialItem[];
  const googleData = await getGoogleReviews(locale);

  const showGoogle = googleData.reviews.length > 0;

  const googleMapsUrl = process.env.GOOGLE_PLACE_ID
    ? `https://www.google.com/maps/place/?q=place_id:${process.env.GOOGLE_PLACE_ID}`
    : undefined;

  const displayItems: ReviewItem[] = showGoogle
    ? googleData.reviews.map((r: GoogleReview) => ({
        quote: r.text,
        name: r.displayName,
        sub: r.relativeTime,
        rating: r.rating,
        fromGoogle: true,
      }))
    : staticItems.map((item) => ({
        quote: item.quote,
        name: item.name,
        sub: item.origin,
        rating: 5,
        fromGoogle: false,
      }));

  return (
    <section className="bg-brand-cream py-20">
      <div className="mx-auto max-w-7xl px-8">
        <div className="text-center">
          <p className="section-label">{t("label")}</p>
          <h2 className="section-title mt-3">{t("title")}</h2>

          {showGoogle && googleData.placeRating && (
            <div className="mt-6 flex justify-center">
              {googleMapsUrl ? (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md"
                  aria-label="Read all reviews on Google Maps"
                >
                  <GoogleG />
                  <Stars count={Math.round(googleData.placeRating)} />
                  <span className="text-brand-ink text-sm font-semibold">
                    {googleData.placeRating.toFixed(1)}
                  </span>
                  {googleData.totalRatings && (
                    <span className="text-brand-ink-soft text-sm">
                      · {googleData.totalRatings.toLocaleString()} reviews
                    </span>
                  )}
                </a>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm ring-1 ring-black/5">
                  <GoogleG />
                  <Stars count={Math.round(googleData.placeRating)} />
                  <span className="text-brand-ink text-sm font-semibold">
                    {googleData.placeRating.toFixed(1)}
                  </span>
                  {googleData.totalRatings && (
                    <span className="text-brand-ink-soft text-sm">
                      · {googleData.totalRatings.toLocaleString()} reviews
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-14">
          <ReviewsCarousel items={displayItems} />
        </div>
      </div>
    </section>
  );
}
