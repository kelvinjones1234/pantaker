"use client";

import { useState } from "react";
import { StorageImage } from "@/components/ui/storage-image";
import { cn } from "@/lib/utils";
import type { ListingDetailImage } from "@/features/listings/queries";

export function ListingGallery({
  images,
  title,
}: {
  images: ListingDetailImage[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];

  return (
    <div className="shop-card overflow-hidden p-2.5">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[20px] bg-[var(--color-canvas-mist)]">
        <StorageImage
          src={active?.url}
          alt={active?.alt ?? title}
          fill
          sizes="(max-width: 1024px) 100vw, 760px"
          className="object-cover"
          priority
          fallback={
            <span className="flex h-full items-center justify-center px-4 text-center text-[12px] text-[var(--color-muted-gray)]">
              No photo provided
            </span>
          }
        />
        {images.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-[var(--overlay-paper-90)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink-black)] backdrop-blur-md">
            {activeIndex + 1} / {images.length}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div
          className="mt-2.5 grid grid-cols-3 gap-2"
          role="group"
          aria-label="Listing photos"
        >
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show photo ${index + 1} of ${images.length}`}
              aria-pressed={index === activeIndex}
              className={cn(
                "relative aspect-square cursor-pointer overflow-hidden rounded-[16px] bg-[var(--color-canvas-mist)] transition-opacity duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-shop-violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-pure-white)]",
                index === activeIndex
                  ? "ring-2 ring-[var(--color-shop-violet)] ring-offset-2 ring-offset-[var(--color-pure-white)]"
                  : "opacity-70",
              )}
            >
              <StorageImage
                src={image.url}
                alt=""
                fill
                sizes="(max-width: 640px) 30vw, 180px"
                className="object-cover"
                fallback={null}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
