"use client";

import React from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "de", label: "DE" },
  { code: "th", label: "ไทย" },
] as const;

interface LanguageSelectorProps {
  light?: boolean;
}

export default function LanguageSelector({
  light = false,
}: LanguageSelectorProps): React.JSX.Element {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: string): void {
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/"));
  }

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map(({ code, label }) => {
        const isActive = locale === code;
        return (
          <button
            key={code}
            onClick={() => switchLocale(code)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
              isActive
                ? "bg-brand-pink text-white"
                : light
                  ? "text-white/85 hover:text-white"
                  : "text-brand-ink-soft hover:text-brand-pink"
            )}
            aria-label={`Switch to ${code}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
