"use client";

import React, { useEffect, useRef } from "react";

interface HeroVideoProps {
  poster: string;
  label: string;
}

/**
 * Cinematic hero loop (rendered with HyperFrames from the property photos).
 *
 * The poster paints instantly; playback only starts when the visitor has not
 * asked for reduced motion and is not on a data-saver connection — otherwise
 * the still frame stays, which is the calm, intended fallback.
 */
export default function HeroVideo({ poster, label }: HeroVideoProps): React.JSX.Element {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ===
      true;
    if (reduced || saveData) return;

    video.load();
    const attempt = video.play();
    if (attempt !== undefined) attempt.catch(() => undefined); // autoplay blocked → poster stays
  }, []);

  return (
    <video
      ref={ref}
      className="absolute inset-0 h-full w-full object-cover"
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      disablePictureInPicture
    >
      <source src="/video/hero-loop-sm.mp4" type="video/mp4" media="(max-width: 767px)" />
      <source src="/video/hero-loop.webm" type="video/webm" />
      <source src="/video/hero-loop.mp4" type="video/mp4" />
    </video>
  );
}
