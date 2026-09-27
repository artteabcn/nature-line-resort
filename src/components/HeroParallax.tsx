"use client";

import React, { useEffect, useRef } from "react";

const MAX_OFFSET_PX = 40;
const SCROLL_FACTOR = 0.15;

// Moves its children down slightly slower than the page scrolls, for a
// subtle parallax feel on the hero image. The image is pre-scaled (see
// HeroSection) so the extra travel never reveals an edge.
export default function HeroParallax({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

    let ticking = false;
    function onScroll(): void {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const offset = Math.min(window.scrollY * SCROLL_FACTOR, MAX_OFFSET_PX);
        if (el) el.style.transform = `translate3d(0, ${offset}px, 0)`;
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return (): void => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 scale-110 will-change-transform">
      {children}
    </div>
  );
}
