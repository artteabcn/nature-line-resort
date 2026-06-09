"use client";

import React, { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface ReviewItem {
  quote: string;
  name: string;
  sub: string;
  rating: number;
  fromGoogle: boolean;
}

interface Props {
  items: ReviewItem[];
}

function initials(name: string): string {
  return name
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Stars({ count = 5 }: { count?: number }): React.JSX.Element {
  return (
    <div className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`size-3.5 ${i < count ? "text-amber-400" : "text-gray-200"}`}
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
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" aria-label="Google">
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

function ReviewCard({ item }: { item: ReviewItem }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const isLong = item.quote.length > 150;

  return (
    <figure className="flex h-full flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <Stars count={item.rating} />
        {item.fromGoogle && <GoogleG />}
      </div>

      <blockquote
        className={`mt-3 flex-1 font-serif text-sm leading-relaxed text-gray-600 italic ${!expanded && isLong ? "line-clamp-3" : ""}`}
      >
        &ldquo;{item.quote}&rdquo;
      </blockquote>

      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-brand-teal hover:text-brand-teal-dark mt-1.5 self-start text-xs font-medium transition-colors"
        >
          {expanded ? "Read less ↑" : "Read more ↓"}
        </button>
      )}

      <figcaption className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
        <div className="bg-brand-pink-light text-brand-pink-dark flex size-8 shrink-0 items-center justify-center rounded-full font-serif text-xs font-semibold">
          {initials(item.name)}
        </div>
        <div>
          <p className="text-brand-charcoal text-xs font-semibold">{item.name}</p>
          <p className="mt-0.5 text-xs text-gray-400">{item.sub}</p>
        </div>
      </figcaption>
    </figure>
  );
}

export default function ReviewsCarousel({ items }: Props): React.JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  function scrollToIdx(i: number): void {
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    setActiveIdx(clamped);
    const track = trackRef.current;
    if (!track) return;
    const child = track.children[clamped] as HTMLElement | undefined;
    if (child) track.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
  }

  return (
    <div>
      {/* Scroll track — overflow hidden so only JS/dots control navigation */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-hidden pb-1"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="w-[85%] shrink-0 sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
            style={{ scrollSnapAlign: "start" }}
          >
            <ReviewCard item={item} />
          </div>
        ))}
      </div>

      {/* Controls — only rendered when there is more than one card */}
      {items.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            onClick={() => scrollToIdx(activeIdx - 1)}
            disabled={activeIdx === 0}
            className="text-brand-ink-soft hover:text-brand-ink flex size-8 items-center justify-center rounded-full ring-1 ring-black/10 transition-colors disabled:opacity-25"
            aria-label="Previous review"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIdx(i)}
                aria-label={`Go to review ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === activeIdx ? "bg-brand-pink h-2 w-4" : "size-2 bg-gray-300"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => scrollToIdx(activeIdx + 1)}
            disabled={activeIdx === items.length - 1}
            className="text-brand-ink-soft hover:text-brand-ink flex size-8 items-center justify-center rounded-full ring-1 ring-black/10 transition-colors disabled:opacity-25"
            aria-label="Next review"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
