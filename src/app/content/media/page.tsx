import React from "react";
import { IMAGE_SLOTS, getImage } from "@/lib/content";
import MediaSlot from "./MediaSlot";

export default async function MediaPage(): Promise<React.JSX.Element> {
  const slots = await Promise.all(
    IMAGE_SLOTS.map(async (def) => {
      const current = await getImage(def.slot);
      return {
        slot: def.slot,
        label: def.label,
        fallback: def.fallback,
        current,
      };
    })
  );

  return (
    <div>
      <h1 className="text-brand-ink font-serif text-3xl font-semibold">Media</h1>
      <p className="text-brand-ink-soft mt-2 text-sm">
        Upload JPEG, PNG or WebP. Replacing an image is live within seconds. Removing falls back to
        the shipped default.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {slots.map((s) => (
          <MediaSlot
            key={s.slot}
            slot={s.slot}
            label={s.label}
            fallback={s.fallback}
            currentUrl={s.current?.url ?? null}
            currentAlt={s.current?.alt ?? null}
          />
        ))}
      </div>
    </div>
  );
}
