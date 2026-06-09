import React from "react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { getImageUrl } from "@/lib/content";

interface GalleryImage {
  slot: string;
  fallback: string;
  alt: string;
  span?: string;
}

const GALLERY_IMAGES: GalleryImage[] = [
  {
    slot: "gallery.0",
    fallback: "/images/main.jpeg",
    alt: "Pool and tropical view",
    span: "lg:col-span-2",
  },
  { slot: "gallery.1", fallback: "/images/main2.jpeg", alt: "Outdoor lounge by the pool" },
  { slot: "gallery.2", fallback: "/images/main3.jpeg", alt: "The property in its tropical garden" },
  { slot: "gallery.3", fallback: "/images/main4.jpeg", alt: "Pink poolside with seating" },
  {
    slot: "gallery.4",
    fallback: "/images/room.jpeg",
    alt: "Bright bedroom with garden access",
    span: "lg:col-span-2",
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
    <section id="gallery" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-8">
        <div className="text-center">
          <p className="section-label">{t("label")}</p>
          <h2 className="section-title mt-3">{t("title")}</h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {resolved.map(({ src, alt, span, slot }) => (
            <div
              key={slot}
              className={`relative aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-black/5 ${span ?? ""}`}
            >
              <Image
                src={src}
                alt={alt}
                fill
                className="object-cover transition-transform duration-700 hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
