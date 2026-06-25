import React from "react";
import Image from "next/image";
import { getImageUrl } from "@/lib/content";
import { cn } from "@/lib/utils";

interface MosaicImage {
  slot: string;
  fallback: string;
  alt: string;
  className: string;
  priority?: boolean;
}

const MOSAIC_IMAGES: MosaicImage[] = [
  {
    slot: "gallery.0",
    fallback: "/images/main.jpeg",
    alt: "Pool and tropical garden at Nature Line Resort",
    className: "col-span-2 row-span-2",
    priority: true,
  },
  {
    slot: "gallery.1",
    fallback: "/images/main2.jpeg",
    alt: "Outdoor lounge by the pool",
    className: "col-span-1 row-span-1",
  },
  {
    slot: "gallery.2",
    fallback: "/images/main3.jpeg",
    alt: "Nature Line Resort garden exterior",
    className: "col-span-1 row-span-2",
  },
  {
    slot: "gallery.3",
    fallback: "/images/main4.jpeg",
    alt: "Poolside seating at Nature Line Resort",
    className: "col-span-1 row-span-1",
  },
  {
    slot: "gallery.4",
    fallback: "/images/room.jpeg",
    alt: "Bright guest room with garden access",
    className: "col-span-1 row-span-1",
  },
];

export default async function AboutGalleryMosaic(): Promise<React.JSX.Element> {
  const images = await Promise.all(
    MOSAIC_IMAGES.map(async (image) => ({
      ...image,
      src: await getImageUrl(image.slot, image.fallback),
    }))
  );

  return (
    <div className="mx-auto grid aspect-[4/3] w-full max-w-lg grid-cols-3 grid-rows-3 gap-3 lg:max-w-none">
      {images.map(({ slot, src, alt, className, priority }) => (
        <div
          key={slot}
          className={cn(
            "group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5",
            className
          )}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 1024px) 33vw, 17vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            priority={priority}
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}
