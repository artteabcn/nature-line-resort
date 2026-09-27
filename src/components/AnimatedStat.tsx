"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedStatProps {
  value: string; // e.g. "10+", "100%", "4"
  className?: string;
  durationMs?: number;
}

// Counts up to the target number the first time it scrolls into view.
// Values without a leading number (or prefers-reduced-motion) render as-is.
export default function AnimatedStat({
  value,
  className,
  durationMs = 1400,
}: AnimatedStatProps): React.JSX.Element {
  const ref = useRef<HTMLParagraphElement>(null);
  const started = useRef(false);
  const match = value.match(/^(\d+)(.*)$/);
  const [display, setDisplay] = useState(match ? `0${match[2]}` : value);

  useEffect(() => {
    const el = ref.current;
    if (!el || !match) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const target = parseInt(match[1], 10);
    const suffix = match[2];

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        const start = performance.now();

        function tick(now: number): void {
          const progress = Math.min((now - start) / durationMs, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(`${Math.round(target * eased)}${suffix}`);
          if (progress < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
        observer.disconnect();
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return (): void => observer.disconnect();
  }, [value, durationMs]);

  return (
    <p ref={ref} className={cn("tabular-nums", className)}>
      {display}
    </p>
  );
}
