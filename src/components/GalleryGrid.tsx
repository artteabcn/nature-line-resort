import React from "react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { getImageUrl } from "@/lib/content";
import { cn } from "@/lib/utils";

interface GalleryImage {
  slot: string;
  fallback: string;
  alt: string;
  cell: string;
}

// Bento: one large tile + four even tiles, no empty cells at any breakpoint.
const GALLERY_IMAGES: GalleryImage[] = [
  {
    slot: "gallery.0",
    fallback: "/images/main.jpeg",
    alt: "Aerial view of Nature Line Resort among the palms",
    cell: "col-span-2 row-span-2 aspect-square md:aspect-auto",
  },
  {
    slot: "gallery.1",
    fallback: "/images/main2.jpeg",
    alt: "Shaded lounge beside the pool",
    cell: "aspect-[4/3] md:aspect-auto",
  },
  {
    slot: "gallery.2",
    fallback: "/images/main3.jpeg",
    alt: "The villa in its tropical garden",
    cell: "aspect-[4/3] md:aspect-auto",
  },
  {
    slot: "gallery.3",
    fallback: "/images/main4.jpeg",
    alt: "Raspberry-walled pool terrace",
    cell: "aspect-[4/3] md:aspect-auto",
  },
  {
    slot: "gallery.4",
    fallback: "/images/room.jpeg",
    alt: "Bright guest room opening onto the garden",
    cell: "aspect-[4/3] md:aspect-auto",
  },
];

export default async function GalleryGrid(): Promise<React.JSX.Element> {
  const t = await getTranslations("gallery");
  const resolved = await Promise.all(
    GALLERY_IMAGES.map(async (img) => ({
      ...img,
      src: await getImageUrl(img.slot, img.fallback),
    }))
  );

  return (
    <section id="gallery" className="bg-brand-cream py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="reveal-up max-w-2xl">
          <p className="section-label">{t("label")}</p>
          <h2 className="section-title mt-5">{t("title")}</h2>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-3 md:h-[min(78vh,720px)] md:grid-cols-4 md:grid-rows-2 md:gap-4">
          {resolved.map(({ src, alt, cell, slot }) => (
            <figure
              key={slot}
              className={cn("reveal-clip relative overflow-hidden rounded-[1.25rem]", cell)}
            >
              <Image
                src={src}
                alt={alt}
                fill
                className="parallax-media object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
                unoptimized
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
